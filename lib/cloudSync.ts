import type Browser from 'webextension-polyfill';
import { defaultBookmarks, defaultCategories } from '../data/bookmarks';
import type {
  AppSettings,
  CloudSyncStatus,
  CloudSyncUser,
  NavigationSyncSnapshot,
} from '../types';
import {
  getExtensionLocalStorage,
  getStorageErrorMessage,
  getStoredValue,
  setBrowserSyncEnabled,
  setStoredNavigationData,
  setStoredValue,
} from './storage';
import { validateNavigationSnapshotIconSizes } from './iconValidation';

const CLOUD_SESSION_KEY = 'cloudSyncSession';
const CLOUD_SYNC_PATH = 'cloud-sync';
const DEFAULT_AUTO_SYNC_INTERVAL_MINUTES = 60;
const API_BASE = (process.env.NEXT_PUBLIC_CLOUD_SYNC_API_BASE ?? '').replace(/\/$/, '');

type BrowserApi = typeof Browser;

interface CloudSyncSession {
  accessToken: string;
  expiresAt: string;
  user: CloudSyncUser;
  revision?: number;
}

interface SnapshotResponse {
  snapshot: NavigationSyncSnapshot | null;
  revision?: number;
  updatedAt?: string;
}

const isBrowser = () => typeof window !== 'undefined';

const getBrowserApi = async (): Promise<BrowserApi | null> => {
  if (!isBrowser()) return null;

  try {
    const webExtension = await import('webextension-polyfill');
    return webExtension.default;
  } catch {
    return null;
  }
};

const isApiConfigured = () => API_BASE.length > 0;

const readLocalSession = (): CloudSyncSession | undefined => {
  if (!isBrowser()) return undefined;

  const value = window.localStorage.getItem(CLOUD_SESSION_KEY);
  if (!value) return undefined;

  try {
    return JSON.parse(value) as CloudSyncSession;
  } catch {
    window.localStorage.removeItem(CLOUD_SESSION_KEY);
    return undefined;
  }
};

const writeLocalSession = (session: CloudSyncSession) => {
  if (!isBrowser()) return;

  window.localStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(session));
};

const removeLocalSession = () => {
  if (!isBrowser()) return;

  window.localStorage.removeItem(CLOUD_SESSION_KEY);
};

const getSession = async (): Promise<CloudSyncSession | undefined> => {
  const localStorageArea = await getExtensionLocalStorage();

  if (!localStorageArea) {
    return readLocalSession();
  }

  const result = await localStorageArea.get(CLOUD_SESSION_KEY);
  return result[CLOUD_SESSION_KEY] as CloudSyncSession | undefined;
};

const setSession = async (session: CloudSyncSession) => {
  const localStorageArea = await getExtensionLocalStorage();

  if (!localStorageArea) {
    writeLocalSession(session);
    return;
  }

  await localStorageArea.set({ [CLOUD_SESSION_KEY]: session });
};

const clearSession = async () => {
  const localStorageArea = await getExtensionLocalStorage();

  if (!localStorageArea) {
    removeLocalSession();
    return;
  }

  await localStorageArea.remove(CLOUD_SESSION_KEY);
};

const createRandomState = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const parseAuthResult = (url: string) => {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

  parsedUrl.searchParams.forEach((value, key) => {
    if (!params.has(key)) {
      params.set(key, value);
    }
  });

  const accessToken = params.get('access_token');
  const state = params.get('state');
  const userId = params.get('user_id');
  const username = params.get('username');
  const avatarUrl = params.get('avatar_url') ?? undefined;
  const expiresAt = params.get('expires_at');
  const revisionValue = params.get('revision');
  const revision = revisionValue ? Number(revisionValue) : undefined;

  if (!accessToken || !state || !userId || !username || !expiresAt) {
    throw new Error('GitHub 登录返回信息不完整，请重试。');
  }

  return {
    accessToken,
    state,
    expiresAt,
    revision: Number.isFinite(revision) ? revision : undefined,
    user: {
      id: userId,
      provider: 'github' as const,
      username,
      avatarUrl,
    },
  };
};

const updateCloudSettings = async (settings: Partial<AppSettings>) => {
  const currentSettings = await getStoredValue('settings');
  const nextSettings = {
    ...currentSettings,
    ...settings,
  };

  Object.keys(nextSettings).forEach((key) => {
    if (nextSettings[key as keyof AppSettings] === undefined) {
      delete nextSettings[key as keyof AppSettings];
    }
  });

  await setStoredValue('settings', nextSettings);
};

const recordCloudError = async (error: unknown) => {
  const message = getStorageErrorMessage(error);
  await updateCloudSettings({
    lastCloudSyncError: message,
  });
  return message;
};

const recordCloudSuccess = async (
  session: CloudSyncSession,
  revision?: number,
  options: {
    snapshotHash?: string;
    reason?: AppSettings['lastCloudSyncReason'];
  } = {},
) => {
  await updateCloudSettings({
    cloudSyncEnabled: true,
    cloudUser: session.user,
    cloudRevision: revision ?? session.revision,
    lastCloudSyncedAt: new Date().toISOString(),
    lastCloudSyncError: undefined,
    pendingCloudUpload: options.snapshotHash ? false : undefined,
    lastCloudSnapshotHash: options.snapshotHash,
    lastCloudSyncReason: options.reason,
  });
};

const fetchCloudApi = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  if (!isApiConfigured()) {
    throw new Error('云同步 API 未配置，请设置 NEXT_PUBLIC_CLOUD_SYNC_API_BASE。');
  }

  const session = await getSession();
  if (!session) {
    throw new Error('请先登录 GitHub 后再使用云同步。');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof body === 'object' && body && 'error' in body
      ? String(body.error)
      : `云同步请求失败：${response.status}`;
    throw new Error(message);
  }

  return body as T;
};

export const getCloudSyncApiBase = () => API_BASE;

export const CLOUD_SYNC_INTERVAL_OPTIONS = [15, 30, 60, 180, 360, 720] as const;

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
  }

  return JSON.stringify(value);
};

export const computeNavigationSnapshotHash = async (snapshot: NavigationSyncSnapshot) => {
  const hashSource = stableStringify({
    schemaVersion: snapshot.schemaVersion,
    bookmarks: snapshot.bookmarks,
    categories: snapshot.categories,
    categoryIconUrls: snapshot.categoryIconUrls,
    theme: snapshot.theme,
  });
  const encoded = new TextEncoder().encode(hashSource);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const notifyCloudScheduleChanged = async () => {
  const browserApi = await getBrowserApi();

  try {
    await browserApi?.runtime?.sendMessage?.({ type: 'cloudSyncScheduleChanged' });
  } catch {
    // The background service worker is only available in the installed extension.
  }
};

export const markCloudSyncDirty = async () => {
  const [session, settings] = await Promise.all([
    getSession(),
    getStoredValue('settings'),
  ]);

  if (!session && !settings?.cloudSyncEnabled) return;

  await updateCloudSettings({
    pendingCloudUpload: true,
    lastLocalChangedAt: new Date().toISOString(),
  });
};

export const updateCloudSyncSchedule = async (settingsPatch: Partial<AppSettings>) => {
  await updateCloudSettings(settingsPatch);
  await notifyCloudScheduleChanged();
};

export const clearCloudSyncSchedule = async () => {
  await notifyCloudScheduleChanged();
};

export const loginWithGithub = async (): Promise<CloudSyncSession> => {
  if (!isApiConfigured()) {
    throw new Error('云同步 API 未配置，请先设置 NEXT_PUBLIC_CLOUD_SYNC_API_BASE 并重新构建扩展。');
  }

  const browserApi = await getBrowserApi();
  if (!browserApi?.identity) {
    throw new Error('当前环境不支持浏览器 identity 登录，请在已安装的扩展中使用云同步。');
  }

  const state = createRandomState();
  const redirectUri = browserApi.identity.getRedirectURL(CLOUD_SYNC_PATH);
  const authUrl = new URL(`${API_BASE}/auth/github/start`);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  const resultUrl = await browserApi.identity.launchWebAuthFlow({
    url: authUrl.toString() as Browser.Manifest.HttpURL,
    interactive: true,
  });
  const authResult = parseAuthResult(resultUrl);

  if (authResult.state !== state) {
    throw new Error('登录状态校验失败，请重新登录。');
  }

  const session: CloudSyncSession = {
    accessToken: authResult.accessToken,
    expiresAt: authResult.expiresAt,
    revision: authResult.revision,
    user: authResult.user,
  };

  await setSession(session);
  await setBrowserSyncEnabled(false);
  await updateCloudSettings({
    cloudDailySyncEnabled: true,
    cloudIntervalSyncEnabled: false,
    cloudAutoSyncIntervalMinutes: DEFAULT_AUTO_SYNC_INTERVAL_MINUTES,
  });
  await recordCloudSuccess(session, session.revision);
  await notifyCloudScheduleChanged();
  return session;
};

export const logoutCloudSync = async () => {
  try {
    await fetchCloudApi<{ ok: boolean }>('/api/logout', { method: 'POST' });
  } catch {
    // Local logout should still complete even if the remote session is already invalid.
  }

  await clearSession();
  await updateCloudSettings({
    cloudSyncEnabled: false,
    cloudUser: undefined,
    cloudRevision: undefined,
    lastCloudSyncedAt: undefined,
    lastCloudSyncError: undefined,
  });
  await clearCloudSyncSchedule();
};

export const getCloudSyncStatus = async (): Promise<CloudSyncStatus> => {
  const [session, settings] = await Promise.all([
    getSession(),
    getStoredValue('settings'),
  ]);

  return {
    enabled: Boolean(session || settings?.cloudSyncEnabled),
    authenticated: Boolean(session),
    user: session?.user ?? settings?.cloudUser,
    lastSyncedAt: settings?.lastCloudSyncedAt,
    lastError: settings?.lastCloudSyncError,
    revision: session?.revision ?? settings?.cloudRevision,
    dailySyncEnabled: settings?.cloudDailySyncEnabled ?? true,
    intervalSyncEnabled: settings?.cloudIntervalSyncEnabled ?? false,
    autoSyncIntervalMinutes: settings?.cloudAutoSyncIntervalMinutes ?? DEFAULT_AUTO_SYNC_INTERVAL_MINUTES,
    pendingUpload: settings?.pendingCloudUpload ?? false,
    lastLocalChangedAt: settings?.lastLocalChangedAt,
    lastCheckedAt: settings?.lastCloudCheckedAt,
    lastSyncReason: settings?.lastCloudSyncReason,
  };
};

export const pushCloudSnapshot = async (
  snapshot: NavigationSyncSnapshot,
  reason: AppSettings['lastCloudSyncReason'] = 'manual',
) => {
  try {
    const iconSizeError = validateNavigationSnapshotIconSizes(snapshot);
    if (iconSizeError) {
      throw new Error(iconSizeError);
    }

    const snapshotHash = await computeNavigationSnapshotHash(snapshot);
    const result = await fetchCloudApi<{ revision: number; updatedAt: string }>('/api/snapshot', {
      method: 'PUT',
      body: JSON.stringify({ snapshot }),
    });
    const session = await getSession();

    if (session) {
      const nextSession = {
        ...session,
        revision: result.revision,
      };
      await setSession(nextSession);
      await recordCloudSuccess(nextSession, result.revision, {
        snapshotHash,
        reason,
      });
    }

    return result;
  } catch (error) {
    await recordCloudError(error);
    throw error;
  }
};

export const pullCloudSnapshot = async () => {
  try {
    const result = await fetchCloudApi<SnapshotResponse>('/api/snapshot');
    const session = await getSession();

    if (session) {
      const nextSession = {
        ...session,
        revision: result.revision,
      };
      await setSession(nextSession);
      await recordCloudSuccess(nextSession, result.revision);
    }

    return result.snapshot;
  } catch (error) {
    await recordCloudError(error);
    throw error;
  }
};

export const buildCurrentNavigationSnapshot = async (): Promise<NavigationSyncSnapshot> => ({
  schemaVersion: 1,
  bookmarks: await getStoredValue('bookmarks') ?? defaultBookmarks,
  categories: await getStoredValue('categories') ?? defaultCategories,
  categoryIconUrls: await getStoredValue('categoryIconUrls') ?? {},
  theme: await getStoredValue('theme'),
  updatedAt: new Date().toISOString(),
});

export const pushCurrentSnapshotIfChanged = async (
  reason: Extract<AppSettings['lastCloudSyncReason'], 'daily' | 'interval'>,
) => {
  const [snapshot, settings] = await Promise.all([
    buildCurrentNavigationSnapshot(),
    getStoredValue('settings'),
  ]);
  const snapshotHash = await computeNavigationSnapshotHash(snapshot);

  await updateCloudSettings({
    lastCloudCheckedAt: new Date().toISOString(),
  });

  if (snapshotHash === settings?.lastCloudSnapshotHash) {
    await updateCloudSettings({
      pendingCloudUpload: false,
      lastCloudSyncError: undefined,
    });
    return { uploaded: false, reason };
  }

  await pushCloudSnapshot(snapshot, reason);
  return { uploaded: true, reason };
};

export const syncCurrentNavigationData = async (direction: 'pull' | 'push') => {
  if (direction === 'push') {
    return pushCloudSnapshot(await buildCurrentNavigationSnapshot(), 'manual');
  }

  const snapshot = await pullCloudSnapshot();
  if (!snapshot) {
    return null;
  }

  await setStoredNavigationData(
    snapshot.bookmarks,
    snapshot.categories,
    snapshot.categoryIconUrls,
    { markCloudDirty: false },
  );

  if (snapshot.theme) {
    await setStoredValue('theme', snapshot.theme, { markCloudDirty: false });
  }

  await updateCloudSettings({
    pendingCloudUpload: false,
    lastCloudSnapshotHash: await computeNavigationSnapshotHash(snapshot),
    lastCloudSyncReason: 'manual',
    lastCloudSyncError: undefined,
  });

  return snapshot;
};

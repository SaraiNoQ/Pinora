const STORAGE_KEYS = {
  bookmarks: 'bookmarks',
  categories: 'categories',
  categoryIconUrls: 'categoryIconUrls',
  theme: 'theme',
  settings: 'settings',
};

const CLOUD_SESSION_KEY = 'cloudSyncSession';
const DAILY_ALARM_NAME = 'cloud-sync-daily';
const INTERVAL_ALARM_NAME = 'cloud-sync-interval';
const DEFAULT_INTERVAL_MINUTES = 60;

const getApiBase = () => {
  const manifest = chrome.runtime.getManifest();
  const hostPermission = manifest.host_permissions?.find((permission) => (
    permission.startsWith('https://') && permission.endsWith('/*')
  ));

  return hostPermission ? hostPermission.replace(/\/\*$/, '') : '';
};

const storageGet = (area, keys) => new Promise((resolve, reject) => {
  area.get(keys, (result) => {
    const error = chrome.runtime.lastError;
    if (error) {
      reject(new Error(error.message));
      return;
    }
    resolve(result);
  });
});

const storageSet = (area, values) => new Promise((resolve, reject) => {
  area.set(values, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      reject(new Error(error.message));
      return;
    }
    resolve();
  });
});

const clearAlarm = (name) => new Promise((resolve) => {
  chrome.alarms.clear(name, () => resolve());
});

const readSettingsFromAreas = async () => {
  const [syncResult, localResult] = await Promise.all([
    storageGet(chrome.storage.sync, STORAGE_KEYS.settings),
    storageGet(chrome.storage.local, STORAGE_KEYS.settings),
  ]);

  return {
    syncSettings: syncResult[STORAGE_KEYS.settings],
    localSettings: localResult[STORAGE_KEYS.settings],
  };
};

const getBrowserSyncEnabled = async () => {
  const { syncSettings, localSettings } = await readSettingsFromAreas();
  return localSettings?.browserSyncEnabled ?? syncSettings?.browserSyncEnabled ?? true;
};

const getActiveStorageArea = async () => {
  const browserSyncEnabled = await getBrowserSyncEnabled();
  return browserSyncEnabled ? chrome.storage.sync : chrome.storage.local;
};

const readActiveValue = async (key) => {
  const area = await getActiveStorageArea();
  const result = await storageGet(area, STORAGE_KEYS[key]);
  return result[STORAGE_KEYS[key]];
};

const updateActiveSettings = async (patch) => {
  const area = await getActiveStorageArea();
  const result = await storageGet(area, STORAGE_KEYS.settings);
  const nextSettings = {
    ...result[STORAGE_KEYS.settings],
    ...patch,
  };

  Object.keys(nextSettings).forEach((key) => {
    if (nextSettings[key] === undefined) {
      delete nextSettings[key];
    }
  });

  await storageSet(area, {
    [STORAGE_KEYS.settings]: nextSettings,
  });
};

const getSession = async () => {
  const result = await storageGet(chrome.storage.local, CLOUD_SESSION_KEY);
  return result[CLOUD_SESSION_KEY];
};

const getNextLocalMidnight = () => {
  const nextMidnight = new Date();
  nextMidnight.setHours(24, 0, 0, 0);
  return nextMidnight.getTime();
};

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(',')}}`;
  }

  return JSON.stringify(value);
};

const computeSnapshotHash = async (snapshot) => {
  const source = stableStringify({
    schemaVersion: snapshot.schemaVersion,
    bookmarks: snapshot.bookmarks,
    categories: snapshot.categories,
    categoryIconUrls: snapshot.categoryIconUrls,
    theme: snapshot.theme,
  });
  const encoded = new TextEncoder().encode(source);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

const buildSnapshot = async () => ({
  schemaVersion: 1,
  bookmarks: await readActiveValue('bookmarks') ?? [],
  categories: await readActiveValue('categories') ?? [],
  categoryIconUrls: await readActiveValue('categoryIconUrls') ?? {},
  theme: await readActiveValue('theme'),
  updatedAt: new Date().toISOString(),
});

const configureCloudSyncAlarms = async () => {
  const [session, settings] = await Promise.all([
    getSession(),
    readActiveValue('settings'),
  ]);
  const cloudEnabled = Boolean(session && settings?.cloudSyncEnabled);
  const dailyEnabled = settings?.cloudDailySyncEnabled ?? true;
  const intervalEnabled = settings?.cloudIntervalSyncEnabled ?? false;
  const intervalMinutes = settings?.cloudAutoSyncIntervalMinutes ?? DEFAULT_INTERVAL_MINUTES;

  await clearAlarm(DAILY_ALARM_NAME);
  await clearAlarm(INTERVAL_ALARM_NAME);

  if (!cloudEnabled) return;

  if (dailyEnabled) {
    chrome.alarms.create(DAILY_ALARM_NAME, {
      when: getNextLocalMidnight(),
      periodInMinutes: 24 * 60,
    });
  }

  if (intervalEnabled) {
    chrome.alarms.create(INTERVAL_ALARM_NAME, {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes,
    });
  }
};

const pushSnapshotIfChanged = async (reason) => {
  const apiBase = getApiBase();
  const session = await getSession();
  const settings = await readActiveValue('settings');

  await updateActiveSettings({
    lastCloudCheckedAt: new Date().toISOString(),
  });

  if (!apiBase || !session || !settings?.cloudSyncEnabled) return;

  const snapshot = await buildSnapshot();
  const snapshotHash = await computeSnapshotHash(snapshot);

  if (snapshotHash === settings.lastCloudSnapshotHash) {
    await updateActiveSettings({
      pendingCloudUpload: false,
      lastCloudSyncError: undefined,
    });
    return;
  }

  const response = await fetch(`${apiBase}/api/snapshot`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ snapshot }),
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error ?? `云同步请求失败：${response.status}`;
    await updateActiveSettings({
      lastCloudSyncError: message,
    });
    return;
  }

  await storageSet(chrome.storage.local, {
    [CLOUD_SESSION_KEY]: {
      ...session,
      revision: body.revision,
    },
  });
  await updateActiveSettings({
    cloudRevision: body.revision,
    lastCloudSyncedAt: new Date().toISOString(),
    lastCloudSyncError: undefined,
    pendingCloudUpload: false,
    lastCloudSnapshotHash: snapshotHash,
    lastCloudSyncReason: reason,
  });
};

chrome.runtime.onInstalled.addListener(() => {
  configureCloudSyncAlarms().catch(console.error);
});

chrome.runtime.onStartup.addListener(() => {
  configureCloudSyncAlarms().catch(console.error);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'cloudSyncScheduleChanged') {
    configureCloudSyncAlarms().catch(console.error);
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if ((areaName === 'sync' || areaName === 'local') && changes[STORAGE_KEYS.settings]) {
    configureCloudSyncAlarms().catch(console.error);
  }
  if (areaName === 'local' && changes[CLOUD_SESSION_KEY]) {
    configureCloudSyncAlarms().catch(console.error);
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === DAILY_ALARM_NAME) {
    pushSnapshotIfChanged('daily').catch(console.error);
  }
  if (alarm.name === INTERVAL_ALARM_NAME) {
    pushSnapshotIfChanged('interval').catch(console.error);
  }
});

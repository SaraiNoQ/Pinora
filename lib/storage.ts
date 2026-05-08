import type { ActiveLocalBackend, AppSettings, Bookmark, CategoryIconUrls, StorageStatus } from '../types';
import type Browser from 'webextension-polyfill';

export type ThemeName = 'light' | 'dark';

const STORAGE_KEYS = {
  bookmarks: 'bookmarks',
  categories: 'categories',
  categoryIconUrls: 'categoryIconUrls',
  theme: 'theme',
  settings: 'settings',
} as const;

type StorageKey = keyof typeof STORAGE_KEYS;
type StorageValues = {
  bookmarks: Bookmark[];
  categories: string[];
  categoryIconUrls: CategoryIconUrls;
  theme: ThemeName;
  settings: AppSettings;
};

type ExtensionStorageArea = Pick<Browser.Storage.StorageArea, 'get' | 'set' | 'remove'>;
type StoredWriteOptions = {
  markCloudDirty?: boolean;
};
type ExtensionGlobals = typeof globalThis & {
  browser?: {
    storage?: {
      sync?: ExtensionStorageArea;
      local?: ExtensionStorageArea;
    };
  };
  chrome?: {
    storage?: {
      sync?: unknown;
      local?: unknown;
    };
  };
};

let extensionSyncStoragePromise: Promise<ExtensionStorageArea | null> | null = null;
let extensionLocalStoragePromise: Promise<ExtensionStorageArea | null> | null = null;

const isBrowser = () => typeof window !== 'undefined';

const hasExtensionSyncStorage = () => {
  if (!isBrowser()) return false;

  const globals = globalThis as ExtensionGlobals;
  return Boolean(globals.browser?.storage?.sync || globals.chrome?.storage?.sync);
};

const hasExtensionLocalStorage = () => {
  if (!isBrowser()) return false;

  const globals = globalThis as ExtensionGlobals;
  return Boolean(globals.browser?.storage?.local || globals.chrome?.storage?.local);
};

const getExtensionSyncStorage = async (): Promise<ExtensionStorageArea | null> => {
  if (!hasExtensionSyncStorage()) return null;

  if (!extensionSyncStoragePromise) {
    extensionSyncStoragePromise = import('webextension-polyfill')
      .then((module) => module.default.storage.sync)
      .catch(() => {
        const globals = globalThis as ExtensionGlobals;
        return globals.browser?.storage?.sync ?? null;
      });
  }

  return extensionSyncStoragePromise;
};

export const getExtensionLocalStorage = async (): Promise<ExtensionStorageArea | null> => {
  if (!hasExtensionLocalStorage()) return null;

  if (!extensionLocalStoragePromise) {
    extensionLocalStoragePromise = import('webextension-polyfill')
      .then((module) => module.default.storage.local)
      .catch(() => {
        const globals = globalThis as ExtensionGlobals;
        return globals.browser?.storage?.local ?? null;
      });
  }

  return extensionLocalStoragePromise;
};

const readWindowLocalValue = <K extends StorageKey>(key: K): StorageValues[K] | undefined => {
  if (!isBrowser()) return undefined;

  const value = window.localStorage.getItem(STORAGE_KEYS[key]);
  if (!value) return undefined;

  try {
    return JSON.parse(value) as StorageValues[K];
  } catch {
    window.localStorage.removeItem(STORAGE_KEYS[key]);
    return undefined;
  }
};

const writeWindowLocalValue = <K extends StorageKey>(key: K, value: StorageValues[K]) => {
  if (!isBrowser()) return;

  window.localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
};

const removeWindowLocalValues = () => {
  if (!isBrowser()) return;

  Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
};

const readExtensionValue = async <K extends StorageKey>(
  storage: ExtensionStorageArea | null,
  key: K,
): Promise<StorageValues[K] | undefined> => {
  if (!storage) return undefined;

  const result = await storage.get(STORAGE_KEYS[key]);
  return result[STORAGE_KEYS[key]] as StorageValues[K] | undefined;
};

const writeExtensionValue = async <K extends StorageKey>(
  storage: ExtensionStorageArea | null,
  key: K,
  value: StorageValues[K],
) => {
  if (!storage) return;

  await storage.set({ [STORAGE_KEYS[key]]: value });
};

const getAllSettings = async () => {
  const [syncStorage, localStorageArea] = await Promise.all([
    getExtensionSyncStorage(),
    getExtensionLocalStorage(),
  ]);

  const [syncSettings, localSettings] = await Promise.all([
    readExtensionValue(syncStorage, 'settings'),
    readExtensionValue(localStorageArea, 'settings'),
  ]);

  return { syncSettings, localSettings };
};

const getBrowserSyncEnabled = async () => {
  const { syncSettings, localSettings } = await getAllSettings();
  return localSettings?.browserSyncEnabled ?? syncSettings?.browserSyncEnabled ?? true;
};

const getActiveLocalBackend = async (): Promise<ActiveLocalBackend> => {
  const [syncStorage, localStorageArea, browserSyncEnabled] = await Promise.all([
    getExtensionSyncStorage(),
    getExtensionLocalStorage(),
    getBrowserSyncEnabled(),
  ]);

  if (!syncStorage && !localStorageArea) return 'local-storage';
  if (!browserSyncEnabled && localStorageArea) return 'extension-local';
  if (syncStorage) return 'extension-sync';
  return 'extension-local';
};

const getStorageForBackend = async (backend: ActiveLocalBackend) => {
  if (backend === 'extension-sync') return getExtensionSyncStorage();
  if (backend === 'extension-local') return getExtensionLocalStorage();
  return null;
};

const readValueFromBackend = async <K extends StorageKey>(
  backend: ActiveLocalBackend,
  key: K,
): Promise<StorageValues[K] | undefined> => {
  if (backend === 'local-storage') {
    return readWindowLocalValue(key);
  }

  return readExtensionValue(await getStorageForBackend(backend), key);
};

const writeValueToBackend = async <K extends StorageKey>(
  backend: ActiveLocalBackend,
  key: K,
  value: StorageValues[K],
) => {
  if (backend === 'local-storage') {
    writeWindowLocalValue(key, value);
    return;
  }

  await writeExtensionValue(await getStorageForBackend(backend), key, value);
};

const areStoredValuesEqual = (first: unknown, second: unknown) => (
  JSON.stringify(first) === JSON.stringify(second)
);

const markCloudDirtyAfterWrite = async () => {
  if (!isBrowser()) return;

  try {
    const { markCloudSyncDirty } = await import('./cloudSync');
    await markCloudSyncDirty();
  } catch {
    // Cloud sync metadata is optional and must never block local/browser storage writes.
  }
};

const updateStorageSettings = async (settings: AppSettings) => {
  const backend = await getActiveLocalBackend();
  const currentSettings = await readValueFromBackend(backend, 'settings');
  const nextSettings = {
    ...currentSettings,
    ...settings,
  };

  Object.keys(nextSettings).forEach((key) => {
    if (nextSettings[key as keyof AppSettings] === undefined) {
      delete nextSettings[key as keyof AppSettings];
    }
  });

  await writeValueToBackend(backend, 'settings', nextSettings);
};

const recordStorageSuccess = async (settings?: AppSettings) => {
  try {
    await updateStorageSettings({
      ...settings,
      lastSyncedAt: new Date().toISOString(),
      lastStorageError: undefined,
    });
  } catch {
    // Metadata is helpful in the settings page, but should not block data writes.
  }
};

const recordStorageError = async (error: unknown) => {
  try {
    await updateStorageSettings({
      lastStorageError: getStorageErrorMessage(error),
    });
  } catch {
    // Avoid masking the original storage error.
  }
};

export const getStoredValue = async <K extends StorageKey>(
  key: K,
): Promise<StorageValues[K] | undefined> => {
  return readValueFromBackend(await getActiveLocalBackend(), key);
};

export const setStoredValue = async <K extends StorageKey>(
  key: K,
  value: StorageValues[K],
  options: StoredWriteOptions = {},
) => {
  try {
    const backend = await getActiveLocalBackend();
    const previousValue = await readValueFromBackend(backend, key);
    const hasChanged = !areStoredValuesEqual(previousValue, value);

    await writeValueToBackend(backend, key, value);
    if (key !== 'settings') {
      await recordStorageSuccess(key === 'theme' ? { theme: value as ThemeName } : undefined);
      if (hasChanged && options.markCloudDirty !== false) {
        await markCloudDirtyAfterWrite();
      }
    }
  } catch (error) {
    await recordStorageError(error);
    throw error;
  }
};

export const setStoredNavigationData = async (
  bookmarks: Bookmark[],
  categories: string[],
  categoryIconUrls: CategoryIconUrls = {},
  options: StoredWriteOptions = {},
) => {
  try {
    const backend = await getActiveLocalBackend();
    const [previousBookmarks, previousCategories, previousCategoryIconUrls] = await Promise.all([
      readValueFromBackend(backend, 'bookmarks'),
      readValueFromBackend(backend, 'categories'),
      readValueFromBackend(backend, 'categoryIconUrls'),
    ]);
    const hasChanged = (
      !areStoredValuesEqual(previousBookmarks, bookmarks) ||
      !areStoredValuesEqual(previousCategories, categories) ||
      !areStoredValuesEqual(previousCategoryIconUrls, categoryIconUrls)
    );

    await writeValueToBackend(backend, 'bookmarks', bookmarks);
    await writeValueToBackend(backend, 'categories', categories);
    await writeValueToBackend(backend, 'categoryIconUrls', categoryIconUrls);
    await recordStorageSuccess();
    if (hasChanged && options.markCloudDirty !== false) {
      await markCloudDirtyAfterWrite();
    }
  } catch (error) {
    await recordStorageError(error);
    throw error;
  }
};

export const setBrowserSyncEnabled = async (enabled: boolean) => {
  const currentBackend = await getActiveLocalBackend();
  const targetBackend: ActiveLocalBackend = enabled
    ? (await getExtensionSyncStorage() ? 'extension-sync' : 'local-storage')
    : (await getExtensionLocalStorage() ? 'extension-local' : 'local-storage');

  const [bookmarks, categories, categoryIconUrls, theme, settings] = await Promise.all([
    readValueFromBackend(currentBackend, 'bookmarks'),
    readValueFromBackend(currentBackend, 'categories'),
    readValueFromBackend(currentBackend, 'categoryIconUrls'),
    readValueFromBackend(currentBackend, 'theme'),
    readValueFromBackend(currentBackend, 'settings'),
  ]);
  const nextSettings = {
    ...settings,
    browserSyncEnabled: enabled,
    lastSyncedAt: new Date().toISOString(),
    lastStorageError: undefined,
  };

  if (bookmarks) await writeValueToBackend(targetBackend, 'bookmarks', bookmarks);
  if (categories) await writeValueToBackend(targetBackend, 'categories', categories);
  if (categoryIconUrls) await writeValueToBackend(targetBackend, 'categoryIconUrls', categoryIconUrls);
  if (theme) await writeValueToBackend(targetBackend, 'theme', theme);
  await writeValueToBackend(targetBackend, 'settings', nextSettings);

  const localStorageArea = await getExtensionLocalStorage();
  if (localStorageArea) {
    const localSettings = await readExtensionValue(localStorageArea, 'settings');
    await writeExtensionValue(localStorageArea, 'settings', {
      ...localSettings,
      browserSyncEnabled: enabled,
    });
  } else if (targetBackend !== 'local-storage') {
    writeWindowLocalValue('settings', {
      ...readWindowLocalValue('settings'),
      browserSyncEnabled: enabled,
    });
  }

  if (!enabled) {
    await recordStorageSuccess();
  }
};

export const clearStoredNavigationData = async () => {
  const backend = await getActiveLocalBackend();

  if (backend === 'local-storage') {
    removeWindowLocalValues();
    return;
  }

  const storage = await getStorageForBackend(backend);
  await storage?.remove(Object.values(STORAGE_KEYS));
};

export const getStorageStatus = async (): Promise<StorageStatus> => {
  const [backend, browserSyncEnabled] = await Promise.all([
    getActiveLocalBackend(),
    getBrowserSyncEnabled(),
  ]);
  const settings = await readValueFromBackend(backend, 'settings');

  return {
    backend: settings?.cloudSyncEnabled ? 'cloud-sync' : backend,
    activeLocalBackend: backend,
    browserSyncEnabled,
    isExtensionEnvironment: hasExtensionSyncStorage() || hasExtensionLocalStorage(),
    lastSyncedAt: settings?.lastSyncedAt,
    lastStorageError: settings?.lastStorageError,
  };
};

export const getSystemTheme = (): ThemeName => {
  if (!isBrowser()) return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const isStorageQuotaError = (error: unknown) => {
  if (!(error instanceof Error) || !error.message) return false;

  const message = error.message.toLowerCase();
  return (
    error.name === 'QuotaExceededError' ||
    message.includes('quota') ||
    message.includes('storage.sync')
  );
};

export const getStorageErrorMessage = (error: unknown) => {
  if (isStorageQuotaError(error)) {
    return '同步存储空间不足，通常是图标 URL 过长导致。请关闭浏览器账号同步，改用账号云同步后重试。';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '浏览器同步存储写入失败，请先导出当前数据备份后重试。';
};

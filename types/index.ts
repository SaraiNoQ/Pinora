// 书签类型定义
export interface Bookmark {
  id?: string;
  title: string;
  url: string;
  icon?: string;
  category: string;
}

// 搜索引擎类型定义
export interface SearchEngine {
  id: string;
  name: string;
  icon: string;
  searchUrl: string;
}

// 书签分类类型定义
export interface Category {
  id: string;
  name: string;
  icon?: string;
} 

export type CategoryIconUrls = Record<string, string>;

export type ActiveLocalBackend = 'extension-sync' | 'extension-local' | 'local-storage';

export type StorageBackend = ActiveLocalBackend | 'cloud-sync';

export interface CloudSyncUser {
  id: string;
  provider: 'github';
  username: string;
  avatarUrl?: string;
}

export interface CloudSyncStatus {
  enabled: boolean;
  authenticated: boolean;
  user?: CloudSyncUser;
  lastSyncedAt?: string;
  lastError?: string;
  revision?: number;
  dailySyncEnabled: boolean;
  intervalSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  pendingUpload: boolean;
  lastLocalChangedAt?: string;
  lastCheckedAt?: string;
  lastSyncReason?: 'manual' | 'daily' | 'interval';
}

export interface NavigationSyncSnapshot {
  schemaVersion: 1;
  bookmarks: Bookmark[];
  categories: string[];
  categoryIconUrls: CategoryIconUrls;
  theme?: 'light' | 'dark';
  updatedAt: string;
}

export interface AppSettings {
  theme?: 'light' | 'dark';
  lastSyncedAt?: string;
  lastStorageError?: string;
  browserSyncEnabled?: boolean;
  cloudSyncEnabled?: boolean;
  cloudUser?: CloudSyncUser;
  lastCloudSyncedAt?: string;
  lastCloudSyncError?: string;
  cloudRevision?: number;
  cloudDailySyncEnabled?: boolean;
  cloudIntervalSyncEnabled?: boolean;
  cloudAutoSyncIntervalMinutes?: number;
  pendingCloudUpload?: boolean;
  lastLocalChangedAt?: string;
  lastCloudCheckedAt?: string;
  lastCloudSnapshotHash?: string;
  lastCloudSyncReason?: 'manual' | 'daily' | 'interval';
}

export interface StorageStatus {
  backend: StorageBackend;
  activeLocalBackend: ActiveLocalBackend;
  browserSyncEnabled: boolean;
  isExtensionEnvironment: boolean;
  lastSyncedAt?: string;
  lastStorageError?: string;
}

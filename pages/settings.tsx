import { useCallback, useEffect, useState } from 'react';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import FileUploader from '../components/FileUploader';
import Modal from '../components/Modal';
import ThemeToggle from '../components/ThemeToggle';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useCategories } from '../contexts/CategoryContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  getCloudSyncApiBase,
  getCloudSyncStatus,
  loginWithGithub,
  logoutCloudSync,
  pushCloudSnapshot,
  syncCurrentNavigationData,
  updateCloudSyncSchedule,
  CLOUD_SYNC_INTERVAL_OPTIONS,
} from '../lib/cloudSync';
import { validateCategoryIconUrlSizes, validateIconUrlSize } from '../lib/iconValidation';
import {
  clearStoredNavigationData,
  getStorageErrorMessage,
  getStorageStatus,
  setBrowserSyncEnabled,
  setStoredNavigationData,
} from '../lib/storage';
import type {
  Bookmark,
  CategoryIconUrls,
  CloudSyncStatus,
  NavigationSyncSnapshot,
  StorageStatus,
} from '../types';

const APP_VERSION = '0.3.1';

const buttonClassName = `inline-flex items-center justify-center gap-[7px] rounded-2xl
  border border-white/70 bg-white/70 px-3.5 py-2 text-sm font-medium
  text-slate-700 transition-colors hover:bg-white
  dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
  focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950`;

const primaryButtonClassName = `inline-flex items-center justify-center gap-[7px] rounded-2xl
  bg-cyan-600 px-3.5 py-2 text-sm font-medium text-white
  transition-colors hover:bg-cyan-500
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
  focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950`;

const dangerButtonClassName = `inline-flex items-center justify-center gap-[7px] rounded-2xl
  bg-red-500 px-3.5 py-2 text-sm font-medium text-white
  transition-colors hover:bg-red-600
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
  focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950`;

const panelClassName = `rounded-[22px] border border-white/70 bg-white/68 p-[18px]
  shadow-[0_24px_70px_-45px_rgba(15,23,42,0.9)] backdrop-blur-2xl
  dark:border-white/10 dark:bg-slate-900/45`;

const generateHash = async (blob: Blob) => {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
};

const getImportValidationError = (content: string): string | undefined => {
  try {
    const data = JSON.parse(content);
    const categoryIconUrls = data.categoryIconUrls;
    const hasValidCategoryIconUrls = (
      categoryIconUrls === undefined ||
      (
        typeof categoryIconUrls === 'object' &&
        categoryIconUrls !== null &&
        !Array.isArray(categoryIconUrls) &&
        Object.entries(categoryIconUrls).every(([category, iconUrl]) => (
          typeof category === 'string' &&
          typeof iconUrl === 'string'
        ))
      )
    );

    const hasValidShape = (
      Array.isArray(data.bookmarks) &&
      Array.isArray(data.categories) &&
      hasValidCategoryIconUrls &&
      data.categories.every((category: unknown) => typeof category === 'string') &&
      data.bookmarks.every((bookmark: Bookmark) => (
        typeof bookmark.title === 'string' &&
        typeof bookmark.url === 'string' &&
        typeof bookmark.category === 'string' &&
        (bookmark.icon === undefined || typeof bookmark.icon === 'string')
      ))
    );

    if (!hasValidShape) {
      return '无效的文件格式';
    }

    const bookmarkIconError = data.bookmarks
      .map((bookmark: Bookmark) => validateIconUrlSize(bookmark.icon))
      .find(Boolean);

    if (bookmarkIconError) {
      return bookmarkIconError;
    }

    const categoryIconError = validateCategoryIconUrlSizes(data.categoryIconUrls ?? {});
    if (categoryIconError) {
      return categoryIconError;
    }

    return undefined;
  } catch {
    return '无效的文件格式';
  }
};

const formatTime = (value?: string) => {
  if (!value) return '暂无记录';

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
};

export default function Settings() {
  const { bookmarks } = useBookmarks();
  const { categories, categoryIconUrls } = useCategories();
  const { theme } = useTheme();
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus | null>(null);
  const [isCloudBusy, setIsCloudBusy] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isStorageBusy, setIsStorageBusy] = useState(false);
  const [showFirstSync, setShowFirstSync] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importContent, setImportContent] = useState<string | null>(null);

  const loadStatus = useCallback(() => {
    getStorageStatus()
      .then(setStatus)
      .catch((error) => {
        console.error('读取同步状态失败：', error);
      });
  }, []);

  const loadCloudStatus = useCallback(() => {
    getCloudSyncStatus()
      .then(setCloudStatus)
      .catch((error) => {
        console.error('读取云同步状态失败：', error);
      });
  }, []);

  useEffect(() => {
    loadStatus();
    loadCloudStatus();
  }, [loadStatus, loadCloudStatus]);

  const goHome = () => {
    window.location.href = process.env.NODE_ENV === 'development' ? '/' : '/index.html';
  };

  const handleExport = async () => {
    const data = {
      bookmarks: bookmarks.map(({ id: _id, ...rest }) => rest),
      categories,
      categoryIconUrls,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const hash = await generateHash(blob);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-export_${hash}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importContent) {
      alert('导入失败：无效的文件格式');
      return;
    }

    const validationError = getImportValidationError(importContent);
    if (validationError) {
      alert(`导入失败：${validationError}`);
      return;
    }

    try {
      const data = JSON.parse(importContent);
      const bookmarksWithIds = data.bookmarks.map((bookmark: Bookmark) => ({
        ...bookmark,
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      }));
      const importedCategoryIconUrls = (data.categoryIconUrls ?? {}) as CategoryIconUrls;

      await setStoredNavigationData(bookmarksWithIds, data.categories, importedCategoryIconUrls);
      window.location.reload();
    } catch (error) {
      console.error('导入失败：', error);
      alert(`导入失败：${getStorageErrorMessage(error)}`);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearStoredNavigationData();
      window.location.href = process.env.NODE_ENV === 'development' ? '/' : '/index.html';
    } catch (error) {
      console.error('清除数据失败：', error);
      alert(`清除数据失败：${getStorageErrorMessage(error)}`);
    }
  };

  const handleBrowserSyncToggle = async (enabled: boolean) => {
    setIsStorageBusy(true);
    try {
      await setBrowserSyncEnabled(enabled);
      loadStatus();
      loadCloudStatus();
    } catch (error) {
      console.error('切换浏览器同步失败：', error);
      alert(`切换浏览器同步失败：${getStorageErrorMessage(error)}`);
    } finally {
      setIsStorageBusy(false);
    }
  };

  const buildSnapshot = (): NavigationSyncSnapshot => ({
    schemaVersion: 1,
    bookmarks,
    categories,
    categoryIconUrls,
    theme,
    updatedAt: new Date().toISOString(),
  });

  const runCloudAction = async (
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    setIsCloudBusy(true);
    setCloudMessage(null);
    setCloudError(null);

    try {
      await action();
      setCloudMessage(successMessage);
      loadStatus();
      loadCloudStatus();
    } catch (error) {
      console.error('云同步操作失败：', error);
      setCloudError(getStorageErrorMessage(error));
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleCloudLogin = async () => {
    await runCloudAction(async () => {
      await loginWithGithub();
      setShowFirstSync(true);
    }, 'GitHub 登录成功，请选择首次同步方向。');
  };

  const handleCloudPush = async () => {
    await runCloudAction(async () => {
      await pushCloudSnapshot(buildSnapshot(), 'manual');
      setShowFirstSync(false);
    }, '已上传本机数据到云端。');
  };

  const handleCloudPull = async () => {
    await runCloudAction(async () => {
      const snapshot = await syncCurrentNavigationData('pull');
      if (!snapshot) {
        throw new Error('云端还没有可拉取的数据，请先从一台设备上传。');
      }

      setShowFirstSync(false);
      window.location.reload();
    }, '已从云端拉取数据。');
  };

  const handleCloudLogout = async () => {
    await runCloudAction(async () => {
      await logoutCloudSync();
    }, '已退出云同步。');
  };

  const handleCloudDailySyncToggle = async (enabled: boolean) => {
    await runCloudAction(async () => {
      await updateCloudSyncSchedule({ cloudDailySyncEnabled: enabled });
    }, enabled ? '已开启每日零点自动检查。' : '已关闭每日零点自动检查。');
  };

  const handleCloudIntervalSyncToggle = async (enabled: boolean) => {
    await runCloudAction(async () => {
      await updateCloudSyncSchedule({ cloudIntervalSyncEnabled: enabled });
    }, enabled ? '已开启间隔自动检查。' : '已关闭间隔自动检查。');
  };

  const handleCloudIntervalChange = async (intervalMinutes: number) => {
    await runCloudAction(async () => {
      await updateCloudSyncSchedule({ cloudAutoSyncIntervalMinutes: intervalMinutes });
    }, '已更新自动检查间隔。');
  };

  const activeLocalBackendLabel = status?.activeLocalBackend === 'extension-sync'
    ? '浏览器同步存储'
    : status?.activeLocalBackend === 'extension-local'
      ? '本机扩展存储'
      : '本地开发存储';
  const storageBackendLabel = status?.backend === 'cloud-sync'
    ? `云同步 + ${activeLocalBackendLabel}`
    : activeLocalBackendLabel;
  const cloudApiBase = getCloudSyncApiBase();
  const hasCloudApiBase = cloudApiBase.length > 0;
  const autoSyncIntervalValue = cloudStatus?.autoSyncIntervalMinutes ?? 60;

  return (
    <div className="min-h-screen overflow-x-hidden font-blackFont text-slate-900 transition-colors
      bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_32%),linear-gradient(135deg,#f8fafc,#eef2f7)]
      dark:text-slate-100 dark:bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.24),transparent_34%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_32%),linear-gradient(135deg,#020617,#0f172a)]">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/65 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40">
        <div className="container mx-auto flex items-center justify-between px-3.5 py-2.5">
          <button onClick={goHome} className={buttonClassName}>
            <ArrowLeftIcon className="h-5 w-5" />
            返回首页
          </button>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">设置</h1>
        </div>
      </header>

      <main className="container mx-auto grid max-w-5xl gap-[18px] px-3.5 py-7 md:grid-cols-2">
        <section className={panelClassName}>
          <div className="mb-3.5 flex items-center justify-between gap-2.5">
            <div>
              <h2 className="text-lg font-semibold">个人数据同步</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                选择本机数据写入浏览器同步存储，或仅保存在本机扩展存储。
              </p>
            </div>
            {status?.lastStorageError ? (
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
            ) : (
              <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
            )}
          </div>

          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">存储后端</dt>
              <dd className="font-medium">{storageBackendLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">本机后端</dt>
              <dd className="font-medium">{activeLocalBackendLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">浏览器账号同步</dt>
              <dd className="font-medium">{status?.browserSyncEnabled ? '开启' : '关闭'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">扩展环境</dt>
              <dd className="font-medium">{status?.isExtensionEnvironment ? '是' : '否'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">最近保存</dt>
              <dd className="font-medium text-right">{formatTime(status?.lastSyncedAt)}</dd>
            </div>
            <div className="flex items-start justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">最近错误</dt>
              <dd className="max-w-[65%] text-right font-medium">
                {status?.lastStorageError ?? '无'}
              </dd>
            </div>
          </dl>

          <div className="mt-[18px] rounded-2xl border border-white/60 bg-white/55 p-3.5 dark:border-white/10 dark:bg-white/10">
            <div className="flex items-center justify-between gap-3.5">
              <div>
                <p className="text-sm font-medium">使用浏览器账号同步本机数据</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  关闭后本机数据写入 storage.local，云同步负责跨设备同步，可避免 storage.sync 图标配额限制。
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(status?.browserSyncEnabled)}
                disabled={isStorageBusy || !status?.isExtensionEnvironment}
                onClick={() => handleBrowserSyncToggle(!status?.browserSyncEnabled)}
                className={`relative inline-flex h-7 w-12 flex-none items-center rounded-full border transition-colors
                  ${status?.browserSyncEnabled ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300 bg-slate-300 dark:border-slate-600 dark:bg-slate-700'}
                  disabled:cursor-not-allowed disabled:opacity-60
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950`}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform
                    ${status?.browserSyncEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>

          <button onClick={loadStatus} className={`${buttonClassName} mt-[18px]`}>
            <ArrowPathIcon className="h-5 w-5" />
            刷新状态
          </button>
        </section>

        <section className={panelClassName}>
          <div className="mb-3.5 flex items-start justify-between gap-2.5">
            <div>
              <h2 className="text-lg font-semibold">账号云同步</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                使用 GitHub 账号和 Cloudflare Worker 同步完整导航数据。
              </p>
            </div>
            {cloudStatus?.authenticated ? (
              <CheckCircleIcon className="h-6 w-6 flex-none text-emerald-500" />
            ) : (
              <UserCircleIcon className="h-6 w-6 flex-none text-slate-400" />
            )}
          </div>

          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">API</dt>
              <dd className="max-w-[65%] truncate text-right font-medium">
                {hasCloudApiBase ? cloudApiBase : '未配置'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">账号</dt>
              <dd className="max-w-[65%] truncate text-right font-medium">
                {cloudStatus?.user?.username ?? '未登录'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">云端快照序号</dt>
              <dd className="font-medium">{cloudStatus?.revision ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">最近云同步</dt>
              <dd className="font-medium text-right">{formatTime(cloudStatus?.lastSyncedAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">待上传更改</dt>
              <dd className="font-medium">{cloudStatus?.pendingUpload ? '有' : '无'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3.5">
              <dt className="text-slate-500 dark:text-slate-400">最近自动检查</dt>
              <dd className="font-medium text-right">{formatTime(cloudStatus?.lastCheckedAt)}</dd>
            </div>
          </dl>

          <p className="mt-2.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            云端快照序号是 Cloudflare 每次成功保存快照后的递增 revision，不是扩展版本号。
          </p>

          {cloudStatus?.authenticated && (
            <div className="mt-[18px] rounded-2xl border border-white/60 bg-white/55 p-3.5 dark:border-white/10 dark:bg-white/10">
              <div className="flex items-start justify-between gap-3.5">
                <div>
                  <p className="text-sm font-medium">每日零点同步</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    每天本地时间 00:00 检查一次，有本机更新才上传云端。
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={cloudStatus.dailySyncEnabled}
                  disabled={isCloudBusy}
                  onClick={() => handleCloudDailySyncToggle(!cloudStatus.dailySyncEnabled)}
                  className={`relative inline-flex h-7 w-12 flex-none items-center rounded-full border transition-colors
                    ${cloudStatus.dailySyncEnabled ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300 bg-slate-300 dark:border-slate-600 dark:bg-slate-700'}
                    disabled:cursor-not-allowed disabled:opacity-60
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                    focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform
                      ${cloudStatus.dailySyncEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              <div className="mt-3.5 border-t border-white/60 pt-3.5 dark:border-white/10">
                <div className="flex items-start justify-between gap-3.5">
                  <div>
                    <p className="text-sm font-medium">间隔自动同步</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      开启后按固定间隔检查，有本机更新才上传一次。
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={cloudStatus.intervalSyncEnabled}
                    disabled={isCloudBusy}
                    onClick={() => handleCloudIntervalSyncToggle(!cloudStatus.intervalSyncEnabled)}
                    className={`relative inline-flex h-7 w-12 flex-none items-center rounded-full border transition-colors
                      ${cloudStatus.intervalSyncEnabled ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300 bg-slate-300 dark:border-slate-600 dark:bg-slate-700'}
                      disabled:cursor-not-allowed disabled:opacity-60
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                      focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform
                        ${cloudStatus.intervalSyncEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                    />
                  </button>
                </div>

                <label className="mt-3 flex items-center justify-between gap-3.5 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">检查间隔</span>
                  <select
                    value={autoSyncIntervalValue}
                    disabled={isCloudBusy || !cloudStatus.intervalSyncEnabled}
                    onChange={(event) => handleCloudIntervalChange(Number(event.target.value))}
                    className="rounded-2xl border border-white/70 bg-white/75 px-3.5 py-2 text-sm font-medium
                      text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60
                      dark:border-white/10 dark:bg-white/10 dark:text-slate-100
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                      focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
                  >
                    {CLOUD_SYNC_INTERVAL_OPTIONS.map((intervalMinutes) => (
                      <option key={intervalMinutes} value={intervalMinutes}>
                        {intervalMinutes < 60 ? `${intervalMinutes} 分钟` : `${intervalMinutes / 60} 小时`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {cloudMessage && (
            <p className="mt-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-2 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              {cloudMessage}
            </p>
          )}
          {(cloudError || cloudStatus?.lastError) && (
            <p className="mt-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              {cloudError ?? cloudStatus?.lastError}
            </p>
          )}

          <div className="mt-[18px] flex flex-wrap gap-2.5">
            {!cloudStatus?.authenticated ? (
              <button
                onClick={handleCloudLogin}
                disabled={isCloudBusy || !hasCloudApiBase}
                className={`${primaryButtonClassName} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400`}
              >
                <UserCircleIcon className="h-5 w-5" />
                使用 GitHub 登录同步
              </button>
            ) : (
              <>
                <button
                  onClick={handleCloudPush}
                  disabled={isCloudBusy}
                  className={`${primaryButtonClassName} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400`}
                >
                  <CloudArrowUpIcon className="h-5 w-5" />
                  立即上传本机数据
                </button>
                <button
                  onClick={handleCloudPull}
                  disabled={isCloudBusy}
                  className={`${buttonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <CloudArrowDownIcon className="h-5 w-5" />
                  立即拉取云端数据
                </button>
                <button
                  onClick={handleCloudLogout}
                  disabled={isCloudBusy}
                  className={`${buttonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  退出云同步
                </button>
              </>
            )}
          </div>
        </section>

        <section className={panelClassName}>
          <h2 className="text-lg font-semibold">外观</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            主题偏好会写入同步存储。
          </p>
          <div className="mt-[18px] flex items-center justify-between rounded-2xl border border-white/60 bg-white/55 p-3.5 dark:border-white/10 dark:bg-white/10">
            <span className="text-sm font-medium">深色 / 浅色主题</span>
            <ThemeToggle />
          </div>
        </section>

        <section className={panelClassName}>
          <h2 className="text-lg font-semibold">数据迁移</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            JSON 文件可用于备份、迁移和同步失败后的恢复。
          </p>
          <div className="mt-[18px] flex flex-wrap gap-2.5">
            <button onClick={() => setShowImport(true)} className={primaryButtonClassName}>
              <ArrowUpTrayIcon className="h-5 w-5" />
              导入数据
            </button>
            <button onClick={handleExport} className={buttonClassName}>
              <ArrowDownTrayIcon className="h-5 w-5" />
              导出数据
            </button>
          </div>
        </section>

        <section className={panelClassName}>
          <h2 className="text-lg font-semibold">危险操作</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            清空后会回到默认书签数据。
          </p>
          <button onClick={() => setShowClearConfirm(true)} className={`${dangerButtonClassName} mt-[18px]`}>
            <TrashIcon className="h-5 w-5" />
            清空全部数据
          </button>
        </section>

        <section className={`${panelClassName} md:col-span-2`}>
          <h2 className="text-lg font-semibold">关于</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            书签导航新标签页扩展，Manifest V3 静态导出构建。当前版本 {APP_VERSION}。
          </p>
        </section>
      </main>

      <Modal
        isOpen={showImport}
        onClose={() => {
          setShowImport(false);
          setImportContent(null);
        }}
        title="导入数据"
      >
        <div className="space-y-3.5">
          <FileUploader onFileSelect={setImportContent} />
          <div className="flex justify-end gap-2.5">
            <button
              onClick={() => {
                setShowImport(false);
                setImportContent(null);
              }}
              className={buttonClassName}
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={!importContent}
              className={`${primaryButtonClassName} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400`}
            >
              确认导入
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showFirstSync}
        onClose={() => setShowFirstSync(false)}
        title="选择首次同步方向"
      >
        <div className="space-y-3.5">
          <p className="text-slate-600 dark:text-slate-300">
            为避免误覆盖数据，请选择本次登录后的同步方向。后续本地保存只会标记待上传，可手动上传，或由每日零点/间隔检查自动上传。
          </p>
          <div className="flex flex-wrap justify-end gap-2.5">
            <button
              onClick={() => setShowFirstSync(false)}
              className={buttonClassName}
            >
              稍后处理
            </button>
            <button
              onClick={handleCloudPull}
              disabled={isCloudBusy}
              className={`${buttonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <CloudArrowDownIcon className="h-5 w-5" />
              用云端数据覆盖本机
            </button>
            <button
              onClick={handleCloudPush}
              disabled={isCloudBusy}
              className={`${primaryButtonClassName} disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400`}
            >
              <CloudArrowUpIcon className="h-5 w-5" />
              上传本机数据到云端
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="确认清除"
      >
        <div className="space-y-3.5">
          <p className="text-slate-600 dark:text-slate-300">
            确定要清除所有数据吗？此操作不可恢复。
          </p>
          <div className="flex justify-end gap-2.5">
            <button onClick={() => setShowClearConfirm(false)} className={buttonClassName}>
              取消
            </button>
            <button onClick={handleClearAll} className={dangerButtonClassName}>
              确认清除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

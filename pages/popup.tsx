import { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  BookmarkSquareIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useCategories } from '../contexts/CategoryContext';
import { getStorageErrorMessage } from '../lib/storage';

type TabsApi = {
  query: (queryInfo: { active: boolean; currentWindow: boolean }) => Promise<Array<{
    title?: string;
    url?: string;
    favIconUrl?: string;
  }>>;
};

const inputClassName = `h-9 w-full min-w-0 truncate rounded-lg border border-slate-200/80 bg-white/72 px-2.5
  text-sm text-slate-900 placeholder-slate-400 transition-colors
  dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-100 dark:placeholder-slate-500
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
  focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950`;

const getTabsApi = async (): Promise<TabsApi | null> => {
  try {
    const webExtension = await import('webextension-polyfill');
    return webExtension.default.tabs as TabsApi;
  } catch {
    // Development mode runs outside the extension API surface.
  }

  return null;
};

export default function Popup() {
  const { addBookmark } = useBookmarks();
  const { categories } = useCategories();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [icon, setIcon] = useState('');
  const [category, setCategory] = useState('');
  const [isLoadingTab, setIsLoadingTab] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!category && categories.length > 0) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  useEffect(() => {
    let isMounted = true;

    getTabsApi()
      .then((tabsApi) => tabsApi?.query({ active: true, currentWindow: true }))
      .then((tabs) => {
        if (!isMounted) return;

        const activeTab = tabs?.[0];
        setTitle(activeTab?.title ?? '');
        setUrl(activeTab?.url ?? '');
        setIcon(activeTab?.favIconUrl ?? '');
      })
      .catch((loadError) => {
        console.error('读取当前标签页失败：', loadError);
        if (isMounted) {
          setError('无法读取当前标签页信息，请手动填写。');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingTab(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatusMessage('');
    setIsSaving(true);

    try {
      await addBookmark({
        title,
        url,
        icon,
        category,
      });
      setStatusMessage('已收藏');
      window.setTimeout(() => window.close(), 180);
    } catch (saveError) {
      setError(getStorageErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = Boolean(title.trim() && url.trim() && category && !isSaving);

  return (
    <main className="w-[340px] border border-white/60 bg-white/88 p-3 font-blackFont text-slate-900 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90 dark:text-slate-100">
      <div className="mb-3 flex items-start justify-between gap-2.5 border-b border-slate-200/70 pb-2.5 dark:border-white/10">
        <div className="min-w-0">
          <h1 className="text-[15px] font-semibold leading-5">快速收藏</h1>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            保存当前网页到书签导航
          </p>
        </div>
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-cyan-50/90 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-200">
          <BookmarkSquareIcon className="h-[18px] w-[18px]" />
        </div>
      </div>

      {isLoadingTab ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          正在读取当前标签页...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClassName}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className={inputClassName}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              图标 URL
            </label>
            <div className="relative">
              <input
                type="text"
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                placeholder="留空使用默认图标"
                className={`${inputClassName} ${icon ? 'pr-9' : ''}`}
              />
              {icon && (
                <button
                  type="button"
                  onClick={() => setIcon('')}
                  className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md
                    text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700
                    dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55"
                  aria-label="清空图标 URL"
                  title="清空图标 URL"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
              分类
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClassName}
              required
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {statusMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckIcon className="h-4 w-4" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => window.close()}
              className="h-9 rounded-lg border border-transparent bg-transparent px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="h-9 rounded-lg bg-cyan-600 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
            >
              {isSaving ? '保存中...' : '收藏'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

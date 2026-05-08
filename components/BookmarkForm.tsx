import { useState } from 'react';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useCategories } from '../contexts/CategoryContext';
import type { Bookmark } from '../types';

interface BookmarkFormProps {
  mode: 'add' | 'edit';
  category?: string;
  bookmark?: Bookmark;
  onClose: () => void;
}

const inputClassName = `w-full px-2.5 py-2 rounded-xl
  bg-white/70 dark:bg-slate-900/50
  border border-white/70 dark:border-white/10
  text-slate-900 dark:text-slate-100
  placeholder-slate-400 dark:placeholder-slate-500
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
  focus-visible:ring-offset-2 focus-visible:ring-offset-white
  dark:focus-visible:ring-offset-slate-950
  focus:border-cyan-300/70 transition-colors`;

export default function BookmarkForm({
  mode,
  category,
  bookmark,
  onClose,
}: BookmarkFormProps) {
  const { addBookmark, updateBookmark } = useBookmarks();
  const { categories } = useCategories();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: bookmark?.title ?? '',
    url: bookmark?.url ?? '',
    icon: bookmark?.icon ?? '',
    category: bookmark?.category ?? category ?? categories[0] ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (mode === 'edit' && bookmark?.id) {
        updateBookmark(bookmark.id, formData);
      } else {
        await addBookmark(formData);
      }
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '保存失败');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          标题
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
          className={inputClassName}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          URL
        </label>
        <input
          type="url"
          value={formData.url}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, url: e.target.value }))
          }
          className={inputClassName}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          图标 URL
        </label>
        <input
          type="text"
          value={formData.icon}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, icon: e.target.value }))
          }
          placeholder="留空使用默认图标"
          className={inputClassName}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          分类
        </label>
        <select
          value={formData.category}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, category: e.target.value }))
          }
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
        <p className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-[7px] text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2.5 pt-[7px]">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-[7px] rounded-xl
            bg-white/70 dark:bg-white/10
            border border-white/70 dark:border-white/10
            text-slate-700 dark:text-slate-200
            hover:bg-white dark:hover:bg-white/15
            transition-colors focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2
            focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-3.5 py-[7px] rounded-xl
            bg-cyan-600 text-white
            hover:bg-cyan-500
            transition-colors focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2
            focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
        >
          {mode === 'edit' ? '保存' : '添加'}
        </button>
      </div>
    </form>
  );
}

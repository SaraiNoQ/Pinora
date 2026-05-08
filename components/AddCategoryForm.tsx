import { useState } from 'react';
import { validateIconUrlSize } from '../lib/iconValidation';

interface AddCategoryFormProps {
  onSubmit: (category: string, iconUrl?: string) => void;
  onClose: () => void;
}

const isValidCategoryIconUrl = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return true;
  if (trimmedValue.startsWith('/')) return true;

  try {
    const url = new URL(trimmedValue);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function AddCategoryForm({ onSubmit, onClose }: AddCategoryFormProps) {
  const [category, setCategory] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCategory = category.trim();
    const trimmedIconUrl = iconUrl.trim();

    if (!trimmedCategory) {
      setError('分类名称不能为空');
      return;
    }

    if (!isValidCategoryIconUrl(trimmedIconUrl)) {
      setError('图标 URL 需以 http://、https:// 或 / 开头');
      return;
    }

    const iconSizeError = validateIconUrlSize(trimmedIconUrl);
    if (iconSizeError) {
      setError(iconSizeError);
      return;
    }

    onSubmit(trimmedCategory, trimmedIconUrl || undefined);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          分类名称
        </label>
        <input
          type="text"
          value={category}
          onChange={e => {
            setCategory(e.target.value);
            setError('');
          }}
          className="w-full rounded-xl border border-white/70 bg-white/70 px-2.5 py-2
            text-slate-900 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-100
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
            focus-visible:ring-offset-2 focus-visible:ring-offset-white
            dark:focus-visible:ring-offset-slate-950 focus:border-cyan-300/70
            transition-colors"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          分类图标 URL（可选）
        </label>
        <input
          type="text"
          value={iconUrl}
          onChange={e => {
            setIconUrl(e.target.value);
            setError('');
          }}
          placeholder="https://example.com/icon.svg 或 /icons/custom.svg"
          className="w-full rounded-xl border border-white/70 bg-white/70 px-2.5 py-2
            text-slate-900 placeholder-slate-400 dark:border-white/10 dark:bg-slate-900/50
            dark:text-slate-100 dark:placeholder-slate-500
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
            focus-visible:ring-offset-2 focus-visible:ring-offset-white
            dark:focus-visible:ring-offset-slate-950 focus:border-cyan-300/70
            transition-colors"
        />
        {error && (
          <p className="mt-1 text-sm font-semibold text-red-500">
            {error}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2.5 pt-[7px]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/70 bg-white/70 px-3.5 py-[7px]
            text-slate-700 hover:bg-white
            dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15
            transition-colors focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2
            focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
        >
          取消
        </button>
        <button
          type="submit"
          className="rounded-xl bg-cyan-600 px-3.5 py-[7px] text-white
            hover:bg-cyan-500 transition-colors focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2
            focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
        >
          添加
        </button>
      </div>
    </form>
  );
} 

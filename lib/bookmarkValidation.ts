import type { Bookmark } from '../types';
import { validateIconUrlSize } from './iconValidation';

export const isValidBookmarkUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

export const normalizeBookmarkInput = (
  bookmark: Omit<Bookmark, 'id'> | Bookmark,
): Omit<Bookmark, 'id'> => {
  const normalized = {
    title: bookmark.title.trim(),
    url: bookmark.url.trim(),
    icon: bookmark.icon?.trim() || `/default${Math.floor(Math.random() * 10)}.svg`,
    category: bookmark.category.trim(),
  };

  if (!normalized.title) {
    throw new Error('标题不能为空');
  }

  if (!isValidBookmarkUrl(normalized.url)) {
    throw new Error('无效的 URL');
  }

  if (!normalized.category) {
    throw new Error('分类不能为空');
  }

  const iconSizeError = validateIconUrlSize(bookmark.icon);
  if (iconSizeError) {
    throw new Error(iconSizeError);
  }

  return normalized;
};

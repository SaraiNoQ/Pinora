import type { CategoryIconUrls, NavigationSyncSnapshot } from '../types';

export const MAX_ICON_URL_BYTES = 50 * 1024;
export const ICON_URL_TOO_LARGE_MESSAGE = '图标 URL 不能超过 50KB，请改用更短的图片链接或清空图标 URL。';

const getUtf8ByteLength = (value: string) => new TextEncoder().encode(value).length;

export const validateIconUrlSize = (iconUrl?: string) => {
  if (!iconUrl) return undefined;

  return getUtf8ByteLength(iconUrl) > MAX_ICON_URL_BYTES
    ? ICON_URL_TOO_LARGE_MESSAGE
    : undefined;
};

export const validateCategoryIconUrlSizes = (categoryIconUrls: CategoryIconUrls) => {
  for (const iconUrl of Object.values(categoryIconUrls)) {
    const error = validateIconUrlSize(iconUrl);
    if (error) return error;
  }

  return undefined;
};

export const validateNavigationSnapshotIconSizes = (snapshot: NavigationSyncSnapshot) => {
  for (const bookmark of snapshot.bookmarks) {
    const error = validateIconUrlSize(bookmark.icon);
    if (error) return error;
  }

  return validateCategoryIconUrlSizes(snapshot.categoryIconUrls);
};

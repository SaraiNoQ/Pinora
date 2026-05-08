import { createContext, useContext, useState, useEffect } from 'react';
import { Bookmark } from '../types';
import { defaultBookmarks } from '../data/bookmarks';
import { normalizeBookmarkInput } from '../lib/bookmarkValidation';
import { getStorageErrorMessage, getStoredValue, setStoredValue } from '../lib/storage';

// 定义Context接口
interface BookmarkContextType {
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Omit<Bookmark, 'id'>) => Promise<void>;
  removeBookmark: (id: string) => void;
  updateBookmark: (id: string, bookmark: Partial<Bookmark>) => void;
  updateBookmarksOrder: (bookmarkId: string, category: string) => void;
  removeBookmarksByCategory: (category: string) => void;
  moveBookmarksToCategory: (sourceCategory: string, targetCategory: string) => void;
  renameBookmarksCategory: (oldCategory: string, newCategory: string) => void;
}

// 创建Context
const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

// Context Provider组件
export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  // 状态管理：书签列表
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初始化：从浏览器扩展同步存储加载数据，开发环境回退到localStorage
  useEffect(() => {
    let isMounted = true;

    getStoredValue('bookmarks')
      .then((storedBookmarks) => {
        if (!isMounted) return;

        setBookmarks(storedBookmarks ?? defaultBookmarks);
        setIsLoaded(true);
      })
      .catch((error) => {
        if (!isMounted) return;

        console.error('读取书签失败：', error);
        setBookmarks(defaultBookmarks);
        setIsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 保存更改到浏览器扩展同步存储
  useEffect(() => {
    if (!isLoaded) return;

    setStoredValue('bookmarks', bookmarks).catch((error) => {
      console.error('保存书签失败：', error);
      alert(`保存书签失败：${getStorageErrorMessage(error)}`);
    });
  }, [bookmarks, isLoaded]);

  // 添加书签
  const addBookmark = async (bookmark: Omit<Bookmark, 'id'>) => {
    const normalizedBookmark = normalizeBookmarkInput(bookmark);
    const newBookmark = {
      ...normalizedBookmark,
      id: crypto.randomUUID?.() ?? Date.now().toString(),
    };
    const storedBookmarks = await getStoredValue('bookmarks');
    const baseBookmarks = storedBookmarks ?? (isLoaded ? bookmarks : defaultBookmarks);
    const nextBookmarks = [...baseBookmarks, newBookmark];

    setBookmarks(nextBookmarks);
    await setStoredValue('bookmarks', nextBookmarks);
  };

  // 删除书签
  const removeBookmark = (id: string) => {
    setBookmarks(bookmarks.filter(b => b.id !== id));
  };

  // 更新书签
  const updateBookmark = (id: string, bookmark: Partial<Bookmark>) => {
    setBookmarks(bookmarks.map(b => 
      b.id === id ? { ...normalizeBookmarkInput({ ...b, ...bookmark }), id } : b
    ));
  };

  // 更新书签顺序
  const updateBookmarksOrder = (bookmarkId: string, category: string) => {
    setBookmarks(prevBookmarks => {
      // 找到要置顶的书签
      const bookmarkToPin = prevBookmarks.find(b => b.id === bookmarkId);
      if (!bookmarkToPin) return prevBookmarks;

      // 过滤出其他书签
      const otherBookmarks = prevBookmarks.filter(b => b.id !== bookmarkId);
      
      // 找到同类别的书签
      const categoryBookmarks = otherBookmarks.filter(b => b.category === category);
      const nonCategoryBookmarks = otherBookmarks.filter(b => b.category !== category);

      // 将要置顶的书签放在同类别书签的最前面
      return [...nonCategoryBookmarks, bookmarkToPin, ...categoryBookmarks];
    });
  };

  // 删除指定分类下的所有书签
  const removeBookmarksByCategory = (category: string) => {
    setBookmarks((currentBookmarks) => currentBookmarks.filter(b => b.category !== category));
  };

  // 将指定分类下的书签移动到另一个分类
  const moveBookmarksToCategory = (sourceCategory: string, targetCategory: string) => {
    setBookmarks((currentBookmarks) =>
      currentBookmarks.map(b =>
        b.category === sourceCategory ? { ...b, category: targetCategory } : b
      )
    );
  };

  // 同步分类改名到书签归属
  const renameBookmarksCategory = (oldCategory: string, newCategory: string) => {
    setBookmarks((currentBookmarks) =>
      currentBookmarks.map(b =>
        b.category === oldCategory ? { ...b, category: newCategory } : b
      )
    );
  };

  return (
    <BookmarkContext.Provider value={{
      bookmarks,
      addBookmark,
      removeBookmark,
      updateBookmark,
      updateBookmarksOrder,
      removeBookmarksByCategory,
      moveBookmarksToCategory,
      renameBookmarksCategory,
    }}>
      {children}
    </BookmarkContext.Provider>
  );
}

// 自定义Hook
export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
} 

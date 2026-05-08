import { createContext, useContext, useState, useEffect } from 'react';
import { defaultCategories } from '../data/bookmarks';
import { getStorageErrorMessage, getStoredValue, setStoredValue } from '../lib/storage';
import type { CategoryIconUrls } from '../types';

// 定义Context接口
interface CategoryContextType {
  categories: string[];
  categoryIconUrls: CategoryIconUrls;
  addCategory: (category: string, iconUrl?: string) => void;
  removeCategory: (category: string) => void;
  reorderCategories: (fromIndex: number, toIndex: number) => void;
  renameCategory: (oldCategory: string, newCategory: string) => void;
}

// 创建Context
const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

// Context Provider组件
export function CategoryProvider({ children }: { children: React.ReactNode }) {
  // 状态管理：分类列表
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryIconUrls, setCategoryIconUrls] = useState<CategoryIconUrls>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // 初始化：从浏览器扩展同步存储加载数据，开发环境回退到localStorage
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getStoredValue('categories'),
      getStoredValue('categoryIconUrls'),
    ])
      .then(([storedCategories, storedCategoryIconUrls]) => {
        if (!isMounted) return;

        setCategories(storedCategories ?? defaultCategories);
        setCategoryIconUrls(storedCategoryIconUrls ?? {});
        setIsLoaded(true);
      })
      .catch((error) => {
        if (!isMounted) return;

        console.error('读取分类失败：', error);
        setCategories(defaultCategories);
        setCategoryIconUrls({});
        setIsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 保存更改到浏览器扩展同步存储
  useEffect(() => {
    if (!isLoaded) return;

    setStoredValue('categories', categories).catch((error) => {
      console.error('保存分类失败：', error);
      alert(`保存分类失败：${getStorageErrorMessage(error)}`);
    });
  }, [categories, isLoaded]);

  // 保存自定义分类图标到浏览器扩展同步存储
  useEffect(() => {
    if (!isLoaded) return;

    setStoredValue('categoryIconUrls', categoryIconUrls).catch((error) => {
      console.error('保存分类图标失败：', error);
      alert(`保存分类图标失败：${getStorageErrorMessage(error)}`);
    });
  }, [categoryIconUrls, isLoaded]);

  // 添加分类
  const addCategory = (category: string, iconUrl?: string) => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) return;
    if (categories.includes(trimmedCategory)) return;
    const trimmedIconUrl = iconUrl?.trim();

    setCategories((currentCategories) => [...currentCategories, trimmedCategory]);

    if (trimmedIconUrl) {
      setCategoryIconUrls((currentIconUrls) => ({
        ...currentIconUrls,
        [trimmedCategory]: trimmedIconUrl,
      }));
    }
  };

  // 删除分类
  const removeCategory = (category: string) => {
    setCategories((currentCategories) => currentCategories.filter(c => c !== category));
    setCategoryIconUrls((currentIconUrls) => {
      const { [category]: _removedIconUrl, ...nextIconUrls } = currentIconUrls;
      return nextIconUrls;
    });
  };

  // 调整分类顺序
  const reorderCategories = (fromIndex: number, toIndex: number) => {
    setCategories((currentCategories) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= currentCategories.length ||
        toIndex >= currentCategories.length
      ) {
        return currentCategories;
      }

      const nextCategories = [...currentCategories];
      const [movedCategory] = nextCategories.splice(fromIndex, 1);
      nextCategories.splice(toIndex, 0, movedCategory);
      return nextCategories;
    });
  };

  // 分类改名，保持原位置不变
  const renameCategory = (oldCategory: string, newCategory: string) => {
    const trimmedCategory = newCategory.trim();
    if (!trimmedCategory) return;

    setCategories((currentCategories) =>
      currentCategories.map(category =>
        category === oldCategory ? trimmedCategory : category
      )
    );

    setCategoryIconUrls((currentIconUrls) => {
      const currentIconUrl = currentIconUrls[oldCategory];
      if (!currentIconUrl) return currentIconUrls;

      const { [oldCategory]: _removedIconUrl, ...nextIconUrls } = currentIconUrls;
      return {
        ...nextIconUrls,
        [trimmedCategory]: currentIconUrl,
      };
    });
  };

  return (
    <CategoryContext.Provider value={{
      categories,
      categoryIconUrls,
      addCategory,
      removeCategory,
      reorderCategories,
      renameCategory,
    }}>
      {children}
    </CategoryContext.Provider>
  );
}

// 自定义Hook
export function useCategories() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
} 

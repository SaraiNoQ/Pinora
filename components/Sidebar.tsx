/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import { useCategories } from '../contexts/CategoryContext';
import { useBookmarks } from '../contexts/BookmarkContext';
import Modal from './Modal';
import AddCategoryForm from './AddCategoryForm';
import { categoryIcons } from '../data/bookmarks';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

const fallbackCategoryIcons = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😋', '😎',
  '💻', '⌨️', '🖥️', '🔨', '⚙️', '🔧', '📱', '⚛️',
  '☕', '✅', '⚠️', '🚫', '♻️', '🔄', '⏳', '🔍',
  '🚀', '⭐', '💡', '🎯', '🎨', '🔒', '🔑', '🔔',
  '📝', '📚', '📊', '📈', '📉', '📋', '📁', '📂',
  '💬', '📢', '📧', '🌐', '🔗', '🚨', '🔥', '🧪'
];

const getStableIconIndex = (value: string) => {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % fallbackCategoryIcons.length;
};

export default function Sidebar() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [suppressClick, setSuppressClick] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [failedIconUrls, setFailedIconUrls] = useState<Record<string, boolean>>({});
  const { categories, categoryIconUrls, addCategory, removeCategory, reorderCategories } = useCategories();
  const { bookmarks, removeBookmarksByCategory, moveBookmarksToCategory } = useBookmarks();

  const getCategoryIcon = (category: string) => {
    return categoryIcons[category] || fallbackCategoryIcons[getStableIconIndex(category)];
  };

  const renderCategoryIcon = (category: string) => {
    const customIconUrl = categoryIconUrls[category];
    if (customIconUrl && !failedIconUrls[category]) {
      return (
        <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-md">
          <img
            src={customIconUrl}
            alt=""
            className="block h-full w-full"
            style={{ objectFit: 'contain' }}
            onError={() => {
              setFailedIconUrls((currentFailedIconUrls) => ({
                ...currentFailedIconUrls,
                [category]: true,
              }));
            }}
          />
        </span>
      );
    }

    return <span className="text-lg">{getCategoryIcon(category)}</span>;
  };

  // 处理分类点击
  const handleCategoryClick = (category: string) => {
    if (suppressClick) {
      return;
    }

    setActiveCategory(activeCategory === category ? null : category);
    
    // 查找对应的分类标题元素
    const element = document.getElementById(`category-${category}`);
    if (element) {
      // 获取元素顶部位置
      const elementTop = element.getBoundingClientRect().top;
      const offsetPosition = elementTop + window.pageYOffset - 8;

      // 检查是否有足够的滚动空间
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const targetScroll = Math.min(offsetPosition, maxScroll);

      // 平滑滚动
      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  // 处理添加新分类
  const handleAddCategory = (newCategory: string, iconUrl?: string) => {
    addCategory(newCategory, iconUrl);
    setShowAddCategory(false);
  };

  const openSettings = () => {
    window.location.href = process.env.NODE_ENV === 'development' ? '/settings' : '/settings.html';
  };

  const resetDragState = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
    window.setTimeout(() => setSuppressClick(false), 80);
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number, category: string) => {
    setDraggedIndex(index);
    setDropTargetIndex(index);
    setSuppressClick(true);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', category);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    if (draggedIndex === null) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();

    if (draggedIndex !== null && draggedIndex !== index) {
      reorderCategories(draggedIndex, index);
    }

    resetDragState();
  };

  const getMoveTargetCategory = (category: string) => {
    if (categories.length <= 1) return null;
    if (category === categories[0]) {
      return categories.find(currentCategory => currentCategory !== category) ?? null;
    }
    return categories[0];
  };

  const handleDeleteButtonClick = (event: React.MouseEvent, category: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDeletingCategory(category);
  };

  const handleDeleteCategory = () => {
    if (!deletingCategory) return;

    removeBookmarksByCategory(deletingCategory);
    removeCategory(deletingCategory);
    setDeletingCategory(null);
  };

  const handleMoveAndDeleteCategory = () => {
    if (!deletingCategory) return;

    const targetCategory = getMoveTargetCategory(deletingCategory);
    if (!targetCategory) {
      alert('没有可接收书签的其他分类。');
      return;
    }

    moveBookmarksToCategory(deletingCategory, targetCategory);
    removeCategory(deletingCategory);
    setDeletingCategory(null);
  };

  const deletingBookmarkCount = deletingCategory
    ? bookmarks.filter(bookmark => bookmark.category === deletingCategory).length
    : 0;
  const moveTargetCategory = deletingCategory ? getMoveTargetCategory(deletingCategory) : null;

  return (
    <>
      <div className="fixed left-0 top-0 h-screen w-[72px] 
        bg-white/75 dark:bg-slate-950/55
        border-r border-white/70 dark:border-white/10
        backdrop-blur-2xl
        flex flex-col items-center py-3.5 z-50
        transition-colors duration-200
        max-md:top-auto max-md:bottom-0 max-md:h-[72px] max-md:w-full
        max-md:flex-row max-md:justify-start max-md:border-r-0
        max-md:border-t max-md:px-2.5 max-md:py-[7px]">
        <div className="flex min-h-0 flex-1 flex-col items-center gap-[7px] overflow-y-auto px-[7px] pb-[7px]
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          max-md:flex-row max-md:overflow-x-auto max-md:overflow-y-hidden max-md:px-0 max-md:pb-0 max-md:pr-2">
          {categories.map((category, index) => (
            <div
              key={category}
              draggable
              onDragStart={(event) => handleDragStart(event, index, category)}
              onDragOver={(event) => handleDragOver(event, index)}
              onDrop={(event) => handleDrop(event, index)}
              onDragEnd={resetDragState}
              className={`relative group flex-shrink-0 cursor-grab active:cursor-grabbing
                transition-transform transition-opacity duration-150
                ${draggedIndex === index ? 'scale-95 opacity-50' : 'opacity-100'}
                ${dropTargetIndex === index && draggedIndex !== null && draggedIndex !== index ? 'rounded-2xl ring-2 ring-cyan-400/55 ring-offset-2 ring-offset-white dark:ring-offset-slate-950' : ''}`}
            >
              <button
                onClick={() => handleCategoryClick(category)}
                className={`h-11 w-11 rounded-2xl flex items-center justify-center 
                  transition-colors duration-150 group-hover:rounded-2xl
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950
                  ${activeCategory === category 
                    ? 'bg-cyan-600 text-white shadow-[0_14px_35px_-20px_rgba(8,145,178,0.9)]' 
                    : 'bg-white/70 dark:bg-white/10 hover:bg-cyan-50 dark:hover:bg-cyan-900/40 hover:text-cyan-700 dark:hover:text-cyan-200'
                  }`}
              >
                {renderCategoryIcon(category)}
              </button>

              <button
                type="button"
                draggable={false}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => handleDeleteButtonClick(event, category)}
                className="absolute -right-1 -top-1 hidden h-[18px] w-[18px] items-center justify-center rounded-full
                  border border-transparent bg-transparent transition-transform transition-opacity duration-150
                  hover:scale-105 group-hover:flex
                  focus-visible:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white
                  dark:focus-visible:ring-offset-slate-950 max-md:hidden"
                title="删除分类"
                aria-label={`删除分类 ${category}`}
              >
                <svg
                  viewBox="0 0 1024 1024"
                  className="h-[18px] w-[18px]"
                  aria-hidden="true"
                >
                  <path d="M512 512m-450.56 0a450.56 450.56 0 1 0 901.12 0 450.56 450.56 0 1 0-901.12 0Z" fill="#D80405" />
                  <path d="M245.76 481.28m30.72 0l471.04 0q30.72 0 30.72 30.72l0 0q0 30.72-30.72 30.72l-471.04 0q-30.72 0-30.72-30.72l0 0q0-30.72 30.72-30.72Z" fill="#FFFFFF" />
                </svg>
              </button>

              <div className="absolute left-[80px] top-1/2 -translate-y-1/2 
                px-2.5 py-[7px] 
                bg-slate-900 dark:bg-slate-800
                text-white
                rounded-md text-sm whitespace-nowrap 
                opacity-0 group-hover:opacity-90 
                transition-opacity pointer-events-none
                shadow-lg max-md:hidden">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </div>

              <div className={`absolute left-[-2px] top-1/2 -translate-y-1/2 
                w-1 h-7 rounded-r-full
                bg-cyan-500
                transition-opacity duration-150
                max-md:hidden
                ${activeCategory === category ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          ))}
        </div>

        <div className="flex flex-none flex-col items-center gap-[7px] pt-[7px] max-md:flex-row max-md:pt-0">
          <div className="w-7 h-[2px] rounded-full
            bg-slate-200/80 dark:bg-white/10
            transition-colors duration-200 max-md:h-7 max-md:w-[2px] max-md:mx-1" />

          <button 
            onClick={() => setShowAddCategory(true)}
            className="h-11 w-11 rounded-2xl flex-shrink-0
              bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200
              hover:bg-emerald-500 hover:text-white
              flex items-center justify-center 
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
              focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
          >
            <span className="text-[22px]">+</span>
          </button>

          <button
            onClick={openSettings}
            className="h-11 w-11 rounded-2xl flex-shrink-0
              bg-white/70 text-slate-600 dark:bg-white/10 dark:text-slate-200
              hover:bg-white dark:hover:bg-white/15
              flex items-center justify-center 
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
              focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
            title="设置"
          >
            <Cog6ToothIcon className="h-[22px] w-[22px]" />
          </button>
        </div>
      </div>

      <Modal
        isOpen={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        title="添加新分类"
      >
        <AddCategoryForm
          onSubmit={handleAddCategory}
          onClose={() => setShowAddCategory(false)}
        />
      </Modal>

      <Modal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        title="删除分类"
      >
        {deletingCategory && (
          <div className="space-y-3.5">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              确定要删除分类 &quot;{deletingCategory}&quot; 吗？该分类下当前有 {deletingBookmarkCount} 个书签。
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleMoveAndDeleteCategory}
                disabled={!moveTargetCategory}
                className="rounded-xl bg-cyan-600 px-3.5 py-2 text-left text-sm font-semibold text-white
                  transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500
                  dark:disabled:bg-slate-800 dark:disabled:text-slate-500
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
              >
                移动书签到 {moveTargetCategory ?? '其他分类'} 后删除分类
              </button>

              <button
                type="button"
                onClick={handleDeleteCategory}
                className="rounded-xl bg-red-500 px-3.5 py-2 text-left text-sm font-semibold text-white
                  transition-colors hover:bg-red-600
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
              >
                连同该分类下书签一起删除
              </button>

              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="rounded-xl border border-white/70 bg-white/70 px-3.5 py-2 text-sm font-semibold
                  text-slate-700 transition-colors hover:bg-white
                  dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
} 

import { useState } from 'react';
import { useBookmarks } from '../contexts/BookmarkContext';
import { useCategories } from '../contexts/CategoryContext';
import SearchBar from '../components/SearchBar';
import BookmarkCard from '../components/BookmarkCard';
import ThemeToggle from '../components/ThemeToggle';
import Sidebar from '../components/Sidebar';
import Modal from '../components/Modal';
import AddBookmarkForm from '../components/AddBookmarkForm';
import BackToTop from '../components/BackToTop';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const { bookmarks, renameBookmarksCategory } = useBookmarks();
  const { categories, renameCategory } = useCategories();
  const [activeCategory] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [categoryError, setCategoryError] = useState('');

  // 根据选中的分类过滤书签
  const filteredCategories = activeCategory ? [activeCategory] : categories;

  const startCategoryEdit = (category: string) => {
    setEditingCategory(category);
    setCategoryDraft(category);
    setCategoryError('');
  };

  const cancelCategoryEdit = () => {
    setEditingCategory(null);
    setCategoryDraft('');
    setCategoryError('');
  };

  const saveCategoryEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingCategory) return;

    const nextCategory = categoryDraft.trim();
    if (!nextCategory) {
      setCategoryError('分类名不能为空');
      return;
    }

    const isDuplicate = categories.some(category =>
      category !== editingCategory && category.toLowerCase() === nextCategory.toLowerCase()
    );
    if (isDuplicate) {
      setCategoryError('分类名已存在');
      return;
    }

    if (nextCategory !== editingCategory) {
      renameCategory(editingCategory, nextCategory);
      renameBookmarksCategory(editingCategory, nextCategory);
    }

    cancelCategoryEdit();
  };

  return (
    <div className="relative min-h-screen min-w-screen overflow-x-hidden font-blackFont text-slate-900 transition-colors
      bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_32%),linear-gradient(135deg,#f8fafc,#eef2f7)]
      dark:text-slate-100 dark:bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.24),transparent_34%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_32%),linear-gradient(135deg,#020617,#0f172a)]">
      {/* 侧边栏 */}
      <Sidebar />

      <div className="absolute right-3.5 top-3.5 z-40 flex items-center gap-[7px]">
        <ThemeToggle />
      </div>

      {/* 主要内容区域 */}
      <div className="ml-[72px] pb-24 max-md:ml-0">
        <main className="container mx-auto px-3.5 pb-7 pt-5 max-md:pt-[72px]">
          <SearchBar />

          {/* 分类书签展示 */}
          <div className="mt-7 space-y-10">
            {filteredCategories.map(category => (
              <div key={category} id={`category-${category}`}>
                <div className="mb-5 px-[7px]">
                  {editingCategory === category ? (
                    <form
                      onSubmit={saveCategoryEdit}
                      className="flex flex-wrap items-center gap-2.5"
                    >
                      <input
                        type="text"
                        value={categoryDraft}
                        onChange={(event) => {
                          setCategoryDraft(event.target.value);
                          setCategoryError('');
                        }}
                        autoFocus
                        className="h-10 min-w-0 rounded-xl border border-cyan-300/70 bg-white/75 px-3
                          text-lg font-semibold text-slate-800 backdrop-blur-xl
                          dark:border-cyan-300/25 dark:bg-slate-900/45 dark:text-slate-100
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                          focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
                      />
                      <button
                        type="submit"
                        className="h-10 rounded-xl bg-cyan-600 px-3 text-sm font-semibold text-white
                          transition-colors hover:bg-cyan-500
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                          focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={cancelCategoryEdit}
                        className="h-10 rounded-xl border border-white/70 bg-white/70 px-3 text-sm font-semibold
                          text-slate-700 transition-colors hover:bg-white
                          dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                          focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
                      >
                        取消
                      </button>
                      {categoryError && (
                        <span className="text-sm font-semibold text-red-500">
                          {categoryError}
                        </span>
                      )}
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startCategoryEdit(category)}
                      className="rounded-xl px-2 py-1 text-left text-lg font-semibold text-slate-800
                        transition-colors hover:bg-white/55 hover:text-cyan-700
                        dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-cyan-200
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                        focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
                      title="点击改名"
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3.5 px-[7px] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                  {bookmarks
                    .filter(b => b.category === category)
                    .map(bookmark => (
                      <BookmarkCard key={bookmark.id} bookmark={bookmark} />
                    ))}
                  
                  {/* 添加书签按钮 */}
                  <button
                    onClick={() => setAddingCategory(category)}
                    className="flex h-20 w-full items-center justify-center rounded-2xl
                      border border-dashed border-cyan-300/80 bg-white/45 p-2.5
                      text-cyan-600 backdrop-blur-xl
                      hover:-translate-y-1 hover:bg-cyan-50/80
                      dark:border-cyan-300/25 dark:bg-slate-900/35 dark:text-cyan-200 dark:hover:bg-cyan-900/30
                      transition-transform transition-colors duration-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                      focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950
                      "
                  >
                    <PlusIcon className="h-[22px] w-[22px]" />
                  </button>
                </div>
              </div>
            ))}
          </div> 
        </main>
      </div>

      {/* 添加书签模态框 */}
      <Modal
        isOpen={!!addingCategory}
        onClose={() => setAddingCategory(null)}
        title="添加书签"
      >
        {addingCategory && (
          <AddBookmarkForm
            category={addingCategory}
            onClose={() => setAddingCategory(null)}
          />
        )}
      </Modal>

      <BackToTop />
    </div>
  );
} 

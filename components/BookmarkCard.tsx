import { useState } from 'react';
import Image from 'next/image';
import { ArrowUpIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useBookmarks } from '../contexts/BookmarkContext';
import type { Bookmark } from '../types';
import BookmarkForm from './BookmarkForm';
import Modal from './Modal';

interface BookmarkCardProps {
  bookmark: Bookmark;
}

export default function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const { removeBookmark, updateBookmarksOrder } = useBookmarks();
  const [showActions, setShowActions] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const getIconUrl = () => {
    if (imageError || !bookmark.icon) {
      return '/default.svg';
    }

    return bookmark.icon;
  };

  const handleDelete = () => {
    removeBookmark(bookmark.id as string);
    setShowDeleteModal(false);
  };

  const handlePin = (e: React.MouseEvent) => {
    e.preventDefault();
    updateBookmarksOrder(bookmark.id as string, bookmark.category);
  };

  const sanitizeContent = (content: string): string => {
    return content.replace(/[<>]/g, '').trim().slice(0, 100);
  };

  return (
    <>
      <div
        className="relative h-20 w-full min-w-0 cursor-pointer rounded-2xl
          border border-white/70 bg-white/70 p-2.5
          shadow-[0_12px_36px_-30px_rgba(15,23,42,0.75)]
          backdrop-blur-xl transition-transform transition-colors duration-200 ease-out
          group hover:-translate-y-1 hover:border-cyan-200/80
          dark:border-white/10 dark:bg-slate-900/45 dark:hover:border-cyan-300/25"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full items-center gap-2.5"
        >
          <div className="relative h-8 w-8 flex-shrink-0 rounded-xl bg-white/70 p-1.5 dark:bg-white/10">
            {isImageLoading && (
              <Image
                src="/loading.svg"
                alt=""
                fill
                sizes="32px"
                className="object-contain p-[7px] opacity-60"
              />
            )}
            <Image
              src={getIconUrl()}
              alt=""
              fill
              sizes="32px"
              loading="lazy"
              className={`object-contain p-1.5 transition-opacity duration-300 ${
                isImageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                setIsImageLoading(false);
                setImageError(true);
              }}
            />
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {sanitizeContent(bookmark.title)}
          </span>
        </a>

        {showActions && (
          <div className="absolute -right-[7px] -top-[7px] flex gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowEditModal(true);
              }}
              className="rounded-full border border-white/70 bg-white/90 p-[5px]
                opacity-0 shadow-sm transition-transform transition-opacity transition-colors duration-150
                scale-90 group-hover:scale-100 group-hover:opacity-100
                hover:bg-amber-50 dark:border-white/10 dark:bg-slate-800/90 dark:hover:bg-amber-900/40
                focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2
                focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
              title="编辑书签"
              aria-label="编辑书签"
            >
              <PencilSquareIcon className="h-3.5 w-3.5 text-amber-500" />
            </button>

            <button
              onClick={handlePin}
              className="rounded-full border border-white/70 bg-white/90 p-[5px]
                opacity-0 shadow-sm transition-transform transition-opacity transition-colors duration-150
                scale-90 group-hover:scale-100 group-hover:opacity-100
                hover:bg-cyan-50 dark:border-white/10 dark:bg-slate-800/90 dark:hover:bg-cyan-900/40
                focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2
                focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
              title="置顶书签"
              aria-label="置顶书签"
            >
              <ArrowUpIcon className="h-3.5 w-3.5 text-cyan-500" />
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                setShowDeleteModal(true);
              }}
              className="rounded-full border border-white/70 bg-white/90 p-[5px]
                opacity-0 shadow-sm transition-transform transition-opacity transition-colors duration-150
                scale-90 group-hover:scale-100 group-hover:opacity-100
                hover:bg-red-50 dark:border-white/10 dark:bg-slate-800/90 dark:hover:bg-red-900/40
                focus-visible:scale-100 focus-visible:opacity-100 focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-cyan-400/55 focus-visible:ring-offset-2
                focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
              title="删除书签"
              aria-label="删除书签"
            >
              <TrashIcon className="h-3.5 w-3.5 text-red-500" />
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="确认删除"
      >
        <div className="space-y-3.5">
          <p className="text-slate-600 dark:text-slate-300">
            确定要删除书签 &quot;{bookmark.title}&quot; 吗？
          </p>
          <div className="flex justify-end gap-2.5">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="rounded-xl border border-white/70 bg-white/70 px-3.5 py-[7px]
                text-slate-700 transition-colors hover:bg-white
                dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              className="rounded-xl bg-red-500 px-3.5 py-[7px] text-white transition-colors hover:bg-red-600
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑书签"
      >
        <BookmarkForm
          mode="edit"
          bookmark={bookmark}
          onClose={() => setShowEditModal(false)}
        />
      </Modal>
    </>
  );
}

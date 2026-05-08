import { useState } from 'react';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { searchEngines } from '../data/bookmarks';
import Image from 'next/image';

type SearchEngine = {
  id: string;
  name: string;
  icon: string;
  searchUrl: string;
};

export default function SearchBar() {
  const [selectedEngine, setSelectedEngine] = useState(searchEngines[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageError] = useState(false);
  // 添加图片加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOption, setIsLoadingOption] = useState(true);
  const getIconUrl = (value: SearchEngine) => {
    if (imageError || (!value.icon && !value.searchUrl)) {
      return '/default.svg';
    }
    if (value.icon) {
      return value.icon;
    }
    return `/default.svg`
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    window.open(`${selectedEngine.searchUrl}${encodeURIComponent(searchTerm)}`, '_blank');
  };

  return (
    <form onSubmit={handleSearch} className="relative z-[70] mx-auto w-full max-w-3xl p-3.5">
      <div className="flex flex-col gap-[7px] rounded-[22px] border border-white/70 bg-white/70 p-2.5
        shadow-[0_24px_70px_-45px_rgba(15,23,42,0.9)] backdrop-blur-2xl
        sm:flex-row dark:border-white/10 dark:bg-slate-900/45">
        {/* 上层容器：搜索引擎选择器和搜索按钮 */}
        <div className="flex justify-between sm:justify-start items-center gap-[7px] w-full sm:w-auto">
          {/* 搜索引擎选择器 */}
          <Listbox value={selectedEngine} onChange={setSelectedEngine}>
            {({ open }) => (
            <div className={`relative ${open ? 'z-[90]' : 'z-0'}`}>
              <Listbox.Button className="relative w-36 cursor-pointer rounded-2xl
                bg-white/70 py-[7px] pl-2.5 pr-7 text-left
                text-slate-800 transition-colors duration-150
                hover:bg-white dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950">
                <span className="block truncate">
                  <div className="flex items-center gap-5">
                    <Image 
                      src={getIconUrl(selectedEngine)} 
                      alt={''}
                      width={16}
                      height={16}
                      loading="lazy"
                      className={`w-4 h-4
                      transition-opacity duration-300
                      ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                      onLoad={() => setIsLoading(false)}
                    />
                    {/* 仅在加载时显示默认图标 */}
                    {/* Loading 图标 */}
                    {isLoading && (
                      <Image
                        src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNzM5Nzc3MzI3NzQ5IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjIzNDkiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiPjxwYXRoIGQ9Ik00NjkuMzMzMzMzIDg1LjMzMzMzM200Mi42NjY2NjcgMGwwIDBxNDIuNjY2NjY3IDAgNDIuNjY2NjY3IDQyLjY2NjY2N2wwIDEyOHEwIDQyLjY2NjY2Ny00Mi42NjY2NjcgNDIuNjY2NjY3bDAgMHEtNDIuNjY2NjY3IDAtNDIuNjY2NjY3LTQyLjY2NjY2N2wwLTEyOHEwLTQyLjY2NjY2NyA0Mi42NjY2NjctNDIuNjY2NjY3WiIgZmlsbD0iIzAwMDAwMCIgb3BhY2l0eT0iLjgiIHAtaWQ9IjIzNTAiPjwvcGF0aD48cGF0aCBkPSJNNDY5LjMzMzMzMyA3MjUuMzMzMzMzbTQyLjY2NjY2NyAwbDAgMHE0Mi42NjY2NjcgMCA0Mi42NjY2NjcgNDIuNjY2NjY3bDAgMTI4cTAgNDIuNjY2NjY3LTQyLjY2NjY2NyA0Mi42NjY2NjdsMCAwcS00Mi42NjY2NjcgMC00Mi42NjY2NjctNDIuNjY2NjY3bDAtMTI4cTAtNDIuNjY2NjY3IDQyLjY2NjY2Ny00Mi42NjY2NjdaIiBmaWxsPSIjMDAwMDAwIiBvcGFjaXR5PSIuNCIgcC1pZD0iMjM1MSI+PC9wYXRoPjxwYXRoIGQ9Ik05MzguNjY2NjY3IDQ2OS4zMzMzMzNtMCA0Mi42NjY2NjdsMCAwcTAgNDIuNjY2NjY3LTQyLjY2NjY2NyA0Mi42NjY2NjdsLTEyOCAwcS00Mi42NjY2NjcgMC00Mi42NjY2NjctNDIuNjY2NjY3bDAgMHEwLTQyLjY2NjY2NyA0Mi42NjY2NjctNDIuNjY2NjY3bDEyOCAwcTQyLjY2NjY2NyAwIDQyLjY2NjY2NyA0Mi42NjY2NjdaIiBmaWxsPSIjMDAwMDAwIiBvcGFjaXR5PSIuMiIgcC1pZD0iMjM1MiI+PC9wYXRoPjxwYXRoIGQ9Ik0yOTguNjY2NjY3IDQ2OS4zMzMzMzNtMCA0Mi42NjY2NjdsMCAwcTAgNDIuNjY2NjY3LTQyLjY2NjY2NyA0Mi42NjY2NjdsLTEyOCAwcS00Mi42NjY2NjcgMC00Mi42NjY2NjctNDIuNjY2NjY3bDAgMHEwLTQyLjY2NjY2NyA0Mi42NjY2NjctNDIuNjY2NjY3bDEyOCAwcTQyLjY2NjY2NyAwIDQyLjY2NjY2NyA0Mi42NjY2NjdaIiBmaWxsPSIjMDAwMDAwIiBvcGFjaXR5PSIuNiIgcC1pZD0iMjM1MyI+PC9wYXRoPjxwYXRoIGQ9Ik03ODMuNTMwNjY3IDE4MC4xMzg2NjdtMzAuMTY5ODg5IDMwLjE2OTg4OWwwIDBxMzAuMTY5ODg5IDMwLjE2OTg4OSAwIDYwLjMzOTc3OWwtOTAuNTA5NjY4IDkwLjUwOTY2OHEtMzAuMTY5ODg5IDMwLjE2OTg4OS02MC4zMzk3NzkgMGwwIDBxLTMwLjE2OTg4OS0zMC4xNjk4ODkgMC02MC4zMzk3NzlsOTAuNTA5NjY4LTkwLjUwOTY2OHEzMC4xNjk4ODktMzAuMTY5ODg5IDYwLjMzOTc3OSAwWiIgZmlsbD0iIzAwMDAwMCIgb3BhY2l0eT0iLjEiIHAtaWQ9IjIzNTQiPjwvcGF0aD48cGF0aCBkPSJNMzMwLjk2NTMzMyA2MzIuNjYxMzMzbTMwLjE2OTg5IDMwLjE2OTg5bDAgMHEzMC4xNjk4ODkgMzAuMTY5ODg5IDAgNjAuMzM5Nzc4bC05MC41MDk2NjggOTAuNTA5NjY4cS0zMC4xNjk4ODkgMzAuMTY5ODg5LTYwLjMzOTc3OSAwbDAgMHEtMzAuMTY5ODg5LTMwLjE2OTg4OSAwLTYwLjMzOTc3OGw5MC41MDk2NjgtOTAuNTA5NjY4cTMwLjE2OTg4OS0zMC4xNjk4ODkgNjAuMzM5Nzc5IDBaIiBmaWxsPSIjMDAwMDAwIiBvcGFjaXR5PSIuNSIgcC1pZD0iMjM1NSI+PC9wYXRoPjxwYXRoIGQ9Ik04NDMuODYxMzMzIDc4My41MzA2NjdtLTMwLjE2OTg4OSAzMC4xNjk4ODlsMCAwcS0zMC4xNjk4ODkgMzAuMTY5ODg5LTYwLjMzOTc3OSAwbC05MC41MDk2NjgtOTAuNTA5NjY4cS0zMC4xNjk4ODktMzAuMTY5ODg5IDAtNjAuMzM5Nzc5bDAgMHEzMC4xNjk4ODktMzAuMTY5ODg5IDYwLjMzOTc3OSAwbDkwLjUwOTY2OCA5MC41MDk2NjhxMzAuMTY5ODg5IDMwLjE2OTg4OSAwIDYwLjMzOTc3OVoiIGZpbGw9IiMwMDAwMDAiIG9wYWNpdHk9Ii4zIiBwLWlkPSIyMzU2Ij48L3BhdGg+PHBhdGggZD0iTTM5MS4zMzg2NjcgMzMwLjk2NTMzM20tMzAuMTY5ODkgMzAuMTY5ODlsMCAwcS0zMC4xNjk4ODkgMzAuMTY5ODg5LTYwLjMzOTc3OCAwbC05MC41MDk2NjgtOTAuNTA5NjY4cS0zMC4xNjk4ODktMzAuMTY5ODg5IDAtNjAuMzM5Nzc5bDAgMHEzMC4xNjk4ODktMzAuMTY5ODg5IDYwLjMzOTc3OCAwbDkwLjUwOTY2OCA5MC41MDk2NjhxMzAuMTY5ODg5IDMwLjE2OTg4OSAwIDYwLjMzOTc3OVoiIGZpbGw9IiMwMDAwMDAiIG9wYWNpdHk9Ii43IiBwLWlkPSIyMzU3Ij48L3BhdGg+PC9zdmc+"
                        alt={''}
                        width={16}
                        height={16}
                        className="w-4 h-4 ml-[-16px]"
                      />
                    )}
                    <span>{selectedEngine.name}</span>
                  </div>
                </span>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              
              <Listbox.Options className="absolute left-0 top-full z-[120] mt-[7px] max-h-[min(22rem,calc(100vh-9rem))] w-full overflow-y-auto rounded-2xl
                border border-white/70 bg-white/95 py-1 shadow-xl backdrop-blur-2xl
                dark:border-white/10 dark:bg-slate-900/95">
                {searchEngines.map((engine) => (
                  <Listbox.Option
                    key={engine.id}
                    value={engine}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-[7px] pl-9 pr-3.5
                      ${active 
                        ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' 
                        : 'text-slate-900 dark:text-slate-100'}`
                    }
                  >
                    {({ selected }) => (
                      <>
                        <div className="flex items-center gap-[7px]">
                          <Image 
                            src={getIconUrl(engine)} 
                            alt={engine.name || ''}
                            width={16}
                            height={16}
                            loading="lazy"
                            className={`w-4 h-4
                            transition-opacity duration-300
                            ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                            onLoad={() => setIsLoadingOption(false)}
                          />
                          {/* 仅在加载时显示默认图标 */}
                          {isLoadingOption && (
                            <Image 
                              src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNzM5Nzc3MzI3NzQ5IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjIzNDkiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiPjxwYXRoIGQ9Ik00NjkuMzMzMzMzIDg1LjMzMzMzM200Mi42NjY2NjcgMGwwIDBxNDIuNjY2NjY3IDAgNDIuNjY2NjY3IDQyLjY2NjY2N2wwIDEyOHEwIDQyLjY2NjY2Ny00Mi42NjY2NjcgNDIuNjY2NjY3bDAgMHEtNDIuNjY2NjY3IDAtNDIuNjY2NjY3LTQyLjY2NjY2N2wwLTEyOHEwLTQyLjY2NjY2NyA0Mi42NjY2NjctNDIuNjY2NjY3WiIgZmlsbD0iIzAwMDAwMCIgb3BhY2l0eT0iLjgiIHAtaWQ9IjIzNTAiPjwvcGF0aD48cGF0aCBkPSJNNDY5LjMzMzMzMyA3MjUuMzMzMzMzbTQyLjY2NjY2NyAwbDAgMHE0Mi42NjY2NjcgMCA0Mi42NjY2NjcgNDIuNjY2NjY3bDAgMTI4cTAgNDIuNjY2NjY3LTQyLjY2NjY2NyA0Mi42NjY2NjdsMCAwcS00Mi42NjY2NjcgMC00Mi42NjY2NjctNDIuNjY2NjY3bDAtMTI4cTAtNDIuNjY2NjY3IDQyLjY2NjY2Ny00Mi42NjY2NjdaIiBmaWxsPSIjMDAwMDAwIiBvcGFjaXR5PSIuNCIgcC1pZD0iMjM1MSI+PC9wYXRoPjxwYXRoIGQ9Ik05MzguNjY2NjY3IDQ2OS4zMzMzMzNtMCA0Mi42NjY2NjdsMCAwcTAgNDIuNjY2NjY3LTQyLjY2NjY2NyA0Mi42NjY2NjdsLTEyOCAwcS00Mi42NjY2NjcgMC00Mi42NjY2NjctNDIuNjY2NjY3bDAgMHEwLTQyLjY2NjY2NyA0Mi42NjY2NjctNDIuNjY2NjY3bDEyOCAwcTQyLjY2NjY2NyAwIDQyLjY2NjY2NyA0Mi42NjY2NjdaIiBmaWxsPSIjMDAwMDAwIiBvcGFjaXR5PSIuMiIgcC1pZD0iMjM1MiI+PC9wYXRoPjxwYXRoIGQ9Ik0yOTguNjY2NjY3IDQ2OS4zMzMzMzNtMCA0Mi42NjY2NjdsMCAwcTAgNDIuNjY2NjY3LTQyLjY2NjY2NyA0Mi42NjY2NjdsLTEyOCAwcS00Mi42NjY2NjcgMC00Mi42NjY2NjctNDIuNjY2NjY3bDAgMHEwLTQyLjY2NjY2NyA0Mi42NjY2NjctNDIuNjY2NjY3bDEyOCAwcTQyLjY2NjY2NyAwIDQyLjY2NjY2NyA0Mi42NjY2NjdaIiBmaWxsPSIjMDAwMDAwIiBvcGFjaXR5PSIuNiIgcC1pZD0iMjM1MyI+PC9wYXRoPjxwYXRoIGQ9Ik03ODMuNTMwNjY3IDE4MC4xMzg2NjdtMzAuMTY5ODg5IDMwLjE2OTg4OWwwIDBxMzAuMTY5ODg5IDMwLjE2OTg4OSAwIDYwLjMzOTc3OWwtOTAuNTA5NjY4IDkwLjUwOTY2OHEtMzAuMTY5ODg5IDMwLjE2OTg4OS02MC4zMzk3NzkgMGwwIDBxLTMwLjE2OTg4OS0zMC4xNjk4ODkgMC02MC4zMzk3NzlsOTAuNTA5NjY4LTkwLjUwOTY2OHEzMC4xNjk4ODktMzAuMTY5ODg5IDYwLjMzOTc3OSAwWiIgZmlsbD0iIzAwMDAwMCIgb3BhY2l0eT0iLjEiIHAtaWQ9IjIzNTQiPjwvcGF0aD48cGF0aCBkPSJNMzMwLjk2NTMzMyA2MzIuNjYxMzMzbTMwLjE2OTg5IDMwLjE2OTg5bDAgMHEzMC4xNjk4ODkgMzAuMTY5ODg5IDAgNjAuMzM5Nzc4bC05MC41MDk2NjggOTAuNTA5NjY4cS0zMC4xNjk4ODkgMzAuMTY5ODg5LTYwLjMzOTc3OSAwbDAgMHEtMzAuMTY5ODg5LTMwLjE2OTg4OSAwLTYwLjMzOTc3OGw5MC41MDk2NjgtOTAuNTA5NjY4cTMwLjE2OTg4OS0zMC4xNjk4ODkgNjAuMzM5Nzc5IDBaIiBmaWxsPSIjMDAwMDAwIiBvcGFjaXR5PSIuNSIgcC1pZD0iMjM1NSI+PC9wYXRoPjxwYXRoIGQ9Ik04NDMuODYxMzMzIDc4My41MzA2NjdtLTMwLjE2OTg4OSAzMC4xNjk4ODlsMCAwcS0zMC4xNjk4ODkgMzAuMTY5ODg5LTYwLjMzOTc3OSAwbC05MC41MDk2NjgtOTAuNTA5NjY4cS0zMC4xNjk4ODktMzAuMTY5ODg5IDAtNjAuMzM5Nzc5bDAgMHEzMC4xNjk4ODktMzAuMTY5ODg5IDYwLjMzOTc3OSAwbDkwLjUwOTY2OCA5MC41MDk2NjhxMzAuMTY5ODg5IDMwLjE2OTg4OSAwIDYwLjMzOTc3OVoiIGZpbGw9IiMwMDAwMDAiIG9wYWNpdHk9Ii4zIiBwLWlkPSIyMzU2Ij48L3BhdGg+PHBhdGggZD0iTTM5MS4zMzg2NjcgMzMwLjk2NTMzM20tMzAuMTY5ODkgMzAuMTY5ODlsMCAwcS0zMC4xNjk4ODkgMzAuMTY5ODg5LTYwLjMzOTc3OCAwbC05MC41MDk2NjgtOTAuNTA5NjY4cS0zMC4xNjk4ODktMzAuMTY5ODg5IDAtNjAuMzM5Nzc5bDAgMHEzMC4xNjk4ODktMzAuMTY5ODg5IDYwLjMzOTc3OCAwbDkwLjUwOTY2OCA5MC41MDk2NjhxMzAuMTY5ODg5IDMwLjE2OTg4OSAwIDYwLjMzOTc3OVoiIGZpbGw9IiMwMDAwMDAiIG9wYWNpdHk9Ii43IiBwLWlkPSIyMzU3Ij48L3BhdGg+PC9zdmc+"
                              alt={''}
                              width={16}
                              height={16}
                              className="w-4 h-4 ml-[-16px]"
                            />
                          )}
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {engine.name}
                          </span>
                        </div>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-500">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
            )}
          </Listbox>

          {/* 搜索按钮 - 移动端显示在右侧 */}
          <button 
            type="submit"
            className="px-3.5 py-[7px] rounded-lg
              bg-cyan-600
              text-white
              hover:bg-cyan-500
              active:scale-98
              transition-colors duration-150
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
              focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950
              whitespace-nowrap"
          >
            搜索
          </button>
        </div>

        {/* 搜索输入框 - 移动端显示在第二行 */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="输入关键词搜索..."
          className="flex-1 py-[7px] px-2.5 rounded-lg
            bg-white/70 dark:bg-white/10
            text-slate-800 dark:text-slate-100
            placeholder-slate-400 dark:placeholder-slate-500
            border-none outline-none
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
            focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950
            transition-colors duration-150"
        />
      </div>
    </form>
  );
}

import { useState, useEffect } from 'react';
import { ArrowUpIcon } from '@heroicons/react/24/outline';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // 监听滚动事件
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // 滚动到顶部
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-[22px] right-[22px] rounded-full border border-white/70
        bg-white/75 p-2.5 shadow-xl backdrop-blur-2xl
        hover:scale-110 hover:bg-white
        dark:border-white/10 dark:bg-slate-900/70 dark:hover:bg-slate-800
        max-md:bottom-24
        transition-transform transition-opacity transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
        focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}
        z-50`}
    >
      <ArrowUpIcon className="h-[22px] w-[22px] text-cyan-500" />
    </button>
  );
} 

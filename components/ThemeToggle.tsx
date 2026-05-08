import { useTheme } from '../contexts/ThemeContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

// 主题切换组件
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-2xl border border-white/70 bg-white/70 p-[7px]
        transition-colors hover:bg-white dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
        focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950"
      title="切换主题"
    >
      {theme === 'dark' ? (
        <SunIcon className="h-[22px] w-[22px] text-amber-400" />
      ) : (
        <MoonIcon className="h-[22px] w-[22px] text-slate-600" />
      )}
    </button>
  );
} 

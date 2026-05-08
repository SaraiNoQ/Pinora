import { createContext, useContext, useEffect, useState } from 'react';
import {
  getStorageErrorMessage,
  getStoredValue,
  getSystemTheme,
  setStoredValue,
  ThemeName,
} from '../lib/storage';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const applyTheme = (theme: ThemeName) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getStoredValue('theme')
      .then((storedTheme) => {
        if (!isMounted) return;

        const nextTheme = storedTheme ?? getSystemTheme();
        setThemeState(nextTheme);
        applyTheme(nextTheme);
        setIsLoaded(true);
      })
      .catch((error) => {
        if (!isMounted) return;

        console.error('读取主题失败：', error);
        const nextTheme = getSystemTheme();
        setThemeState(nextTheme);
        applyTheme(nextTheme);
        setIsLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = (nextTheme: ThemeName) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);

    setStoredValue('theme', nextTheme).catch((error) => {
      console.error('保存主题失败：', error);
      alert(`保存主题失败：${getStorageErrorMessage(error)}`);
    });
  };

  useEffect(() => {
    if (isLoaded) {
      applyTheme(theme);
    }
  }, [isLoaded, theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

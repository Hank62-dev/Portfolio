import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'theme';
const THEMES = ['dark', 'light'];
const META_COLOR = { dark: '#0b0c0e', light: '#f4f0e8' };

// The site is dark unless someone chooses otherwise. The operating-system setting is deliberately ignored.
const readStored = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(saved) ? saved : 'dark';
  } catch {
    return 'dark';
  }
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const { pathname } = useLocation();
  const [chosen, setChosen] = useState(readStored);
  // The workspace's 3D floor is drawn for the dark palette only, so it always stays dark.
  const theme = pathname === '/spacehank' ? 'dark' : chosen;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme]);
  }, [theme]);

  const toggle = useCallback(() => {
    const root = document.documentElement;
    // Cross-fade the colours for a moment, then drop the rule: a global transition is costly to keep.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('theme-switching');
      window.setTimeout(() => root.classList.remove('theme-switching'), 700);
    }
    setChosen((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* the choice still applies for this visit */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
};

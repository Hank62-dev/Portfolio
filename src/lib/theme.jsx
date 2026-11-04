import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { isMode, nextSwitch, resolveTheme } from './themeMode';

const STORAGE_KEY = 'theme';
const META_COLOR = { dark: '#0b0c0e', light: '#f4f0e8' };

// Dark unless someone chooses otherwise. The operating-system setting is deliberately ignored; "auto" follows the clock instead.
const readStored = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isMode(saved) ? saved : 'dark';
  } catch {
    return 'dark';
  }
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [mode, setModeState] = useState(readStored);
  const [clock, setClock] = useState(() => new Date());
  const theme = resolveTheme(mode, clock);

  // In auto, look again when the day turns to night (or back), and when the page comes back to the front after sleeping.
  useEffect(() => {
    if (mode !== 'auto') return undefined;
    let timer;
    const arm = () => {
      window.clearTimeout(timer);
      const now = new Date();
      setClock(now);
      // setTimeout cannot wait more than ~24 days, and a sleeping laptop stretches it: re-check at most every 30 minutes
      timer = window.setTimeout(arm, Math.min(nextSwitch(now) - now + 1000, 30 * 60 * 1000));
    };
    arm();
    const onShow = () => document.visibilityState === 'visible' && arm();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [mode]);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme]);
  }, [theme]);

  // Cross-fade the colours for a moment, then drop the rule: a global transition is costly to keep.
  const fade = useCallback(() => {
    const root = document.documentElement;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('theme-switching');
      window.setTimeout(() => root.classList.remove('theme-switching'), 700);
    }
  }, []);

  const setMode = useCallback(
    (next) => {
      if (!isMode(next)) return;
      if (resolveTheme(next) !== resolveTheme(mode)) fade();
      setClock(new Date());
      setModeState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* the choice still applies for this visit */
      }
    },
    [fade, mode]
  );

  // the pull cord and the plain button: flip whatever is showing, and keep that as a fixed choice
  const toggle = useCallback(() => setMode(theme === 'dark' ? 'light' : 'dark'), [setMode, theme]);

  const value = useMemo(() => ({ theme, mode, setMode, toggle }), [theme, mode, setMode, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
};

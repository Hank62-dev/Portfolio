import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { copy } from '../data/copy';

const STORAGE_KEY = 'lang';
const SUPPORTED = ['en', 'vi'];

const readInitial = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
  } catch {
    /* storage unavailable — fall through */
  }
  return navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
};

const LangContext = createContext(null);

export const LangProvider = ({ children }) => {
  const [lang, setLangState] = useState(readInitial);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      c: copy[lang],
      // Pick the current language from a { en, vi } field; plain strings pass through.
      t: (field) => (field && typeof field === 'object' ? field[lang] ?? field.en : field),
    }),
    [lang, setLang]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
};

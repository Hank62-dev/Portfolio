import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { i18n } from '../shared/i18n/i18n';
import { LANGS, storeLang, storedLang } from '../shared/i18n/language';
import { copy } from './data/copy';

// The portfolio's words are a whole page of content per language (data/copy.js), read as one object (`c`). It holds
// formatters as well as text (c.stack.used(3)), which i18next's JSON-only texts cannot keep, so it is read as it is; the
// language itself is the app's one choice (shared/i18n), and switching it here, in place, switches i18next too.

const LangContext = createContext(null);

export const LangProvider = ({ children }) => {
  const [lang, setLangState] = useState(storedLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => {
    if (!LANGS.includes(next)) return;
    setLangState(next);
    storeLang(next);
    void i18n.changeLanguage(next);
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

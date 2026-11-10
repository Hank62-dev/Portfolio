// The one language choice the site and the workspace share: `lang` in localStorage, else the browser's own language.

export const LANGS = ['en', 'vi'];
export const LANG_KEY = 'lang';

/** The language chosen on this device (read each time), or the browser's when none is kept or storage is blocked. */
export const storedLang = () => {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    /* storage is blocked: fall through to the browser's own language */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
};

/** Keeps the choice on this device; when storage is blocked it lasts until the page closes. */
export const storeLang = (lang) => {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* the choice lasts only until the page closes */
  }
};

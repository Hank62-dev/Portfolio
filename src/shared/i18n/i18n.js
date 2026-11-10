import i18next from 'i18next';
import { LANGS, storedLang } from './language.js';

// The one i18next of the whole app, and so the one language. Each part adds its own texts as a namespace when it loads (the
// workspace its tables as "spacehank", Hank RAG its keyed texts, the shared components their few words as "shared"), so a
// page carries only the texts of the part it shows.
//
// A key is the text itself, written once in the language it was first written in ("Wrong access key.", "Trang trước"), so
// keys hold dots and colons as plain characters, and a text with no entry in a language is shown as it is: there is no
// falling back to another language.
//
// Plain Node reads this file too (the server shares the workspace's texts), so its imports name their files in full, and
// React's binding is added by the one part that renders with it (spacehank/core/i18n/i18n.js).

export const i18n = i18next.createInstance();

i18n.init({
  resources: {},
  lng: storedLang(),
  supportedLngs: LANGS,
  fallbackLng: false,
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  initAsync: false, // everything is already in memory: ready the moment this module has run
});

/** Adds a namespace of texts in both languages: `{ en: { key: text }, vi: { key: text } }`. */
export const addTexts = (namespace, tables) => {
  for (const lang of LANGS) i18n.addResourceBundle(lang, namespace, tables[lang] ?? {}, false, true);
};

export default i18n;

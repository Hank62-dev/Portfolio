// Two languages for the whole workspace: English and Vietnamese. Every piece of text in the interface is written once, in
// the language it was first written in, and passed through `tr()`, which looks the text up in the other language's table and
// gives the text back unchanged when there is no entry. Switching the language reloads the page, so text that is built once
// at load (lists of tabs, labels) is also right, and nothing has to re-render by hand.
//
// The choice is the same one the portfolio site keeps (`lang` in localStorage), so the two always agree. The texts are looked
// up by i18next, with the text itself as the key.

import { addTexts, i18n } from '../../../shared/i18n/i18n.js';
import { LANGS, storeLang, storedLang } from '../../../shared/i18n/language.js';
import { en } from './locale/en.js';
import { vi } from './locale/vi.js';

export { LANGS };

// the workspace's texts are the "spacehank" namespace of the app's one i18next (see shared/i18n)
const NAMESPACE = 'spacehank';
addTexts(NAMESPACE, { en, vi });

// a test can ask for a language before anything is imported (see src/test/setup.js)
const readInitial = () => (LANGS.includes(globalThis.__HANK_LANG__) ? globalThis.__HANK_LANG__ : storedLang());

let current = readInitial();
let lookUp = i18n.getFixedT(current, NAMESPACE);
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const getLang = () => current;

/** Dates and numbers follow the language. */
export const locale = () => (current === 'vi' ? 'vi-VN' : 'en-GB');

/** Chooses the language and reloads, so everything on screen is rebuilt in it. */
export const setLang = (next) => {
  if (!LANGS.includes(next) || next === current) return;
  storeLang(next);
  current = next;
  lookUp = i18n.getFixedT(current, NAMESPACE);
  if (typeof window !== 'undefined') window.location.reload();
};

/** The text in the current language. `{0}`, `{1}`… in it are replaced by the extra arguments, in whatever order the language needs. */
export const tr = (text, ...args) => {
  if (typeof text !== 'string') return text;
  const found = text === '' ? '' : lookUp(text);
  return args.length ? found.replace(/\{(\d+)\}/g, (whole, i) => (args[i] === undefined ? whole : args[i])) : found;
};

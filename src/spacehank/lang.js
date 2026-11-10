// Two languages for the whole workspace: English and Vietnamese. Every piece of text in the interface is written once, in
// the language it was first written in, and passed through `tr()`, which looks the text up in the other language's table and
// gives the text back unchanged when there is no entry. Switching the language reloads the page, so text that is built once
// at load (lists of tabs, labels) is also right, and nothing has to re-render by hand.
//
// The choice is the same one the portfolio site keeps (`lang` in localStorage), so the two always agree.

import { en } from './locale/en.js';
import { vi } from './locale/vi.js';

const STORAGE_KEY = 'lang';
export const LANGS = ['en', 'vi'];

const readInitial = () => {
  // a test can ask for a language before anything is imported (see src/test/setup.js)
  if (LANGS.includes(globalThis.__HANK_LANG__)) return globalThis.__HANK_LANG__;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    /* storage is blocked: fall through to the browser's own language */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
};

let current = readInitial();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const getLang = () => current;

/** Dates and numbers follow the language. */
export const locale = () => (current === 'vi' ? 'vi-VN' : 'en-GB');

/** Chooses the language and reloads, so everything on screen is rebuilt in it. */
export const setLang = (next) => {
  if (!LANGS.includes(next) || next === current) return;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* the choice lasts only until the page closes */
  }
  current = next;
  if (typeof window !== 'undefined') window.location.reload();
};

const table = () => (current === 'vi' ? vi : en);

/** The text in the current language. `{0}`, `{1}`… in it are replaced by the extra arguments, in whatever order the language needs. */
export const tr = (text, ...args) => {
  if (typeof text !== 'string') return text;
  const found = table()[text] ?? text;
  return args.length ? found.replace(/\{(\d+)\}/g, (whole, i) => (args[i] === undefined ? whole : args[i])) : found;
};

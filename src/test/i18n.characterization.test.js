import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

// A picture of every piece of text the app shows, as it was before the three ways of translating were folded into one
// (i18next). Each language gives the same text for the same key afterwards, or this fails. The pictures are hashes, so this
// file stays small: RECORD_I18N=1 prints them again, to compare and to find which part moved.

const RECORD = Boolean(globalThis.process?.env.RECORD_I18N);
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);

// SpaceHank's tr(): every key either table knows, in each language (the language is chosen once, as the module loads)
const trIn = async (lang) => {
  vi.resetModules();
  globalThis.__HANK_LANG__ = lang;
  const { tr } = await import('@/spacehank/lang');
  const { vi: viTable } = await import('@/spacehank/locale/vi');
  const { en: enTable } = await import('@/spacehank/locale/en');
  const keys = [...new Set([...Object.keys(viTable), ...Object.keys(enTable)])].sort();
  return { tr, keys, out: Object.fromEntries(keys.map((k) => [k, tr(k)])) };
};

const EXPECTED = {
  trKeys: 2526,
  trEn: '7fcb13565f7d83d5',
  trVi: '7f846a2e22139526',
  copyEn: '2f01cc9e76859d63',
  copyVi: 'f0a17c79389849e5',
  ragEn: 'f16801d9891a1899',
  ragVi: '65bca26aa76f8a4f',
};

describe('every text, as it was before the translations were folded into one', () => {
  afterEach(() => {
    delete globalThis.__HANK_LANG__;
  });

  it("SpaceHank's tr() gives the same text for every key, in both languages", async () => {
    const en = await trIn('en');
    const viet = await trIn('vi');
    const seen = { trKeys: en.keys.length, trEn: hash(en.out), trVi: hash(viet.out) };
    if (RECORD) console.log('tr', JSON.stringify(seen));
    else expect(seen).toEqual({ trKeys: EXPECTED.trKeys, trEn: EXPECTED.trEn, trVi: EXPECTED.trVi });
  });

  it('tr() fills {0}, {1}… in any order, keeps a missing one, and gives unknown text back as it is', async () => {
    const { tr } = await trIn('en');
    expect(tr('No such text {1} then {0}', 'a', 'b')).toBe('No such text b then a');
    expect(tr('Only {0} and {1}', 'one')).toBe('Only one and {1}');
    expect(tr(42)).toBe(42);
    expect(tr('Trang trước')).toBe('Previous page');
    const { tr: trVi } = await trIn('vi');
    expect(trVi('Turn right')).toBe('Xoay sang phải');
    expect(trVi('Trang trước')).toBe('Trang trước');
  });

  it("the portfolio's copy is the same in both languages", async () => {
    const { copy } = await import('@/portfolio/data/copy');
    const seen = { copyEn: hash(copy.en), copyVi: hash(copy.vi) };
    if (RECORD) console.log('copy', JSON.stringify(seen));
    else expect(seen).toEqual({ copyEn: EXPECTED.copyEn, copyVi: EXPECTED.copyVi });
  });

  it("Hank RAG's keyed texts (rag.*, chat.*) are the same in both languages", async () => {
    vi.resetModules();
    const { default: i18n } = await import('@/spacehank/i18n');
    const keys = Object.keys(i18n.getResourceBundle('en', 'translation')).sort();
    const say = async (lang) => {
      await i18n.changeLanguage(lang);
      return Object.fromEntries(keys.map((k) => [k, i18n.t(k)]));
    };
    const seen = { ragEn: hash(await say('en')), ragVi: hash(await say('vi')) };
    if (RECORD) console.log('rag', JSON.stringify(seen));
    else expect(seen).toEqual({ ragEn: EXPECTED.ragEn, ragVi: EXPECTED.ragVi });
  });
});

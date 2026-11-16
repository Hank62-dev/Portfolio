import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { MAX_LIVE, createWhispers, parseWhisper } from './services/whispers.mjs';

const pglite = () => {
  const db = new PGlite();
  return { query: (text, params) => db.query(text, params) };
};

describe('parseWhisper', () => {
  it('keeps a short plain line and tidies its white space', () => {
    expect(parseWhisper({ message: '  hello\n\tthere  ', x: 0.25, y: 0.5, country: 'vn' })).toEqual({ message: 'hello there', country: 'VN', x: 0.25, y: 0.5 });
  });

  it('refuses empty, long, linked and off-sky whispers', () => {
    expect(() => parseWhisper({ message: '   ', x: 0.5, y: 0.5 })).toThrow('few words');
    expect(() => parseWhisper({ message: 'a'.repeat(81), x: 0.5, y: 0.5 })).toThrow('under 80');
    expect(() => parseWhisper({ message: 'visit https://spam.example', x: 0.5, y: 0.5 })).toThrow('No links');
    expect(() => parseWhisper({ message: 'buy at cheap.com', x: 0.5, y: 0.5 })).toThrow('No links');
    expect(() => parseWhisper({ message: 'hi', x: 2, y: 0.5 })).toThrow('sky');
  });

  it('drops a country that is not a two-letter code', () => {
    expect(parseWhisper({ message: 'hi', x: 0, y: 1, country: '<b>' }).country).toBeNull();
  });
});

describe('createWhispers', () => {
  it('lets one visitor light one flame per window', async () => {
    let now = 1000;
    const whispers = createWhispers({ now: () => now });
    await whispers.add('a', { message: 'first', x: 0.1, y: 0.1 });
    await expect(whispers.add('a', { message: 'again', x: 0.1, y: 0.1 })).rejects.toThrow('ten minutes');
    await whispers.add('b', { message: 'someone else', x: 0.2, y: 0.2 });
    now += 11 * 60 * 1000;
    await whispers.add('a', { message: 'later', x: 0.3, y: 0.3 });
    expect((await whispers.list()).map((w) => w.message)).toEqual(['later', 'someone else', 'first']);
  });

  it('keeps only the newest in the database, and the owner can put one out', async () => {
    let now = 0;
    const whispers = createWhispers({ db: pglite(), now: () => (now += 1) });
    for (let i = 0; i < MAX_LIVE + 3; i += 1) await whispers.add(`v${i}`, { message: `w${i}`, x: 0.5, y: 0.5 });
    const list = await whispers.list();
    expect(list).toHaveLength(MAX_LIVE);
    expect(list[0].message).toBe(`w${MAX_LIVE + 2}`);
    await whispers.remove(list[0].id);
    expect((await whispers.list())[0].message).toBe(`w${MAX_LIVE + 1}`);
  });
});

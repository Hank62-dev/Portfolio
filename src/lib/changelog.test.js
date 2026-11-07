import { describe, expect, it } from 'vitest';
import { changeText, cleanChanges, newerThan } from './changelog';

const list = [
  { id: 'c', date: '2026-11-07', vi: 'Ba', en: 'Three' },
  { id: 'b', date: '2026-11-06', vi: 'Hai', en: 'Two' },
  { id: 'a', date: '2026-11-05', vi: 'Một', en: 'One' },
];

describe('what is new', () => {
  it('is everything above the entry the app already has, newest first', () => {
    expect(newerThan(list, 'a').map((e) => e.id)).toEqual(['c', 'b']);
    expect(newerThan(list, 'b').map((e) => e.id)).toEqual(['c']);
    expect(newerThan(list, 'c')).toEqual([]);
  });

  it('is only the latest few when the app is too old to find its place in the list', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: `n${i}`, vi: `v${i}`, en: `e${i}` }));
    expect(newerThan(many, 'gone').map((e) => e.id)).toEqual(['n0', 'n1', 'n2', 'n3', 'n4', 'n5']);
    expect(newerThan(many, '', 2).map((e) => e.id)).toEqual(['n0', 'n1']);
  });

  it('stops at the version it describes, when the list is already ahead of it', () => {
    expect(newerThan(list, 'a', 6, 'b').map((e) => e.id)).toEqual(['b']);
    expect(newerThan(list, 'a', 6, 'c').map((e) => e.id)).toEqual(['c', 'b']);
    expect(newerThan(list, 'a', 6, 'missing').map((e) => e.id)).toEqual(['c', 'b']);
  });

  it('survives a file that is not what it should be', () => {
    expect(newerThan(null, 'a')).toEqual([]);
    expect(newerThan('nonsense', 'a')).toEqual([]);
    expect(cleanChanges([{ id: 'ok', en: 'Fine' }, null, 7, { id: 1, en: 'x' }, { en: 'no id' }, { id: 'long', en: 'x'.repeat(500) }]).map((e) => e.id)).toEqual(['ok', 'long']);
    expect(cleanChanges([{ id: 'long', en: 'x'.repeat(500) }])[0].en).toHaveLength(240);
  });

  it('falls back to the other language when one is missing, and picks the reader’s', () => {
    expect(cleanChanges([{ id: 'x', en: 'Only English' }])[0].vi).toBe('Only English');
    expect(changeText(list[0], true)).toBe('Ba');
    expect(changeText(list[0], false)).toBe('Three');
  });
});

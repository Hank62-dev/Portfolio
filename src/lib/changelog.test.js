import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { changeText, cleanChanges, compareVersions, newerThan, parseVersion } from './changelog';

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

describe('versions', () => {
  it('reads and orders major.minor.patch', () => {
    expect(parseVersion('1.23.0')).toEqual([1, 23, 0]);
    expect(parseVersion('v1.2')).toBeNull();
    expect(compareVersions('1.9.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('1.19.2', '1.19.1')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
    expect(cleanChanges([{ id: 'a', version: '1.2.3', en: 'x' }, { id: 'b', version: 'soon', en: 'y' }]).map((e) => e.version)).toEqual(['1.2.3', '']);
  });

  it('gives every update in the real list its own version, each newer than the one below it, the newest the app’s own', () => {
    const entries = JSON.parse(readFileSync(new URL('../../public/changelog.json', import.meta.url), 'utf8'));
    const app = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    for (const entry of entries) expect(parseVersion(entry.version), entry.id).not.toBeNull();
    for (let i = 1; i < entries.length; i += 1) expect(compareVersions(entries[i - 1].version, entries[i].version), entries[i - 1].id).toBeGreaterThan(0);
    expect(entries[0].version).toBe(app.version);
  });
});

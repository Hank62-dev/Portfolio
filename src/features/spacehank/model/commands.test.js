import { describe, expect, it } from 'vitest';
import { filterCommands, scoreText } from './commands';

describe('scoreText', () => {
  it('ranks exact, prefix, word-start, substring and in-order matches, in that order', () => {
    const exact = scoreText('music', 'music');
    const prefix = scoreText('mus', 'music player');
    const word = scoreText('play', 'music player');
    const inside = scoreText('usi', 'music player');
    const loose = scoreText('mpl', 'music player');
    expect([exact, prefix, word, inside, loose].every((n) => n > 0)).toBe(true);
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(word);
    expect(word).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(loose);
  });

  it('ignores case and accents, so Vietnamese titles are findable without them', () => {
    expect(scoreText('nhac', 'Nhạc của tôi')).toBeGreaterThan(0);
    expect(scoreText('DONG', 'Đông')).toBeGreaterThan(0);
  });

  it('is zero when the letters are not there in order', () => {
    expect(scoreText('zq', 'music')).toBe(0);
    expect(scoreText('cim', 'music')).toBe(0);
  });
});

describe('filterCommands', () => {
  const commands = [
    { id: 'floor', label: 'Open the company floor', keywords: 'space agents 3d' },
    { id: 'music', label: 'Hank Music', keywords: 'songs player' },
    { id: 'studio', label: 'Image Studio', keywords: 'picture generate' },
    { id: 'lock', label: 'Lock workspace' },
  ];

  it('keeps the given order for an empty query', () => {
    expect(filterCommands(commands, '').map((c) => c.id)).toEqual(['floor', 'music', 'studio', 'lock']);
  });

  it('finds by label or keyword and puts the closest first', () => {
    expect(filterCommands(commands, 'mus')[0].id).toBe('music');
    expect(filterCommands(commands, 'picture').map((c) => c.id)).toEqual(['studio']);
    expect(filterCommands(commands, 'xyz')).toEqual([]);
  });

  it('respects the limit', () => {
    expect(filterCommands(commands, '', 2)).toHaveLength(2);
  });
});

import { describe, expect, it } from 'vitest';
import { activeLine, parseLrc } from './lrc';

const lrc = ['[ti:Song]', '[ar:Someone]', '[00:12.50]First', '[00:05.00]Intro', '[01:02.5][02:10.25]Chorus', 'no stamp here', '[00:20]'].join('\n');

describe('parseLrc', () => {
  it('reads timestamps, sorts them and skips tags and unstamped lines', () => {
    const lines = parseLrc(lrc);
    expect(lines.map((l) => l.text)).toEqual(['Intro', 'First', '', 'Chorus', 'Chorus']);
    expect(lines.map((l) => l.time)).toEqual([5, 12.5, 20, 62.5, 130.25]);
  });

  it('copes with empty input and Windows line endings', () => {
    expect(parseLrc('')).toEqual([]);
    expect(parseLrc(undefined)).toEqual([]);
    expect(parseLrc('[00:01.00]a\r\n[00:02.00]b')).toHaveLength(2);
  });
});

describe('activeLine', () => {
  const lines = parseLrc(lrc);
  it('is -1 before the first line and then follows the clock', () => {
    expect(activeLine(lines, 0)).toBe(-1);
    expect(activeLine(lines, 5)).toBe(0);
    expect(activeLine(lines, 13)).toBe(1);
    expect(activeLine(lines, 999)).toBe(lines.length - 1);
  });
  it('handles no lyrics', () => {
    expect(activeLine([], 10)).toBe(-1);
  });
});

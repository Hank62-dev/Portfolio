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

describe('laying untimed lyrics along a song', () => {
  const text = 'first line here\nsecond one\n\nafter a verse break\nlast words of it all';

  it('gives every sung line a time, in order, between an intro and an outro', async () => {
    const { estimateLines } = await import('./lrc');
    const lines = estimateLines(text, 200);
    expect(lines.map((l) => l.text)).toEqual(['first line here', 'second one', 'after a verse break', 'last words of it all']);
    expect(lines[0].time).toBe(10); // 5 % of 200 s
    expect(lines.every((l, i) => i === 0 || l.time > lines[i - 1].time)).toBe(true);
    expect(lines.at(-1).time).toBeLessThan(200 - 12); // before the outro
  });

  it('leaves more room after a line that is followed by a verse break', async () => {
    const { estimateLines } = await import('./lrc');
    const [a, b, c] = estimateLines('aaaaaaaaaa\nbbbbbbbbbb\n\ncccccccccc\ndddddddddd', 200);
    expect(c.time - b.time).toBeGreaterThan(b.time - a.time);
  });

  it('has nothing to lay out without a length or without words', async () => {
    const { estimateLines } = await import('./lrc');
    expect(estimateLines(text, 0)).toEqual([]);
    expect(estimateLines(text, 10)).toEqual([]);
    expect(estimateLines('  \n \n', 200)).toEqual([]);
  });
});

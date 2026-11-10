import { describe, expect, it } from 'vitest';
import { focusWindow, followRatio, lineProgress, stepSize } from './lyricModes';

const lines = [
  { time: 10, text: 'short' },
  { time: 12, text: 'a rather longer line of words to sing' },
  { time: 60, text: 'after the instrumental' },
];

describe('the karaoke fill', () => {
  it('is empty before the line, and grows through it', () => {
    expect(lineProgress(lines, 0, 9)).toBe(0);
    expect(lineProgress(lines, 0, 10)).toBe(0);
    expect(lineProgress(lines, 0, 10.75)).toBeCloseTo(0.5, 5); // five letters: paced at the 1.5 s minimum
    expect(lineProgress(lines, 0, 11.5)).toBe(1);
  });

  it('is never slower than the next line arriving', () => {
    expect(lineProgress(lines, 0, 11.99)).toBe(1);
  });

  it('fills a line before a long instrumental in a few seconds, then holds it full', () => {
    // 37 letters: 3.7 s of singing, however long the gap
    expect(lineProgress(lines, 1, 12 + 1.85)).toBeCloseTo(0.5, 2);
    expect(lineProgress(lines, 1, 30)).toBe(1);
  });

  it('is 0 when no line is being sung', () => {
    expect(lineProgress(lines, -1, 5)).toBe(0);
    expect(lineProgress([], 0, 5)).toBe(0);
  });
});

describe('the focus window', () => {
  it('shows two lines either side of the sung one', () => {
    expect(focusWindow(lines, 1).map((w) => [w.at, w.index])).toEqual([[-1, 0], [0, 1], [1, 2]]);
  });

  it('shows the first lines, coming up, before the song starts', () => {
    expect(focusWindow(lines, -1).map((w) => [w.at, w.index])).toEqual([[1, 0], [2, 1]]);
  });

  it('is empty without lines', () => {
    expect(focusWindow([], 0)).toEqual([]);
  });
});

describe('following plain lyrics', () => {
  it('starts after a short intro and ends before the outro', () => {
    expect(followRatio(0, 200)).toBe(0);
    expect(followRatio(6, 200)).toBe(0);
    expect(followRatio(100, 200)).toBeCloseTo(94 / 182, 5);
    expect(followRatio(200, 200)).toBe(1);
  });

  it('stays put when the length is not known', () => {
    expect(followRatio(50, 0)).toBe(0);
    expect(followRatio(50, NaN)).toBe(0);
  });
});

describe('the text size', () => {
  it('steps up and down and stops at the ends', () => {
    expect(stepSize('m', 1)).toBe('l');
    expect(stepSize('l', 1)).toBe('l');
    expect(stepSize('m', -1)).toBe('s');
    expect(stepSize('s', -1)).toBe('s');
  });
});

describe('the full-screen colours', () => {
  it('shades the cover for the background, tints it light for the lines to come, and sinks the sung ones', async () => {
    const { lyricPalette } = await import('./lyricModes');
    expect(lyricPalette('200 40 40')).toEqual({ bg: 'rgb(80 22 22)', next: 'rgb(234 173 173)', past: 'rgb(149 90 90)', active: '#ffffff' });
  });

  it('never goes black, and falls back to the accent for a tint it cannot read', async () => {
    const { lyricPalette } = await import('./lyricModes');
    expect(lyricPalette('0 0 0').bg).toBe('rgb(22 22 22)');
    expect(lyricPalette('nonsense')).toEqual(lyricPalette('255 91 46'));
  });
});

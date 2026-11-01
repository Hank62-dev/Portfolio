import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COLORS, brandPrompt, contrast, hexToRgb, rate, toCss, toJson, toTailwind } from './brand';

describe('contrast', () => {
  it('knows the extremes and is symmetric', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
    expect(contrast('#ece6da', '#0b0c0e')).toBeCloseTo(contrast('#0b0c0e', '#ece6da'), 10);
  });

  it('rates against the WCAG thresholds', () => {
    expect([1, 3, 4.5, 7].map(rate)).toEqual(['Fail', 'AA large', 'AA', 'AAA']);
  });

  it('accepts short and long hex, and refuses anything else', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('ff5b2e')).toEqual([255, 91, 46]);
    expect(hexToRgb('red')).toBeNull();
  });

  it('keeps the brand text colours readable on the page background', () => {
    const page = COLORS.find((c) => c.name === 'ink-0').hex;
    for (const name of ['bone', 'bone-dim', 'bone-faint']) {
      expect(contrast(COLORS.find((c) => c.name === name).hex, page)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('the kit matches the stylesheet', () => {
  const css = fs.readFileSync(new URL('../../../styles/index.css', import.meta.url), 'utf8');

  it('has every colour at the same value as the @theme token', () => {
    for (const { name, hex } of COLORS) {
      expect(css, `--color-${name}`).toMatch(new RegExp(`--color-${name}:\\s*${hex};`, 'i'));
    }
  });
});

describe('exports', () => {
  it('writes CSS variables, a Tailwind theme and JSON with every colour', () => {
    expect(toCss()).toContain('--color-signal: #ff5b2e;');
    expect(toTailwind().startsWith('@theme {')).toBe(true);
    const json = JSON.parse(toJson());
    expect(json.color.signal.value).toBe('#ff5b2e');
    expect(Object.keys(json.color)).toHaveLength(COLORS.length);
    expect(json.font.display.family).toBe('Instrument Serif');
  });

  it('describes the look for the image prompt using the real colours', () => {
    expect(brandPrompt()).toContain('#ff5b2e');
    expect(brandPrompt()).toContain('#ece6da');
  });
});

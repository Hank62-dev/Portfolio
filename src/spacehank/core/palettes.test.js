import { describe, expect, it } from 'vitest';
import { contrast, hslToRgb } from './contrast';
import { PALETTES, hexToHsl, paletteCss, tokensOf } from './palettes';

describe('colour themes', () => {
  it('reads a hex colour as HSL', () => {
    expect(hexToHsl('#ff0000').map(Math.round)).toEqual([0, 100, 50]);
    expect(hexToHsl('#ffffff')[2]).toBe(100);
  });

  it('keeps every text colour and the accent at AA on every surface, in light and in dark', () => {
    for (const palette of PALETTES.filter((p) => p.dark)) {
      for (const theme of ['dark', 'light']) {
        const t = tokensOf(palette, theme);
        for (const fg of ['bone', 'dim', 'faint', 'signal']) {
          for (const surface of t.surfaces) {
            expect(contrast(hslToRgb(...t[fg]), hslToRgb(...surface)), `${palette.id} ${theme} ${fg}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });

  it('is dark at night and light by day', () => {
    for (const palette of PALETTES.filter((p) => p.dark)) {
      expect(tokensOf(palette, 'dark').surfaces[0][2]).toBeLessThan(10);
      expect(tokensOf(palette, 'light').surfaces[0][2]).toBeGreaterThan(90);
    }
  });

  it('writes the CSS of each palette for both themes, for the page and the workspace shell', () => {
    const css = paletteCss();
    for (const palette of PALETTES.filter((p) => p.dark)) {
      expect(css).toContain(`:root[data-palette='${palette.id}'][data-theme='dark'] .app-shell`);
      expect(css).toContain(`:root[data-palette='${palette.id}'][data-theme='light']`);
    }
    expect(css).not.toContain('NaN');
  });
});

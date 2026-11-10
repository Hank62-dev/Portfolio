import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SHELL, contrast, hslToRgb, signalLightness, signalVars } from './contrast';
import { NAVIGATION, tabHue } from './navigation';

const css = readFileSync(new URL('../../shared/styles/index.css', import.meta.url), 'utf8');
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

describe('contrast', () => {
  it('measures as WCAG does', () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrast([118, 118, 118], [255, 255, 255])).toBeCloseTo(4.54, 2);
    expect(hslToRgb(0, 100, 50)).toEqual([255, 0, 0]);
  });

  it("keeps every tab's accent at AA on all four surfaces, in both themes, and moves it only when it must", () => {
    for (const { id } of NAVIGATION) {
      const hue = tabHue(id);
      for (const theme of ['dark', 'light']) {
        const { signal: [sat, designed], surfaces } = SHELL[theme];
        const l = signalLightness(hue, theme);
        const worst = Math.min(...surfaces.map(([s, sl]) => contrast(hslToRgb(hue, sat, l), hslToRgb(hue, s, sl))));
        expect(worst, `${id} ${theme}`).toBeGreaterThanOrEqual(4.5);
        expect(theme === 'dark' ? l >= designed : l <= designed).toBe(true);
      }
    }
    expect(signalLightness(214, 'light')).toBe(38); // blueprint already reads well by day: untouched
    expect(signalVars(84)['--signal-l-light']).toMatch(/^\d+(\.\d+)?%$/);
  });

  it('mirrors the shell rules in index.css', () => {
    const start = css.indexOf('.app-shell {\n  --tab');
    const shell = css.slice(start, css.indexOf('}', start));
    const lightShell = css.slice(css.indexOf(":root[data-theme='light'] .app-shell {"), css.indexOf('}', css.indexOf(":root[data-theme='light'] .app-shell {")));
    const read = (block) => [0, 1, 2, 3].map((i) => block.match(new RegExp(String.raw`--color-ink-${i}: hsl\(var\(--tab\) ([\d.]+)% ([\d.]+)%\)`)).slice(1).map(Number));
    expect(read(shell)).toEqual(SHELL.dark.surfaces);
    expect(read(lightShell)).toEqual(SHELL.light.surfaces);
    expect(shell).toContain(`--color-signal: hsl(var(--tab) ${SHELL.dark.signal[0]}% var(--signal-l-dark, ${SHELL.dark.signal[1]}%))`);
    expect(lightShell).toContain(`--color-signal: hsl(var(--tab) ${SHELL.light.signal[0]}% var(--signal-l-light, ${SHELL.light.signal[1]}%))`);
  });

  it('gives the text colours AA on every surface of every tab', () => {
    const token = (block, name) => hex(block.match(new RegExp(`--color-${name}: (#[0-9a-f]{6})`))[1]);
    const dark = css.slice(0, css.indexOf("}"));
    const light = css.slice(css.indexOf(":root[data-theme='light'] {"));
    for (const [block, theme] of [[dark, 'dark'], [light, 'light']]) {
      for (const name of ['bone', 'bone-dim', 'bone-faint', 'ok', 'warn', 'danger']) {
        const fg = token(block, name);
        for (const { id } of NAVIGATION) {
          for (const [s, l] of SHELL[theme].surfaces) expect(contrast(fg, hslToRgb(tabHue(id), s, l)), `${theme} ${name} in ${id}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});

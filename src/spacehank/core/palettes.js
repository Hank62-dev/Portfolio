import { contrast, hslToRgb } from './contrast';
import { tr } from './i18n/lang';
import { createStore } from './store';

// Colour themes for the workspace, on top of light, dark and auto. "Default" is the workspace as it was: every tab its own
// colour. Each of the others dresses every tab in one palette (the ten themes of Anthropic's theme-factory skill): its dark
// colour becomes the surfaces at night, its light colour the paper by day, its accent the signal. Nothing is copied as it is:
// the surfaces are stepped like the workspace's own, and the text and the accent are moved, lighter at night and deeper by
// day, only as far as WCAG AA (4.5:1) on every surface needs. `swatch` is the palette's own four colours, to show in the picker.

export const PALETTES = [
  { id: 'default', name: tr('Tab colours'), swatch: ['#ff5b2e', '#6be0c0', '#7fb0ff', '#b49cff'] },
  { id: 'ocean', name: 'Ocean Depths', dark: '#1a2332', light: '#f1faee', accent: '#2d8b8b', swatch: ['#1a2332', '#2d8b8b', '#a8dadc', '#f1faee'] },
  { id: 'galaxy', name: 'Midnight Galaxy', dark: '#2b1e3e', light: '#e6e6fa', accent: '#a490c2', swatch: ['#2b1e3e', '#4a4e8f', '#a490c2', '#e6e6fa'] },
  { id: 'forest', name: 'Forest Canopy', dark: '#2d4a2b', light: '#faf9f6', accent: '#8f9a5e', swatch: ['#2d4a2b', '#7d8471', '#a4ac86', '#faf9f6'] },
  { id: 'arctic', name: 'Arctic Frost', dark: '#1c2a3d', light: '#d4e4f7', accent: '#4a6fa5', swatch: ['#4a6fa5', '#c0c0c0', '#d4e4f7', '#fafafa'] },
  { id: 'botanical', name: 'Botanical Garden', dark: '#1f3326', light: '#f5f3ed', accent: '#f9a620', swatch: ['#4a7c59', '#f9a620', '#b7472a', '#f5f3ed'] },
  { id: 'desert', name: 'Desert Rose', dark: '#5d2e46', light: '#e8d5c4', accent: '#d4a5a5', swatch: ['#5d2e46', '#b87d6d', '#d4a5a5', '#e8d5c4'] },
  { id: 'golden', name: 'Golden Hour', dark: '#4a403a', light: '#efe3d2', accent: '#f4a900', swatch: ['#4a403a', '#c1666b', '#f4a900', '#d4b896'] },
  { id: 'minimal', name: 'Modern Minimalist', dark: '#36454f', light: '#ffffff', accent: '#8696a7', swatch: ['#36454f', '#708090', '#d3d3d3', '#ffffff'] },
  { id: 'sunset', name: 'Sunset Boulevard', dark: '#264653', light: '#faf1dc', accent: '#e76f51', swatch: ['#264653', '#e76f51', '#f4a261', '#e9c46a'] },
  { id: 'tech', name: 'Tech Innovation', dark: '#1e1e1e', light: '#ffffff', accent: '#0066ff', swatch: ['#1e1e1e', '#0066ff', '#00ffff', '#ffffff'] },
];

export const DEFAULT_PALETTE = 'default';
export const isPalette = (id) => PALETTES.some((p) => p.id === id);
export const paletteOf = (id) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

/** '#rrggbb' as [hue, saturation %, lightness %]. */
export const hexToHsl = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
};

const AA = 4.5;
const round = (n) => Math.round(n * 10) / 10;
const css = ([h, s, l]) => `hsl(${round(h)} ${round(s)}% ${round(l)}%)`;

/** The lightness nearest `from`, moving by `step`, at which [h, s, l] reads at AA on every one of `backs`. */
const readable = (h, s, from, step, backs) => {
  let l = from;
  while (Math.min(...backs.map((b) => contrast(hslToRgb(h, s, l), b))) < AA && l > 0 && l < 100) l += step;
  return Math.max(0, Math.min(100, l));
};

/**
 * A palette's tokens for a theme: the four surfaces, the three text colours, the accent and its soft wash, the lines and the
 * hue of the glows. Plain values, so they can be checked (palettes.test.js) and written into CSS.
 */
export const tokensOf = (palette, theme) => {
  const [ah, as] = hexToHsl(palette.accent);
  if (theme === 'dark') {
    const [h, s0] = hexToHsl(palette.dark);
    const s = Math.min(s0, 34);
    const surfaces = [5.5, 7.8, 10.6, 14].map((l) => [h, s, l]);
    const backs = surfaces.map((x) => hslToRgb(...x));
    const [th, ts] = hexToHsl(palette.light);
    const text = Math.min(ts, 40);
    return {
      surfaces,
      bone: [th, text, readable(th, text, 90, 0.5, backs)],
      dim: [th, text * 0.5, readable(th, text * 0.5, 68, 0.5, backs)],
      faint: [th, text * 0.4, readable(th, text * 0.4, 58, 0.5, backs)],
      signal: [ah, Math.max(as, 45), readable(ah, Math.max(as, 45), Math.max(60, hexToHsl(palette.accent)[2]), 0.5, backs)],
      line: [th, text, 90],
      hue: ah,
    };
  }
  const [h0, s0] = hexToHsl(palette.light);
  // a white or grey paper takes a whisper of the accent's hue, so it is not flat
  const h = s0 < 8 ? ah : h0;
  const s = s0 < 8 ? 14 : Math.min(s0, 40);
  const surfaces = [96, 93, 89.5, 85].map((l) => [h, s, l]);
  const backs = surfaces.map((x) => hslToRgb(...x));
  const [dh, ds] = hexToHsl(palette.dark);
  const ink = Math.min(ds, 45);
  return {
    surfaces,
    bone: [dh, ink, readable(dh, ink, 11, -0.5, backs)],
    dim: [dh, ink * 0.6, readable(dh, ink * 0.6, 30, -0.5, backs)],
    faint: [dh, ink * 0.5, readable(dh, ink * 0.5, 38, -0.5, backs)],
    signal: [ah, Math.max(as, 50), readable(ah, Math.max(as, 50), Math.min(42, hexToHsl(palette.accent)[2]), -0.5, backs)],
    line: [dh, ink, 12],
    hue: ah,
  };
};

const block = (t) => {
  const [lh, ls, ll] = t.line;
  return [
    `--tab: ${round(t.hue)}`,
    ...t.surfaces.map((x, i) => `--color-ink-${i}: ${css(x)}`),
    `--color-bone: ${css(t.bone)}`,
    `--color-bone-dim: ${css(t.dim)}`,
    `--color-bone-faint: ${css(t.faint)}`,
    `--color-signal: ${css(t.signal)}`,
    `--color-signal-soft: hsl(${round(t.signal[0])} ${round(t.signal[1])}% ${round(t.signal[2])}% / 0.14)`,
    `--color-line: hsl(${round(lh)} ${round(ls)}% ${ll}% / 0.12)`,
    `--color-line-strong: hsl(${round(lh)} ${round(ls)}% ${ll}% / 0.26)`,
  ].join(';');
};

/**
 * The CSS of every palette. A palette is on while the page's root carries `data-palette` (the workspace sets it), and it is
 * written for the root and the workspace's shell alike, beating the shell's own per-tab colours.
 */
export const paletteCss = () =>
  PALETTES.filter((p) => p.dark)
    .map((p) =>
      ['dark', 'light']
        .map((theme) => {
          const sel = `:root[data-palette='${p.id}'][data-theme='${theme}']`;
          return `${sel}, ${sel} .app-shell { ${block(tokensOf(p, theme))} }`;
        })
        .join('\n')
    )
    .join('\n');

// ---- the choice: kept on this device, put on the page while the workspace is open ----

const KEY = 'hank62.palette';
const read = () => {
  try {
    const saved = localStorage.getItem(KEY);
    return isPalette(saved) ? saved : DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
};

export const paletteState = createStore({ id: read() });

let styled = false;
/** Puts the chosen palette on the page (and its CSS, the first time). */
export const applyPalette = (id = paletteState.get().id) => {
  if (typeof document === 'undefined') return;
  if (!styled) {
    const style = document.createElement('style');
    style.dataset.palettes = '';
    style.textContent = paletteCss();
    document.head.appendChild(style);
    styled = true;
  }
  const root = document.documentElement;
  if (id === DEFAULT_PALETTE) delete root.dataset.palette;
  else root.dataset.palette = id;
};

/** Takes the palette off the page (the portfolio keeps its own colours). */
export const clearPalette = () => {
  if (typeof document !== 'undefined') delete document.documentElement.dataset.palette;
};

/** Chooses a palette: it is on at once (the colours cross-fade) and remembered. */
export const setPalette = (id) => {
  if (!isPalette(id)) return;
  const root = document.documentElement;
  if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    root.classList.add('theme-switching');
    window.setTimeout(() => root.classList.remove('theme-switching'), 700);
  }
  paletteState.set({ id });
  applyPalette(id);
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* for this visit */
  }
};

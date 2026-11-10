import { tr } from '../../core/i18n/lang';
// The brand kit: the site's own tokens (mirrored from styles/index.css, and a test keeps them in step),
// the WCAG contrast maths, and exports for other tools.

export const COLORS = [
  { group: 'Surface', name: 'ink-0', hex: '#0b0c0e', role: tr('Page background') },
  { group: 'Surface', name: 'ink-1', hex: '#101114', role: tr('Sidebar, panels') },
  { group: 'Surface', name: 'ink-2', hex: '#16181c', role: tr('Cards, inputs') },
  { group: 'Surface', name: 'ink-3', hex: '#1e2127', role: tr('Raised, active') },
  { group: 'Text', name: 'bone', hex: '#ece6da', role: tr('Primary text') },
  { group: 'Text', name: 'bone-dim', hex: '#a8a396', role: tr('Secondary text') },
  { group: 'Text', name: 'bone-faint', hex: '#8a8579', role: tr('Hints, captions') },
  { group: 'Accent', name: 'signal', hex: '#ff5b2e', role: tr('The one accent') },
  { group: 'Status', name: 'ok', hex: '#7fd6a2', role: 'Success' },
  { group: 'Status', name: 'warn', hex: '#f0b45a', role: 'Caution' },
  { group: 'Status', name: 'danger', hex: '#ff7b72', role: 'Error' },
];

export const FONTS = [
  { name: 'display', family: 'Newsreader', fallback: 'serif', use: 'Headlines' },
  { name: 'body', family: 'Geist', fallback: "system-ui, -apple-system, 'Segoe UI', sans-serif", use: tr('Text and controls') },
  { name: 'mono', family: tr('Geist Mono'), fallback: "ui-monospace, 'SFMono-Regular', Menlo, monospace", use: tr('Labels, numbers, code') },
];

const channel = (value) => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** '#rgb' or '#rrggbb' to [r, g, b], or null. */
export const hexToRgb = (hex) => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!match) return null;
  const full = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1];
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

export const luminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio between two colours, 1 to 21. */
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** 'AAA', 'AA', 'AA large' (3:1 passes only for big text) or 'Fail'. */
export const rate = (ratio) => (ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large' : 'Fail');

const declarations = (colors, fonts) => [
  ...colors.map((c) => `  --color-${c.name}: ${c.hex};`),
  ...fonts.map((f) => `  --font-${f.name}: '${f.family}', ${f.fallback};`),
];

export const toCss = (colors = COLORS, fonts = FONTS) => [':root {', ...declarations(colors, fonts), '}'].join('\n');

export const toTailwind = (colors = COLORS, fonts = FONTS) => ['@theme {', ...declarations(colors, fonts), '}'].join('\n');

export const toJson = (colors = COLORS, fonts = FONTS) =>
  JSON.stringify(
    {
      color: Object.fromEntries(colors.map((c) => [c.name, { value: c.hex, description: c.role }])),
      font: Object.fromEntries(fonts.map((f) => [f.name, { family: f.family, fallback: f.fallback, use: f.use }])),
    },
    null,
    2
  );

/** A sentence that pins a picture to the brand, prepended to a prompt when "on brand" is switched on. */
export const brandPrompt = (colors = COLORS) => {
  const pick = (name) => colors.find((c) => c.name === name)?.hex;
  return `Art direction: editorial, restrained, warm near-black ground (${pick('ink-1')}), bone-white type (${pick('bone')}), a single vivid orange accent (${pick('signal')}), fine hairlines, generous negative space, subtle film grain.`;
};

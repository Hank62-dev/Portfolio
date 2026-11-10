// The tab's accent colour as text, readable on every surface of the workspace in both themes.
//
// Each tab has its own hue (navigation.js), and the accent (`--color-signal`) is that hue at a fixed saturation and lightness.
// At one lightness the hues are not equally bright to the eye: yellow and green are much lighter than blue and violet, so a
// lightness that reads well for one tab is too faint for another. This finds, per hue, the lightness nearest the designed one
// (61% at night, 38% by day) that keeps WCAG AA (4.5:1) against all four surfaces (ink-0 to ink-3), which index.css also tints
// with the hue. The values here mirror the `.app-shell` rules in shared/styles/index.css; change them together.

/** HSL (degrees, percent, percent) to 0-255 RGB. */
export const hslToRgb = (h, s, l) => {
  const sat = s / 100;
  const light = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255));
};

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** The WCAG contrast ratio of two RGB colours (1 to 21). */
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// the accent and the four surfaces of `.app-shell`, as [saturation, lightness] (index.css)
export const SHELL = {
  dark: { signal: [74, 61], surfaces: [[10, 5.6], [8, 7.8], [7, 10.4], [6, 13.8]], step: 0.5 },
  light: { signal: [68, 38], surfaces: [[24, 95.5], [20, 92.5], [17, 89], [15, 84.5]], step: -0.5 },
};

const AA = 4.5;

/** The accent's lightness (percent) for a hue in a theme: the designed one, moved only as far as AA needs. */
export const signalLightness = (hue, theme) => {
  const { signal: [sat, designed], surfaces, step } = SHELL[theme];
  const backs = surfaces.map(([s, l]) => hslToRgb(hue, s, l));
  const worst = (l) => Math.min(...backs.map((back) => contrast(hslToRgb(hue, sat, l), back)));
  let l = designed;
  while (worst(l) < AA && l > 0 && l < 100) l += step;
  return l;
};

/** The CSS variables a tab's shell carries, so its accent stays readable (see the `.app-shell` rules). */
export const signalVars = (hue) => ({ '--signal-l-dark': `${signalLightness(hue, 'dark')}%`, '--signal-l-light': `${signalLightness(hue, 'light')}%` });

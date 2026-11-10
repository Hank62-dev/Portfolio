import { createStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';
import { clamp } from '../../../shared/lib/math';

// How lyrics are shown. Timed lyrics have five looks; the choice and the text size are remembered on this device.

export const MODES = [
  { id: 'spotify', label: tr('Scroll'), hint: tr('Big lines that slide up, the sung one bright') },
  { id: 'karaoke', label: tr('Karaoke'), hint: tr('The sung line fills with colour as it is sung') },
  { id: 'focus', label: tr('Focus'), hint: tr('One line at a time, in the middle') },
  { id: 'ribbon', label: tr('Soft'), hint: tr('A blurred ribbon around the sung line') },
  { id: 'full', label: tr('Full'), hint: tr('Every line, small, with the sung one marked') },
];
export const SIZES = ['s', 'm', 'l'];

const KEY = 'hank62.music.lyrics';
const DEFAULTS = { mode: 'spotify', size: 'm' };

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      mode: MODES.some((m) => m.id === saved.mode) ? saved.mode : DEFAULTS.mode,
      size: SIZES.includes(saved.size) ? saved.size : DEFAULTS.size,
    };
  } catch {
    return { ...DEFAULTS };
  }
};

/** The look of the lyrics, shared by every place that shows them (the small view and the full-screen one). */
export const lyricPrefs = createStore(read());

export const setLyricPrefs = (patch) => {
  lyricPrefs.set(patch);
  try {
    localStorage.setItem(KEY, JSON.stringify(lyricPrefs.get()));
  } catch {
    /* the look still applies for this visit */
  }
};

/** One size up or down (clamped at the ends). */
export const stepSize = (size, delta) => SIZES[Math.max(0, Math.min(SIZES.length - 1, SIZES.indexOf(size) + delta))];


/**
 * How far through its line the song is (0 to 1), for the karaoke fill. A line is not sung until the next one starts: a long gap
 * after it is an instrumental, so the fill is paced by the length of the text (about a tenth of a second per letter, 1.5 s at least)
 * and then waits, full, for the next line.
 */
export const lineProgress = (lines, index, time) => {
  const line = lines[index];
  if (!line) return 0;
  const gap = (lines[index + 1]?.time ?? Infinity) - line.time;
  const span = Math.min(gap, Math.max(1.5, line.text.length * 0.1));
  return clamp((time - line.time) / span);
};

/** The lines shown in the focus look: a couple before the sung one and a couple after, as [{ line, at }] with at = distance (−2…2). */
export const focusWindow = (lines, active) =>
  [-2, -1, 0, 1, 2]
    .map((at) => ({ at, index: active + at }))
    .filter(({ index }) => index >= 0 && index < lines.length)
    .map(({ at, index }) => ({ at, index, line: lines[index] }));

/** Where plain (untimed) lyrics should be scrolled to while the song plays, 0 to 1 of the way down: a short intro, a short outro. */
export const followRatio = (time, duration) => (duration > 20 ? clamp((time - 6) / (duration - 18)) : 0);

const FALLBACK = [255, 91, 46];
const channels = (tint) => {
  const parts = String(tint).trim().split(/\s+/).map(Number);
  return parts.length === 3 && parts.every(Number.isFinite) ? parts.map((v) => clamp(Math.round(v), 0, 255)) : FALLBACK;
};
const mix = (from, to, amount) => from.map((v, i) => Math.round(v + (to[i] - v) * amount));
const css = ([r, g, b]) => `rgb(${r} ${g} ${b})`;

/**
 * The colours of the full-screen lyrics from the cover's tint ('r g b'), as on a streaming app's lyrics page: the whole screen takes a
 * deep shade of the cover, the line being sung is white, the lines still to come are a light tint of it, and the ones already sung sink
 * back toward the background.
 */
export const lyricPalette = (tint) => {
  const base = channels(tint);
  const bg = base.map((v) => Math.max(22, Math.round(v * 0.4)));
  const next = mix(base, [255, 255, 255], 0.62);
  return { bg: css(bg), next: css(next), past: css(mix(next, bg, 0.55)), active: '#ffffff' };
};

import { canMove } from './gate';

// Text that resolves out of random glyphs, a letter at a time from the left: a word "decoding" into place.

const GLYPHS = '!<>-_/[]{}—=+*^?#';

/** A string where the first `settled` characters are real and the rest are random glyphs. Spaces stay spaces. */
export const scrambleFrame = (text, settled, random = Math.random) =>
  [...text]
    .map((char, i) => (i < settled || char === ' ' ? char : GLYPHS[Math.floor(random() * GLYPHS.length)]))
    .join('');

/**
 * Plays the decoding on an element's text (it ends on exactly `text`). Returns a function that stops it early, leaving the
 * real text. The element should be aria-hidden with the real text beside it for screen readers, as its words flicker.
 */
export const scrambleInto = (el, text, { duration = Math.min(900, 220 + text.length * 22), delay = 0 } = {}) => {
  if (!el) return () => {};
  if (!canMove()) {
    el.textContent = text;
    return () => {};
  }
  let raf = 0;
  const start = performance.now() + delay;
  el.textContent = scrambleFrame(text, 0);
  const tick = (now) => {
    const t = Math.max(0, Math.min(1, (now - start) / duration));
    el.textContent = t >= 1 ? text : scrambleFrame(text, Math.floor(t * text.length));
    if (t < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    el.textContent = text;
  };
};

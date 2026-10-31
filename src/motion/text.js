const GLYPHS = '!<>-_/[]{}—=+*^?#';

/** A string where the first `settled` characters are real and the rest are random glyphs. Spaces stay spaces. */
export const scrambleFrame = (text, settled, random = Math.random) =>
  [...text]
    .map((char, i) => (i < settled || char === ' ' ? char : GLYPHS[Math.floor(random() * GLYPHS.length)]))
    .join('');

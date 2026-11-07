// A finger dragging a row sideways: how far counts as "I mean it", and which way the drag is going.

export const SWIPE_DONE = 96;
const INTENT = 8;

/** What a drag of `dx` (to the right is positive) ends in: 'done' when it went far enough, 'back' when it did not. */
export const swipeOutcome = (dx, threshold = SWIPE_DONE) => (dx >= threshold ? 'done' : 'back');

/**
 * Whether the drag is horizontal (ours), vertical (the page's: a scroll) or still too small to tell.
 * Returns 'x', 'y' or null.
 */
export const swipeAxis = (dx, dy) => {
  if (Math.abs(dx) < INTENT && Math.abs(dy) < INTENT) return null;
  return Math.abs(dx) > Math.abs(dy) + 2 ? 'x' : 'y';
};

/** How the row follows the finger: right only, and it gets heavier the further it goes (so it never leaves the screen). */
export const swipeOffset = (dx, max = 160) => {
  const d = Math.min(Math.max(dx, 0), 2 * max); // the curve below peaks at 2 * max
  return d - (d * d) / (4 * max);
};

/** 0..1: how close the drag is to the point of no return (for fading the check in). */
export const swipeProgress = (dx, threshold = SWIPE_DONE) => Math.max(0, Math.min(1, dx / threshold));

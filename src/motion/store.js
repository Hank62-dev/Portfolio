// Page-wide input values for effects that run outside React (the background shader, the cursor).
// One listener set in SmoothScroll writes them; consumers read them each frame.
export const motionStore = {
  /** Pointer position, each axis 0..1 from the top-left of the viewport. */
  pointerX: 0.5,
  pointerY: 0.5,
  /** Signed scroll speed in px per frame (negative = scrolling up), smoothed. */
  velocity: 0,
  /** Scroll position as a fraction of the page, 0..1. */
  progress: 0,
};

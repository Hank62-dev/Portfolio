// A picture that flies from the page you leave to the page you open: the link's click records where the
// picture is, the new page finds its own copy and animates a clone from the old place to the new one.
// While a flight is waiting, the route wipe stands aside (the flight is the transition).

let pending = null;
const FRESH_MS = 1500;

export const flight = {
  /** Remember `img` (an <img> on screen) as the picture to fly with the next route change. */
  start(img) {
    if (!img?.getBoundingClientRect) return;
    const r = img.getBoundingClientRect();
    if (r.width < 40 || r.bottom < 0 || r.top > window.innerHeight) return;
    const box = img.closest('[data-flight-frame]') ?? img.parentElement;
    pending = {
      src: img.currentSrc || img.src,
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      radius: getComputedStyle(box).borderRadius,
      at: performance.now(),
    };
  },
  /** Whether a flight is waiting, without claiming it. */
  peek: () => Boolean(pending && performance.now() - pending.at < FRESH_MS),
  /** Claims the waiting flight (once), or null. */
  take() {
    const p = pending;
    pending = null;
    return p && performance.now() - p.at < FRESH_MS ? p : null;
  },
};

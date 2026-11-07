import { prefersReducedMotion } from './hooks';

// Movement from one state of the page to the next, done by the browser (the View Transitions API): it keeps a picture of how
// the page was, lets the page change, and animates between the two. Elements given the same `view-transition-name` before and
// after (a cover, a player) are carried across and grow into each other. Where the browser cannot do it, or the person wants
// less motion, the change just happens.

/** Whether a change can be animated like this here. */
export const canMorph = () => typeof document !== 'undefined' && typeof document.startViewTransition === 'function' && !prefersReducedMotion();

let active = false;
let pageWaiters = [];

/** The page calls this once its new screen is on the page; whoever was waiting for it is let go. */
export const releasePage = () => {
  const waiting = pageWaiters;
  pageWaiters = [];
  waiting.forEach((resolve) => resolve());
};
/** Resolves when the next screen has been drawn (see releasePage). */
export const nextPage = () => new Promise((resolve) => pageWaiters.push(resolve));

/** Resolves as soon as `test()` is true (checked every frame). */
export const waitUntil = (test) =>
  new Promise((resolve) => {
    const check = () => (test() ? resolve() : requestAnimationFrame(check));
    check();
  });

/**
 * Runs `change` inside a view transition. `type` is written on the page for the styles to read ('forward', 'back'…);
 * `ready()` returns a promise that settles when the new state is on the page (it is cut off after `timeout` ms, so a slow screen
 * can never freeze the page). A change made while another transition is running just happens, without a second one.
 */
export const transition = (change, { type = '', ready, timeout = 900 } = {}) => {
  if (!canMorph() || active) {
    change();
    return;
  }
  active = true;
  const root = document.documentElement;
  if (type) root.dataset.vt = type;
  const run = document.startViewTransition(async () => {
    change();
    await Promise.race([ready ? ready() : Promise.resolve(), new Promise((resolve) => setTimeout(resolve, timeout))]);
  });
  const done = () => {
    active = false;
    delete root.dataset.vt;
  };
  run.finished.then(done, done);
};

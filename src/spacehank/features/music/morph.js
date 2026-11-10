import { transition, waitUntil } from '../../core/motion/transition';
import { musicUi } from './ui';

// The full-screen player opens with the record travelling from the little player into the big one, and back. The record carries
// the view-transition name 'player-disc' only while this transition runs (see the styles: html[data-vt='player']); a name that is
// always on the page makes the browser take a picture of that element in every transition, which costs a phone every time.

const isOpen = () => Boolean(document.querySelector('[data-now-playing-page]'));

/** Opens the full player (`before` runs first, e.g. to go to the music screen, and the transition waits until the player is drawn). */
export const showPlayer = (before) =>
  transition(
    () => {
      before?.();
      musicUi.set({ full: true });
    },
    { type: 'player', ready: () => waitUntil(isOpen) }
  );

/** Puts the full player away, back into the little one. */
export const hidePlayer = () =>
  transition(() => musicUi.set({ full: false }), { type: 'player', ready: () => waitUntil(() => !isOpen()) });

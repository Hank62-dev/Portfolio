import { transition, waitUntil } from '../motion/transition';
import { musicUi } from './ui';

// The full-screen player opens out of the little player and goes back into it: both carry the same view-transition names
// ('player' for the whole thing, 'player-disc' for the record), only one of them at a time (see `playerNames`).

const isOpen = () => Boolean(document.querySelector('[data-now-playing-page]'));

/** What to write as `viewTransitionName` on the little player and on the full one. Only the one that is showing carries the name. */
export const playerNames = (full) => ({ mini: full ? 'none' : 'player', page: full ? 'player' : 'none', miniDisc: full ? 'none' : 'player-disc', pageDisc: full ? 'player-disc' : 'none' });

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

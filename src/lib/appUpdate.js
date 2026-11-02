import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

// Keeping the installed app up to date. A phone keeps showing the copy of the site it saved until the app is fully
// closed, so the app asks the server for a newer one on its own, and when there is one it says so and waits to be told.
// Tapping "Update" swaps to the new copy and reloads the page; "Later" leaves it for the next visit.

const CHECK_EVERY = 15 * 60 * 1000;

let state = { ready: false, dismissed: false };
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

let apply = null;

/** Registers the service worker and starts looking for newer versions. Call once, at start. */
export const startUpdates = () => {
  if (typeof window === 'undefined' || apply) return;
  apply = registerSW({
    immediate: true,
    onNeedRefresh: () => set({ ready: true, dismissed: false }),
    onRegisteredSW: (_url, registration) => {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => {});
      };
      window.setInterval(check, CHECK_EVERY);
      // coming back to the app, or the network coming back, is the moment a phone most likely missed a release
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
      window.addEventListener('online', check);
    },
  });
};

/** Switches to the new version and reloads. */
export const applyUpdate = () => apply?.(true);
export const later = () => set({ dismissed: true });

export const useUpdate = () => useSyncExternalStore(subscribe, () => state);

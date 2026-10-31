import { useSyncExternalStore } from 'react';

// Which layer the Stack section is currently scrolled to. A tiny store (not React state in Stack itself):
// the 3D scene reads `active` every frame, and only the small visual component re-renders on a change.
const listeners = new Set();

export const stackStore = {
  active: 0,
  set(index) {
    if (index === this.active) return;
    this.active = index;
    listeners.forEach((listener) => listener());
  },
};

export const useActiveLayer = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => stackStore.active
  );

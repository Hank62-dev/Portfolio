import { useSyncExternalStore } from 'react';

// Which layer the Stack section is currently scrolled to. A tiny store (not React state in Stack itself):
// the 3D scene reads `active` every frame, and only the small visual component re-renders on a change.
const listeners = new Set();

export const stackStore = {
  active: 0,
  /** How far through the section's layers the reader is, 0..1: the picture turns from orbits to plates. */
  progress: 0,
  /** A technology the pointer is resting on in the lists, lit in the picture; null when none. */
  focus: null,
  setFocus(tech) {
    if (tech === this.focus) return;
    this.focus = tech;
    listeners.forEach((listener) => listener());
  },
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

/** The technology pointed at in the lists, for the picture beside to light. */
export const useFocusedTech = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => stackStore.focus
  );

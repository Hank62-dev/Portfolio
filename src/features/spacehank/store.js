import { useSyncExternalStore } from 'react';

/** A tiny external store: `get`, `set(patch)`, `subscribe`. Read it in components with `useStore`. */
export const createStore = (initial) => {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set: (patch) => {
      const next = typeof patch === 'function' ? patch(state) : patch;
      if (next === state) return;
      state = { ...state, ...next };
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

/** Subscribes a component to a store (optionally to one slice of it). */
export const useStore = (store, select = (state) => state) => useSyncExternalStore(store.subscribe, () => select(store.get()));

import { useCallback } from 'react';
import { createStore, useStore } from './store';
import { tr } from './i18n/lang';

// A tab is a component, and a component is thrown away when you go to another tab. Whatever it was waiting for (a picture being
// drawn, a script being written) was waiting inside it, so the answer arrived to nobody and the work looked lost. Here the
// waiting lives outside the tabs: a job runs to its end whatever is on screen, and the tab that comes back finds it still
// running, or finished, where it left it. A draft is the same for what was typed and what came back.

export const jobs = createStore({ slots: {} });
const IDLE = Object.freeze({ busy: false, error: '', at: 0 });
const running = new Map();

const slotOf = (key, patch) => jobs.set((state) => ({ slots: { ...state.slots, [key]: { ...(state.slots[key] ?? IDLE), ...patch } } }));

/**
 * Runs `work` (a function that returns a promise) as the job `key`. Asked again while it is running, it joins the one that
 * is running instead of starting another (so a second tap, or coming back and tapping again, never pays twice).
 * `work` does its own saving of the result (into a draft, a collection...), so it lands even if no tab is looking.
 * Resolves with the work's result, or undefined when it failed (the failure is in the job's `error`).
 */
export const startJob = (key, work) => {
  if (running.has(key)) return running.get(key);
  slotOf(key, { busy: true, error: '' });
  const promise = Promise.resolve()
    .then(work)
    .then(
      (value) => {
        slotOf(key, { busy: false, at: Date.now() });
        return value;
      },
      (error) => {
        slotOf(key, { busy: false, error: error?.message || tr('Something went wrong. Try again.'), at: Date.now() });
        return undefined;
      }
    )
    .finally(() => running.delete(key));
  running.set(key, promise);
  return promise;
};

/** Forgets a job's last failure (when what it was about has been changed). */
export const clearJobError = (key) => slotOf(key, { error: '' });

/** { busy, error, at }: whether the job is running, how it last failed, and when it last finished. */
export const useJob = (key) => useStore(jobs, (state) => state.slots[key] ?? IDLE);

/** A set of values that outlives the tab that shows them. */
export const createDraft = (initial) => createStore(initial);

/** One value of a draft, like useState: `[value, set]`. `set` takes a value or a function of the old one. */
export const useDraft = (draft, key) => {
  const value = useStore(draft, (state) => state[key]);
  const set = useCallback((next) => draft.set((state) => ({ [key]: typeof next === 'function' ? next(state[key]) : next })), [draft, key]);
  return [value, set];
};

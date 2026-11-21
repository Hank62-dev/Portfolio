import { useSyncExternalStore } from 'react';

// Low battery: a device running on its battery with a fifth or less left gets no running effects (live wallpapers stand
// still, shaders are not started). Browsers that cannot tell (Safari, Firefox) never count as low.

const LOW = 0.2;
let low = false;
const listeners = new Set();

/** Whether these readings mean saving power. Pure, for the tests. */
export const isLow = ({ charging, level } = {}) => charging === false && typeof level === 'number' && level <= LOW;

const watch = async () => {
  if (typeof navigator === 'undefined' || typeof navigator.getBattery !== 'function') return;
  try {
    const battery = await navigator.getBattery();
    const update = () => {
      const next = isLow(battery);
      if (next === low) return;
      low = next;
      listeners.forEach((listener) => listener());
    };
    update();
    battery.addEventListener('chargingchange', update);
    battery.addEventListener('levelchange', update);
  } catch {
    /* not allowed here */
  }
};
void watch();

/** Whether power is being saved right now. */
export const lowPower = () => low;

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** The same, as a hook that redraws when it changes. */
export const useLowPower = () => useSyncExternalStore(subscribe, lowPower, () => false);

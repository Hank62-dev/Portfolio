/** Told to every screen that shows synced data, after another device's changes were written here. */
export const SYNCED_EVENT = 'hank:synced';

/** Runs `handler(stores)` whenever a sync wrote changes here. Returns a function that stops listening. */
export const onSynced = (handler) => {
  if (typeof window === 'undefined') return () => {};
  const on = (event) => handler(event.detail.stores);
  window.addEventListener(SYNCED_EVENT, on);
  return () => window.removeEventListener(SYNCED_EVENT, on);
};

import { refreshSession } from '../api/realtime';
import { spacehankConfig } from '../config';
import { isDemo } from '../demo/mode';
import { SYNCED_STORES, rawStorage, setWriteHook } from '../storage';
import { createStore } from '../store';
import { outboxOver, tablesOver } from './adapters';
import { createEngine } from './engine';
import { SYNCED_EVENT } from './events';
import { tr } from '../lang';

// Keeps the owner's personal data in step across devices (see ./engine.js). This file is the browser half: IndexedDB, fetch,
// localStorage, and when to sync (after a change, when the app comes back, when the network returns, every few minutes, and
// when the server says another device changed something).

const { realtimeApiUrl } = spacehankConfig;
const PUSH_DELAY = 1500;
const EVERY = 5 * 60 * 1000;

/** state: 'off' (no database set up, or a demo), 'idle', 'syncing', 'offline', 'error' or 'signedout'. */
export const syncStatus = createStore({ state: 'off', enabled: false, last: 0, pending: 0, skipped: 0, error: '', usage: null });

const offline = (message) => Object.assign(new Error(message), { offline: true });

const send = async (path, init = {}) => {
  const go = () => fetch(`${realtimeApiUrl}${path}`, { credentials: 'include', ...init });
  let response;
  try {
    response = await go();
    if (response.status === 401 && (await refreshSession())) response = await go();
  } catch {
    throw offline(tr('No connection to the server.'));
  }
  // a free server that is still waking up answers 502 or 503 from the proxy, not JSON
  if ([502, 504].includes(response.status)) throw offline(tr('The server is waking up.'));
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || tr('Sync failed ({0})', response.status)), { status: response.status });
  }
  return response;
};

const json = async (path, init) => (await send(path, init)).json();

const api = {
  status: () => json('/api/sync/status'),
  push: (changes) => json('/api/sync/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes }) }),
  pull: (since) => json(`/api/sync/pull?since=${since}&limit=200`),
  putBlob: (store, id, blob, at) => send(`/api/sync/blob?store=${encodeURIComponent(store)}&id=${encodeURIComponent(id)}&at=${at}`, { method: 'PUT', headers: { 'Content-Type': blob.type || 'application/octet-stream' }, body: blob }),
  getBlob: async (store, id) => (await send(`/api/sync/blob?store=${encodeURIComponent(store)}&id=${encodeURIComponent(id)}`)).blob(),
};

const PREFIX = 'hank62.sync.';
const meta = {
  get: (key) => {
    try {
      return localStorage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch {
      /* private mode: the position is kept for this visit only */
    }
  },
};

const outbox = outboxOver(rawStorage.outbox);
const tables = tablesOver(rawStorage);

export { SYNCED_EVENT } from './events';

let engine = null;
let stopCurrent = null;

/** Asks for a round soon (the server says another device changed something). */
export const requestSync = () => engine?.nudge?.();

/** Starts syncing, once the owner is signed in. Returns a function that stops it. Does nothing in the demo. */
export const startSync = () => {
  if (isDemo()) return () => {};
  if (stopCurrent) return stopCurrent;

  let stopped = false;
  let timer = 0;
  let retry = 0;

  engine = createEngine({
    tables,
    outbox,
    api,
    meta,
    stores: SYNCED_STORES,
    onChange: (stores) => window.dispatchEvent(new CustomEvent(SYNCED_EVENT, { detail: { stores } })),
    onStatus: (patch) => syncStatus.set(patch),
  });

  const run = async () => {
    if (stopped) return;
    window.clearTimeout(timer);
    try {
      await engine.sync();
      retry = 0;
    } catch (error) {
      if (stopped || error.status === 401) return;
      // try again, with a longer wait each time (the server may be asleep)
      retry = Math.min(retry + 1, 5);
      timer = window.setTimeout(run, Math.min(60000, 5000 * 2 ** retry));
    }
  };
  const soon = (ms = 400) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, ms);
  };
  engine.nudge = () => soon(200);

  const wake = () => {
    if (document.visibilityState === 'visible') soon(300);
  };

  const boot = async () => {
    if (stopped) return;
    try {
      const status = await api.status();
      if (stopped) return;
      if (!status.enabled) {
        syncStatus.set({ state: 'off', enabled: false, error: '' });
        return;
      }
      syncStatus.set({ enabled: true, usage: { usedBytes: status.usedBytes, quotaBytes: status.quotaBytes, records: status.records, files: status.files } });
      setWriteHook((store, id, deleted) => {
        void engine.queue(store, id, deleted).then(() => soon(PUSH_DELAY));
      });
      await run();
    } catch (error) {
      if (stopped) return;
      if (error.status === 401) {
        syncStatus.set({ state: 'signedout', error: error.message });
        return;
      }
      syncStatus.set({ state: error.offline ? 'offline' : 'error', error: error.message });
      timer = window.setTimeout(boot, 20000);
    }
  };
  void boot();

  document.addEventListener('visibilitychange', wake);
  window.addEventListener('online', wake);
  const interval = window.setInterval(wake, EVERY);

  stopCurrent = () => {
    stopped = true;
    window.clearTimeout(timer);
    window.clearInterval(interval);
    document.removeEventListener('visibilitychange', wake);
    window.removeEventListener('online', wake);
    setWriteHook(null);
    engine = null;
    stopCurrent = null;
    syncStatus.set({ state: 'off', enabled: false });
  };
  return stopCurrent;
};

/** Syncs right now (the button). */
export const syncNow = () => engine?.sync?.().catch(() => {});

// The workspace's private, on-device storage: music files, covers, playlists, generated pictures and saved
// prompts live in this browser's IndexedDB and never leave it. Small promise wrappers, no dependency.

import { isDemo } from './demo/mode';

// the demo keeps its made-up data in a database of its own, so it can never touch the owner's real one
const name = () => (isDemo() ? 'hank62-demo' : 'hank62-workspace');
const VERSION = 7;
// tracks / playlists / images / prompts / notes / photos (a diary's pictures) hold records; blobs / covers hold the raw files, keyed by the owner id.
const STORES = ['tracks', 'blobs', 'covers', 'playlists', 'images', 'prompts', 'notes', 'tasks', 'expenses', 'budgets', 'courses', 'cards', 'habits', 'memos', 'photos', 'content', 'income', 'deals', 'settings', 'chats', 'chatMsgs', 'outbox'];

// The stores that are kept in step across devices (see ./sync). The music library is not: its files are too big. `outbox` is the
// list of changes this device has not sent yet.
export const SYNCED_STORES = ['notes', 'tasks', 'expenses', 'budgets', 'courses', 'cards', 'habits', 'content', 'income', 'deals', 'prompts', 'settings', 'memos', 'images', 'photos', 'chats', 'chatMsgs'];
const SYNCED = new Set(SYNCED_STORES);
let writeHook = null;
/** The sync engine registers here to hear about every change made to a synced store. */
export const setWriteHook = (hook) => {
  writeHook = hook;
};

let opening = null;

const open = () => {
  if (!opening) {
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(name(), VERSION);
      request.onupgradeneeded = () => {
        for (const store of STORES) {
          if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      opening = null;
      throw error;
    });
  }
  return opening;
};

const wrap = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** Runs `work(store)` inside one transaction on `name` and resolves when the transaction has committed. */
const run = async (name, mode, work) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, mode);
    let result;
    Promise.resolve(work(tx.objectStore(name)))
      .then((value) => {
        result = value;
      })
      .catch((error) => {
        try {
          tx.abort();
        } catch {
          /* already finished */
        }
        reject(error);
      });
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted'));
  });
};

/** A handle on one store: all / get / put / remove / clear. This one does not tell the sync engine (the engine itself uses it). */
export const table = (name) => ({
  all: () => run(name, 'readonly', (store) => wrap(store.getAll())),
  get: (id) => run(name, 'readonly', (store) => wrap(store.get(id))),
  put: (record) => run(name, 'readwrite', (store) => wrap(store.put(record))),
  remove: (id) => run(name, 'readwrite', (store) => wrap(store.delete(id))),
  clear: () => run(name, 'readwrite', (store) => wrap(store.clear())),
});

/** Every store without the sync hook: for the sync engine, which must not queue its own writes. */
export const rawStorage = Object.fromEntries(STORES.map((name) => [name, table(name)]));

/** The same handle, but a write to a synced store is reported, so it can be sent to the other devices. */
const watched = (name) => {
  const t = table(name);
  if (!SYNCED.has(name)) return t;
  return {
    ...t,
    put: async (record) => {
      const result = await t.put(record);
      writeHook?.(name, record.id, false);
      return result;
    },
    remove: async (id) => {
      const result = await t.remove(id);
      writeHook?.(name, id, true);
      return result;
    },
  };
};

export const storage = Object.fromEntries(STORES.map((name) => [name, watched(name)]));

/** Asks the browser not to evict this data under storage pressure. Safe to call repeatedly; failure is fine. */
export const requestPersistence = async () => {
  try {
    return Boolean(await navigator.storage?.persist?.());
  } catch {
    return false;
  }
};

/** { used, quota } in bytes, or null where the browser cannot say. */
export const storageEstimate = async () => {
  try {
    const { usage, quota } = await navigator.storage.estimate();
    return { used: usage ?? 0, quota: quota ?? 0 };
  } catch {
    return null;
  }
};

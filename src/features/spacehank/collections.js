import { createStore } from './store';
import { storage } from './storage';

/**
 * A small collection of records kept on this device (one IndexedDB store), with a reactive in-memory copy. Each
 * private tab (tasks, spending, courses, habits…) uses one, so none of them repeats the same load/save code.
 * Records are plain objects with an `id`; `create` and `update` stamp `createdAt` / `updatedAt`.
 */
export const createCollection = (name, { order = (a, b) => b.updatedAt - a.updatedAt } = {}) => {
  const store = createStore({ loaded: false, items: [], error: '' });
  const table = storage[name];

  const load = async () => {
    if (store.get().loaded) return;
    try {
      store.set({ loaded: true, items: (await table.all()).sort(order), error: '' });
    } catch {
      store.set({ loaded: true, error: 'This browser would not open its private storage, so this cannot be kept.' });
    }
  };

  const put = async (item) => {
    await table.put(item);
    store.set((s) => ({ items: [...s.items.filter((x) => x.id !== item.id), item].sort(order) }));
    return item;
  };

  const create = (data) => {
    const now = Date.now();
    return put({ id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...data });
  };

  const update = async (id, patch) => {
    const current = store.get().items.find((x) => x.id === id);
    return current ? put({ ...current, ...patch, updatedAt: Date.now() }) : null;
  };

  const remove = async (id) => {
    await table.remove(id);
    store.set((s) => ({ items: s.items.filter((x) => x.id !== id) }));
  };

  /** Writes many records in one go (for sample data and imports). */
  const putMany = async (items) => {
    for (const item of items) await table.put(item);
    store.set((s) => ({ items: [...s.items.filter((x) => !items.some((n) => n.id === x.id)), ...items].sort(order) }));
  };

  return { store, load, create, update, remove, put, putMany };
};

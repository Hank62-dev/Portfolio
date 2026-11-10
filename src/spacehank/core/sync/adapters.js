// The engine talks to the device's storage through two small shapes. These turn the app's IndexedDB stores into them.

/**
 * The outbox on top of a store whose rows are keyed by `id`. A row is keyed by "store:record id" and keeps the record's own id
 * as `itemId`, so the two never get mixed up.
 */
export const outboxOver = (table) => ({
  all: async () => (await table.all()).map((e) => ({ key: e.id, store: e.store, id: e.itemId, deleted: e.deleted, at: e.at })),
  put: (entry) => table.put({ id: entry.key, store: entry.store, itemId: entry.id, deleted: entry.deleted, at: entry.at }),
  remove: (key) => table.remove(key),
});

/** The device's records, by store, without the sync hook (the engine must not queue its own writes). */
export const tablesOver = (raw) => ({
  get: (store, id) => raw[store].get(id),
  put: (store, record) => raw[store].put(record),
  remove: (store, id) => raw[store].remove(id),
  all: (store) => raw[store].all(),
});

// The play queue as plain data, so shuffle / repeat / next / previous can be tested without audio.
// `order` is the list of track ids in play order; `index` points at the one playing (-1: nothing yet).

export const REPEAT = ['off', 'all', 'one'];

const shuffled = (items, random) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** A queue of `ids` starting at `startId` (or the first). With `shuffle`, the rest follow in random order. */
export const createQueue = (ids, { startId, shuffle = false, random = Math.random } = {}) => {
  const start = ids.includes(startId) ? startId : ids[0];
  if (start === undefined) return { order: [], index: -1 };
  if (!shuffle) return { order: [...ids], index: ids.indexOf(start) };
  return { order: [start, ...shuffled(ids.filter((id) => id !== start), random)], index: 0 };
};

/** The queue after pressing next. `auto` is when the track ended by itself ("repeat one" stays put then). */
export const advance = (queue, repeat, { auto = false } = {}) => {
  const { order, index } = queue;
  if (!order.length) return { queue, ended: true };
  if (auto && repeat === 'one') return { queue, ended: false };
  if (index + 1 < order.length) return { queue: { order, index: index + 1 }, ended: false };
  if (repeat === 'all' || !auto) return { queue: { order, index: 0 }, ended: false };
  return { queue, ended: true };
};

/** The queue after pressing previous (past the first track it wraps to the last). */
export const retreat = (queue) => {
  const { order, index } = queue;
  if (!order.length) return queue;
  return { order, index: index > 0 ? index - 1 : order.length - 1 };
};

/** Puts `id` right after the current track (play next). Moves it if it is already queued. */
export const playNext = (queue, id) => {
  const current = queue.order[queue.index];
  const order = queue.order.filter((x) => x !== id);
  const at = current === undefined ? 0 : order.indexOf(current) + 1;
  order.splice(at, 0, id);
  return { order, index: current === undefined ? -1 : order.indexOf(current) };
};

/** Adds `id` to the end of the queue unless it is there already. */
export const enqueue = (queue, id) => (queue.order.includes(id) ? queue : { ...queue, order: [...queue.order, id] });

/** Removes ids that no longer exist (deleted from the library) and keeps the current position sensible. */
export const prune = (queue, exists) => {
  const current = queue.order[queue.index];
  const order = queue.order.filter(exists);
  if (current !== undefined && order.includes(current)) return { order, index: order.indexOf(current) };
  return { order, index: order.length ? Math.min(Math.max(queue.index, 0), order.length - 1) : -1 };
};

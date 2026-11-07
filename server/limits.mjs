// Slowing down whoever asks too often. Counting is in memory (one server process), by a key such as the client's address, in
// fixed windows. It is a shield against a runaway script or a guesser, not a bill: the AI helpers have their own daily budget.

/** `hit(key)` counts a request and says whether it may go on: { ok, retryAfterSeconds }. */
export const createLimiter = ({ max, windowMs, now = Date.now }) => {
  const windows = new Map();
  let lastPrune = 0;

  const prune = (at) => {
    if (at - lastPrune < windowMs) return;
    lastPrune = at;
    for (const [key, entry] of windows) if (entry.resetAt <= at) windows.delete(key);
  };

  const hit = (key) => {
    const at = now();
    prune(at);
    let entry = windows.get(key);
    if (!entry || entry.resetAt <= at) {
      entry = { count: 0, resetAt: at + windowMs };
      windows.set(key, entry);
    }
    entry.count += 1;
    return entry.count > max ? { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - at) / 1000)) } : { ok: true, retryAfterSeconds: 0 };
  };

  return { hit, size: () => windows.size };
};

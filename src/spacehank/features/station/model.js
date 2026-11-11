// The station's plain logic: where each crew member sits on the ring, and which hand-offs (who gave whom a task) to draw.
// No React here, so it is tested on its own (model.test.js).

/** The owner's seat: the command core in the middle of the ring. Hand-offs from the owner start here. */
export const CORE = 'you';

/** How far from the core the desks sit, and how high the crew's heads are, in scene units. */
export const RING_RADIUS = 7;
export const HEAD_HEIGHT = 1.35;

/**
 * Seats for `ids` round the ring on the station's deck (the x-z plane), the first one at the back and the rest round it.
 * Each seat: { id, x, z, angle } with the angle the seat faces the core from.
 */
export const ringSeats = (ids, radius = RING_RADIUS) =>
  ids.map((id, i) => {
    const angle = Math.PI + (i / Math.max(1, ids.length)) * Math.PI * 2;
    return { id, x: +(radius * Math.sin(angle)).toFixed(4), z: +(radius * Math.cos(angle)).toFixed(4), angle };
  });

/** Where a hand-off starts or ends: the top of the core for the owner, a crew member's head for anyone else. */
export const anchorOf = (id, seats) => {
  if (id === CORE) return [0, 1.9, 0];
  const seat = seats.find((s) => s.id === id);
  return seat ? [seat.x, HEAD_HEIGHT + 0.5, seat.z] : [0, 1.9, 0];
};

/** The middle point a flight bends round: above the two ends, higher the further apart they are. */
export const flightMid = (from, to) => {
  const span = Math.hypot(to[0] - from[0], to[2] - from[2]);
  return [(from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 1.2 + span * 0.35, (from[2] + to[2]) / 2];
};

/** A point along a quadratic curve at t (0..1). */
export const along = (from, mid, to, t) => from.map((_, k) => (1 - t) ** 2 * from[k] + 2 * (1 - t) * t * mid[k] + t ** 2 * to[k]);

/** Ease in and out, for the craft's flight. */
export const ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

// what an event's action says about a hand-off
const HANDOFF = new Set(['started', 'delegated', 'assigned']);

/**
 * The hand-offs in a list of events (newest first, as the server keeps them): who gave the task (`from`, the owner when the
 * event does not say), who took it (`to`), what it was, and when. Only events about known crew are kept.
 */
export const handoffsIn = (events, known) => {
  const ids = new Set(known);
  const out = [];
  for (const event of events ?? []) {
    if (!event || !HANDOFF.has(event.action)) continue;
    const who = event.agentId ?? event.agent; // the app's events say agentId, the server's say agent
    const to = event.to ?? who;
    const from = event.from ?? (event.action === 'delegated' ? who : CORE);
    if (!ids.has(to) || (from !== CORE && !ids.has(from)) || from === to) continue;
    out.push({ id: event.id ?? `${from}-${to}-${event.at}`, from, to, text: taskTitle(event.text), at: event.at });
  }
  return out;
};

/** The task's own words out of a server line like `Minh Codex accepted “Fix the login”`. */
export const taskTitle = (text) => {
  const quoted = String(text ?? '').match(/[“"]([^”"]+)[”"]/);
  return (quoted ? quoted[1] : String(text ?? '')).trim();
};

/** The tone a status reads as on the station. */
export const statusTone = (status) =>
  ({ working: 'busy', running: 'busy', thinking: 'busy', completed: 'done', failed: 'failed', idle: 'idle' })[status] ?? 'offline';

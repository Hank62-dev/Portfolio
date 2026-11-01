// Pure geometry for the exhibition: a round plaza (with the living stack in the middle) that opens into a long
// nave. Projects hang on both walls of the nave, grouped into zones, and a visitor can walk the whole thing.
// Everything is in metres. Facing -z is "down the nave"; a rotation `yaw` turns the way a head does, so the
// camera looks along (-sin yaw, 0, -cos yaw).

export const EYE = 1.6;
export const FRAME_SIZE = [2.4, 1.5];
export const FRAME_HEIGHT = 1.75;

export const PLAZA_RADIUS = 6.2;
export const NAVE = {
  halfWidth: 4.6, // the nave is 9.2 m across
  spacing: 5, // between frames along one wall (leaves room for a reading board beside each)
  firstOffset: 5.2, // from the plaza edge to the first row
  zoneGap: 3.6, // clear floor between one zone and the next
  height: 4.8,
};
export const VIEW_DISTANCE = 2.8; // how far from the wall you stand to look at a frame

/** Where the visitor stands at the start: on the plaza, looking down the nave past the plinth. */
export const HUB = { position: [0, EYE, 3.6], yaw: 0 };

/** Where the nave begins (the plaza wall and the nave walls meet here). */
export const NAVE_START = -Math.sqrt(PLAZA_RADIUS ** 2 - NAVE.halfWidth ** 2);

/**
 * Lays out one frame per entry of `wings` (a wing id each, in display order). Wings become consecutive zones
 * down the nave; inside a zone the frames alternate left wall, right wall, one row every `spacing` metres.
 * Returns the frames (pose + where to stand), the zones (for signs) and the nave's total length.
 */
export const buildExhibition = (wings) => {
  const order = [...new Set(wings)];
  const slots = new Array(wings.length);
  const zones = [];
  let cursor = NAVE_START - NAVE.firstOffset + NAVE.spacing / 2; // z of the zone's leading edge

  order.forEach((wing) => {
    const members = wings.map((w, index) => ({ w, index })).filter(({ w }) => w === wing);
    const rows = Math.ceil(members.length / 2);
    zones.push({ wing, count: members.length, z: cursor + 1.1, rows });

    members.forEach(({ index }, k) => {
      const left = k % 2 === 0;
      const z = cursor - NAVE.spacing / 2 - Math.floor(k / 2) * NAVE.spacing;
      const wallX = (left ? -1 : 1) * (NAVE.halfWidth - 0.06);
      const standX = (left ? -1 : 1) * (NAVE.halfWidth - VIEW_DISTANCE);
      const yaw = left ? Math.PI / 2 : -Math.PI / 2; // frame faces the nave; the visitor faces the frame
      slots[index] = {
        index,
        wing,
        side: left ? 'left' : 'right',
        position: [wallX, FRAME_HEIGHT, z],
        yaw,
        station: { position: [standX, EYE, z], yaw },
      };
    });
    cursor -= rows * NAVE.spacing + NAVE.zoneGap;
  });

  return { slots, zones, length: Math.abs(cursor) + 4 };
};

const inPlaza = (x, z, margin) => Math.hypot(x, z) <= PLAZA_RADIUS - margin;
const inNave = (x, z, length, margin) => Math.abs(x) <= NAVE.halfWidth - margin && z <= 0 && z >= -(length - margin);

export const PLINTH_RADIUS = 1.55; // the centrepiece's plinth, which you walk round rather than through

const awayFromPlinth = ([x, z]) => {
  const d = Math.hypot(x, z);
  if (d >= PLINTH_RADIUS) return [x, z];
  if (d < 1e-6) return [0, PLINTH_RADIUS];
  return [(x / d) * PLINTH_RADIUS, (z / d) * PLINTH_RADIUS];
};

/** Keeps a walker inside the exhibition (the union of the plaza and the nave), sliding along walls. */
export const constrain = (x, z, length, margin = 0.45) => awayFromPlinth(keepInside(x, z, length, margin));

const keepInside = (x, z, length, margin) => {
  if (inPlaza(x, z, margin) || inNave(x, z, length, margin)) return [x, z];

  const halfW = NAVE.halfWidth - margin;
  const rect = [Math.max(-halfW, Math.min(halfW, x)), Math.max(-(length - margin), Math.min(0, z))];
  const d = Math.hypot(x, z) || 1;
  const k = (PLAZA_RADIUS - margin) / d;
  const circle = [x * k, z * k];

  const dist = (p) => Math.hypot(p[0] - x, p[1] - z);
  // a point on the plaza circle only counts if it is actually in the plaza part (not out past the nave mouth)
  return dist(rect) <= dist(circle) ? rect : circle;
};

/** Wraps any integer into 0..count-1 (so "previous" from the first frame is the last). */
export const wrapIndex = (index, count) => ((index % count) + count) % count;

/** The next frame to visit; from the plaza (-1) "next" is the first and "previous" the last. */
export const stepFrame = (current, direction, count) => (current < 0 ? (direction > 0 ? 0 : count - 1) : wrapIndex(current + direction, count));

export const clampPitch = (pitch) => Math.max(-0.85, Math.min(0.85, pitch));

/** The signed shortest turn from `from` to `to`, in radians: the view never spins the long way round. */
export const shortestTurn = (from, to) => {
  const full = Math.PI * 2;
  return ((((to - from + Math.PI) % full) + full) % full) - Math.PI;
};

/** Breaks text into lines of at most `max` characters, on word boundaries, up to `lines` lines (then "…"). */
export const wrapText = (text, max, lines = 4) => {
  const out = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && `${line} ${word}`.length > max) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  if (out.length > lines) {
    const kept = out.slice(0, lines);
    kept[lines - 1] = `${kept[lines - 1].replace(/[\s.,;:]+$/, '')}…`;
    return kept;
  }
  return out;
};

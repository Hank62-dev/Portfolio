// The curved gallery as numbers: one white wall bending round to the left, every work hung along it, and the rail the camera
// rides inside the curve. Pure, so the hanging can be tested without a canvas. Angles are in radians round the y axis, 0 is
// straight ahead (−z), and the gallery turns to the left as it goes (the angle grows).

export const WALL_RADIUS = 17; // the wall the works hang on
export const INNER_RADIUS = 8.4; // the low inner wall on the other side of the walk
export const RAIL_RADIUS = 10.6; // where the visitor walks
export const WALL_HEIGHT = 5.2;
export const HANG_HEIGHT = 1.72; // the centre of a work, at eye level
export const STEP = 0.265; // the angle from one work to the next (room for a frame and its wall text)
export const START = -0.27; // the angle of the first work (a little to the right of straight ahead)
export const FOCUS_DISTANCE = 3.1; // how far from a work the camera stands to look at it (at the least)
export const TEXT_GAP = 0.3; // between a frame's right edge and its wall text
export const TEXT_SIZE = [1.1, 1.54]; // the wall text printed beside each work
// the middle of a work and its wall text together, along the wall from the work's centre (the same for any frame width)
export const VIEW_ASIDE = (TEXT_GAP + TEXT_SIZE[0]) / 2;

/** The angle of work `i` on the wall. */
export const angleOf = (i) => START + i * STEP;

/** A point at `angle` on a circle of `radius` round the centre of the gallery, at height `y`: [x, y, z]. */
export const onCircle = (angle, radius, y = 0) => [-Math.sin(angle) * radius, y, -Math.cos(angle) * radius];

/** Where work `i` hangs and which way it faces (towards the centre): { position, rotationY }. */
export const hang = (i) => {
  const a = angleOf(i);
  return { position: onCircle(a, WALL_RADIUS, HANG_HEIGHT), rotationY: a };
};

/** The arc the walls run along: from the entrance (where the title is painted) to a little after the last work. */
export const arcOf = (count) => {
  const from = START - STEP * 2.6;
  const to = angleOf(Math.max(0, count - 1)) + STEP * 2.4;
  return { from, to, length: to - from };
};

/**
 * The camera on the rail at `t` (a work index, fractional between works): it stands a little back along the curve and looks
 * at the wall ahead of it, so the works come round the bend one after another.
 */
export const railView = (t) => {
  const a = angleOf(t);
  return {
    position: onCircle(a - 0.33, RAIL_RADIUS, 1.66),
    target: onCircle(a + 0.08, WALL_RADIUS, 1.6),
  };
};

/**
 * The camera standing in front of work `i`, looking at it. `aside` (metres along the wall, to the right) moves the view so the
 * work and the wall text beside it share the screen; `distance` is how far back the camera stands.
 */
export const focusView = (i, aside = 0, distance = FOCUS_DISTANCE) => {
  const a = angleOf(i) - aside / WALL_RADIUS;
  return {
    position: onCircle(a, WALL_RADIUS - distance, HANG_HEIGHT),
    target: onCircle(a, WALL_RADIUS, HANG_HEIGHT),
  };
};

/**
 * Where something `along` metres to the right of a work's centre sits on the curved wall, in that work's own frame (x to the
 * right, z towards the centre of the gallery), and how it turns to keep facing the centre: { position: [x, z], rotationY }.
 */
export const alongWall = (along, lift = 0) => {
  const phi = along / WALL_RADIUS;
  return { position: [Math.sin(phi) * (WALL_RADIUS - lift), WALL_RADIUS - Math.cos(phi) * (WALL_RADIUS - lift)], rotationY: -phi };
};

/** How far back to stand so `width` metres of wall fit across a screen of `aspect` with a vertical field of `fov` degrees. */
export const distanceFor = (width, aspect, fov) => {
  const half = Math.atan(Math.tan(((fov / 2) * Math.PI) / 180) * aspect);
  return Math.max(FOCUS_DISTANCE, width / 2 / Math.tan(half));
};

/** Keeps a rail position inside the gallery. */
export const clampRail = (t, count) => Math.min(Math.max(t, -0.6), Math.max(0, count - 1) + 0.4);

/** Which work the rail is nearest to. */
export const nearest = (t, count) => Math.min(Math.max(Math.round(t), 0), Math.max(0, count - 1));

/** A colour scheme for a work without a picture, chosen from its name so it is always the same one. */
export const paletteOf = (seed) => {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length];
};

// grounds, a strong colour and an accent, in the manner of printed exhibition posters
const PALETTES = [
  { ground: '#1f4d3a', main: '#e9c46a', accent: '#e76f51', ink: '#f6efe0' },
  { ground: '#f2e8d5', main: '#c1272d', accent: '#1d3557', ink: '#1b1b1b' },
  { ground: '#0f2a44', main: '#f4a261', accent: '#a8dadc', ink: '#f1faee' },
  { ground: '#e63946', main: '#1d1d1b', accent: '#f1c453', ink: '#fdf6ec' },
  { ground: '#f6c445', main: '#264653', accent: '#d62828', ink: '#1b1b1b' },
  { ground: '#2b2d42', main: '#ef8354', accent: '#bfc0c0', ink: '#ffffff' },
  { ground: '#d8e2dc', main: '#2a9d8f', accent: '#e76f51', ink: '#1b1b1b' },
  { ground: '#5e2a84', main: '#f9c74f', accent: '#90be6d', ink: '#fff7e8' },
];

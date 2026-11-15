import { LAYERS } from '../../data/projects';

// The geometry of the Stack section's picture, kept free of the canvas so it can be tested.
//
// Every technology is a body on one of four rings, one ring per layer. Looked at from above (p = 0) the
// rings are concentric orbits round a core; as the view drops to the side (p = 1) they grow to the same
// size and separate in height, and the orbits become the four plates of the stack.

/**
 * Radius of each ring seen from above. Interface has by far the most technologies, so it gets the widest
 * orbit and delivery the tightest. Units: fractions of the picture's half size.
 */
export const RING_TOP = [0.94, 0.72, 0.52, 0.32];
/** The common radius once the rings are plates. */
export const PLATE_RADIUS = 0.66;
/** Height between two plates. */
export const PLATE_GAP = 0.38;
/** Turns per second for each ring; neighbours turn opposite ways. */
export const RING_SPEED = [0.05, -0.035, 0.027, -0.02];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/** Every technology as a body: its ring, its share of the ring, and how many projects use it. */
export const buildBodies = (stack) =>
  LAYERS.flatMap((layer, ring) => {
    const list = stack[layer] ?? [];
    return list.map(({ tech, slugs }, i) => ({
      tech,
      slugs,
      count: slugs.length,
      ring,
      // evenly round the ring, each ring started at a different angle so the spokes never line up
      angle: (i / Math.max(1, list.length)) * Math.PI * 2 + ring * 0.9,
    }));
  });

/** The view for a scroll progress: how high the eye is above the plane and how far apart the rings are. */
export const viewAt = (progress) => {
  const s = smooth(clamp01(progress));
  return { elevation: lerp(Math.PI / 2 - 0.02, 0.3, s), spread: s };
};

export const ringRadius = (ring, spread) => lerp(RING_TOP[ring], PLATE_RADIUS, spread);
/** Interface on top, delivery at the bottom. */
export const ringHeight = (ring, spread) => (1.5 - ring) * PLATE_GAP * spread;

const FOCAL = 3.2;

/**
 * A point in the picture's space (y up) to the screen: x right, y down, both in picture units around
 * the centre, plus `depth` (larger is nearer the eye) and the perspective `scale` at that depth.
 * `yaw` turns the whole thing about the vertical axis.
 */
export const project = (x, y, z, { elevation }, yaw = 0) => {
  const rx = x * Math.cos(yaw) - z * Math.sin(yaw);
  const rz = x * Math.sin(yaw) + z * Math.cos(yaw);
  const ce = Math.cos(elevation);
  const se = Math.sin(elevation);
  const depth = y * se + rz * ce;
  const scale = FOCAL / (FOCAL - depth);
  return { x: rx * scale, y: (-y * ce + rz * se) * scale, depth, scale };
};

/** Where a body is at `time` (seconds) for a view. */
export const placeBody = (body, view, time, yaw = 0) => {
  const a = body.angle + time * RING_SPEED[body.ring] * Math.PI * 2;
  const r = ringRadius(body.ring, view.spread);
  return project(Math.cos(a) * r, ringHeight(body.ring, view.spread), Math.sin(a) * r, view, yaw);
};

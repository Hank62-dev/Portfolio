// A tiny physics step for the hero's floating pieces: spheres that spring back to a home spot, bump into
// each other and into the stack in the middle, and are shoved by the pointer. Plain numbers, no three.js,
// so it can be tested and costs nothing to load. Capsules are treated as spheres: they are short enough.

/**
 * Lays out `count` bodies on a loose ring around the stack (never straight in front of it), with radii
 * between 0.22 and 0.5. `rand` is a 0..1 generator, so the layout is the same on every visit.
 */
export const createBodies = (count, rand) =>
  Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.5;
    const ring = 3.0 + rand() * 1.3;
    const hx = Math.cos(angle) * ring;
    const hy = Math.sin(angle) * ring * 0.82;
    const hz = -1.8 + rand() * 3.0;
    return {
      x: hx,
      y: hy,
      z: hz,
      vx: 0,
      vy: 0,
      vz: 0,
      hx,
      hy,
      hz,
      r: 0.22 + rand() * 0.28,
      kind: i % 3 === 0 ? 'sphere' : 'capsule',
      tone: i % 4,
      phase: rand() * Math.PI * 2,
    };
  });

const SPRING = 2.4;
const DRAG = 2.2; // per second
const RESTITUTION = 0.55;
const POINTER_PUSH = 46;
const MAX_SPEED = 14;

/**
 * Advances the bodies by `dt` seconds (clamped, so a stalled tab does not explode the scene).
 *   pointer   { x, y, z, radius } in world units, or null when the pointer is away
 *   core      radius of the sphere at the origin that bodies cannot enter (the stack)
 *   time      seconds, for the gentle bob of each home spot
 *   kick      when true, every body gets a push outward (a click on the hero)
 */
export const step = (bodies, dt, { pointer = null, core = 2.2, time = 0, kick = false } = {}) => {
  const h = Math.min(dt, 1 / 30);
  const drag = Math.exp(-DRAG * h);

  for (const b of bodies) {
    // spring towards a home that bobs a little, so the cloud never looks frozen
    const bob = Math.sin(time * 0.7 + b.phase) * 0.18;
    b.vx += (b.hx - b.x) * SPRING * h;
    b.vy += (b.hy + bob - b.y) * SPRING * h;
    b.vz += (b.hz - b.z) * SPRING * h;

    if (pointer) {
      const dx = b.x - pointer.x;
      const dy = b.y - pointer.y;
      const dz = (b.z - pointer.z) * 0.35; // the pointer reaches through depth: what you see under it moves
      const d = Math.hypot(dx, dy, dz) || 1e-4;
      const reach = pointer.radius + b.r;
      if (d < reach) {
        const f = (1 - d / reach) * POINTER_PUSH * h;
        b.vx += (dx / d) * f;
        b.vy += (dy / d) * f;
        b.vz += (dz / d) * f * 0.5;
      }
    }

    if (kick) {
      const d = Math.hypot(b.x, b.y, b.z) || 1;
      b.vx += (b.x / d) * 6;
      b.vy += (b.y / d) * 6;
      b.vz += (b.z / d) * 3;
    }

    b.vx *= drag;
    b.vy *= drag;
    b.vz *= drag;
    const speed = Math.hypot(b.vx, b.vy, b.vz);
    if (speed > MAX_SPEED) {
      const s = MAX_SPEED / speed;
      b.vx *= s;
      b.vy *= s;
      b.vz *= s;
    }
    b.x += b.vx * h;
    b.y += b.vy * h;
    b.z += b.vz * h;
  }

  // pairs: push overlapping bodies apart and bounce their velocities along the contact normal
  for (let i = 0; i < bodies.length; i += 1) {
    const a = bodies[i];
    for (let j = i + 1; j < bodies.length; j += 1) {
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dy, dz) || 1e-4;
      const overlap = a.r + b.r - d;
      if (overlap <= 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      const nz = dz / d;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      a.z -= nz * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;
      b.z += nz * overlap * 0.5;
      const closing = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny + (a.vz - b.vz) * nz;
      if (closing > 0) {
        const j2 = closing * (1 + RESTITUTION) * 0.5;
        a.vx -= nx * j2;
        a.vy -= ny * j2;
        a.vz -= nz * j2;
        b.vx += nx * j2;
        b.vy += ny * j2;
        b.vz += nz * j2;
      }
    }
  }

  // the stack in the middle is solid
  for (const b of bodies) {
    const d = Math.hypot(b.x, b.y, b.z) || 1e-4;
    const min = core + b.r;
    if (d < min) {
      const nx = b.x / d;
      const ny = b.y / d;
      const nz = b.z / d;
      b.x = nx * min;
      b.y = ny * min;
      b.z = nz * min;
      const into = b.vx * nx + b.vy * ny + b.vz * nz;
      if (into < 0) {
        b.vx -= nx * into * (1 + RESTITUTION);
        b.vy -= ny * into * (1 + RESTITUTION);
        b.vz -= nz * into * (1 + RESTITUTION);
      }
    }
  }
};

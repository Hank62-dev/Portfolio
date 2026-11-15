import { describe, expect, it } from 'vitest';
import { seeded } from './config';
import { createBodies, step } from './physics';

const run = (bodies, seconds, opts) => {
  for (let t = 0; t < seconds; t += 1 / 60) step(bodies, 1 / 60, { ...opts, time: t });
};

describe('hero physics', () => {
  it('lays the same bodies out every time, outside the stack', () => {
    const a = createBodies(14, seeded(7));
    const b = createBodies(14, seeded(7));
    expect(a).toEqual(b);
    for (const body of a) expect(Math.hypot(body.hx, body.hy, body.hz)).toBeGreaterThan(2.2 + body.r);
  });

  it('settles with no body inside another or inside the stack', () => {
    const bodies = createBodies(14, seeded(3));
    run(bodies, 6, { core: 2.2 });
    for (let i = 0; i < bodies.length; i += 1) {
      const a = bodies[i];
      expect(Math.hypot(a.x, a.y, a.z)).toBeGreaterThanOrEqual(2.2 + a.r - 1e-6);
      for (let j = i + 1; j < bodies.length; j += 1) {
        const b = bodies[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan((a.r + b.r) * 0.95);
      }
    }
  });

  it('pushes a body away from the pointer, then lets it drift home', () => {
    const [body] = createBodies(1, seeded(1));
    const home = { x: body.hx, y: body.hy };
    const pointer = { x: body.x - 0.3, y: body.y, z: body.z, radius: 1.2 };
    run([body], 0.3, { pointer, core: 0 });
    expect(body.x).toBeGreaterThan(home.x + 0.2);
    run([body], 8, { core: 0 });
    expect(Math.hypot(body.x - home.x, body.y - home.y)).toBeLessThan(0.3);
  });

  it('stays finite when a frame takes far too long', () => {
    const bodies = createBodies(8, seeded(5));
    step(bodies, 5, { kick: true });
    for (const b of bodies) expect(Number.isFinite(b.x + b.y + b.z)).toBe(true);
  });
});

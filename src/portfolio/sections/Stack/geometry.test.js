import { describe, expect, it } from 'vitest';
import { buildBodies, placeBody, project, ringHeight, ringRadius, viewAt, RING_TOP, PLATE_RADIUS } from './geometry';

const stack = {
  interface: [{ tech: 'React', slugs: ['a', 'b'] }, { tech: 'Vite', slugs: ['a'] }],
  service: [{ tech: 'Node.js', slugs: ['b'] }],
  data: [],
  delivery: [{ tech: 'Docker', slugs: ['a', 'b', 'c'] }],
};

describe('orbit geometry', () => {
  it('makes one body per technology, on its layer’s ring', () => {
    const bodies = buildBodies(stack);
    expect(bodies.map((b) => [b.tech, b.ring, b.count])).toEqual([
      ['React', 0, 2],
      ['Vite', 0, 1],
      ['Node.js', 1, 1],
      ['Docker', 3, 3],
    ]);
    // two bodies on one ring sit half a turn apart
    expect(bodies[1].angle - bodies[0].angle).toBeCloseTo(Math.PI);
  });

  it('starts as concentric orbits seen from above and ends as stacked plates seen from the side', () => {
    const top = viewAt(0);
    const side = viewAt(1);
    expect(top.spread).toBe(0);
    expect(side.spread).toBe(1);
    expect(top.elevation).toBeGreaterThan(side.elevation);
    expect(ringRadius(0, 0)).toBe(RING_TOP[0]);
    expect(ringRadius(3, 1)).toBe(PLATE_RADIUS);
    // from above every ring is at the same height; from the side interface is the highest
    expect(ringHeight(0, 0)).toBeCloseTo(0);
    expect(ringHeight(0, 1)).toBeGreaterThan(ringHeight(3, 1));
    // progress outside 0..1 is held at the ends
    expect(viewAt(-2)).toEqual(top);
    expect(viewAt(5)).toEqual(side);
  });

  it('draws higher plates higher on screen once seen from the side', () => {
    const view = viewAt(1);
    const centre = (ring) => project(0, ringHeight(ring, view.spread), 0, view).y;
    expect(centre(0)).toBeLessThan(centre(1));
    expect(centre(2)).toBeLessThan(centre(3));
  });

  it('keeps a body on its ring as time passes', () => {
    const [body] = buildBodies(stack);
    const view = viewAt(0);
    [0, 1.3, 7].forEach((t) => {
      const p = placeBody(body, view, t);
      expect(Math.hypot(p.x, p.y) / p.scale).toBeCloseTo(RING_TOP[0], 1);
    });
  });
});

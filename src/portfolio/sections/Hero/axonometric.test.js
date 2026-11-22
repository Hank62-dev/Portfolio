import { describe, expect, it } from 'vitest';
import { AX, AY, box, cylinder, iso, plateAt } from './axonometric';

describe('the projection', () => {
  it('puts the plate\'s centre on its centre and lifts points by their height', () => {
    expect(iso(100, 50, 0, 0)).toEqual([100, 50]);
    expect(iso(100, 50, 0, 0, 20)).toEqual([100, 30]);
  });

  it('runs x to the lower right and y to the lower left', () => {
    const [xr, yr] = iso(0, 0, 10, 0);
    const [xl, yl] = iso(0, 0, 0, 10);
    expect(xr).toBeCloseTo(10 * AX);
    expect(yr).toBeCloseTo(10 * AY);
    expect(xl).toBeCloseTo(-10 * AX);
    expect(yl).toBeCloseTo(10 * AY);
  });
});

describe('the shapes', () => {
  it('draws a box as three faces of four corners', () => {
    const b = box(0, 0, 0, 0, 10, 10, 5);
    for (const face of [b.top, b.right, b.left]) expect(face.split(' ')).toHaveLength(4);
  });

  it('draws a cylinder whose top sits its height above its foot', () => {
    const c = cylinder(0, 0, 0, 0, 10, 30);
    expect(c.top.cy).toBe(-30);
    expect(c.top.rx).toBeGreaterThan(c.top.ry);
  });

  it('knows which plate the pointer is over', () => {
    expect(plateAt(105, [100, 200, 300], 30)).toBe(0);
    expect(plateAt(150, [100, 200, 300], 30)).toBe(-1);
  });
});

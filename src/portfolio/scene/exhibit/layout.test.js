import { describe, expect, it } from 'vitest';
import { FOCUS_DISTANCE, STEP, TEXT_GAP, TEXT_SIZE, WALL_RADIUS, alongWall, angleOf, arcOf, clampRail, distanceFor, focusView, hang, nearest, onCircle, paletteOf, railView } from './layout';

const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

describe('the curved gallery', () => {
  it('puts straight ahead at angle 0 and turns to the left', () => {
    const [x, , z] = onCircle(0, 10);
    expect(x).toBeCloseTo(0);
    expect(z).toBeCloseTo(-10);
    expect(onCircle(0.5, 10)[0]).toBeLessThan(0);
  });

  it('hangs every work on the wall, facing the centre, one step apart', () => {
    const a = hang(0);
    const b = hang(1);
    expect(Math.hypot(a.position[0], a.position[2])).toBeCloseTo(WALL_RADIUS);
    expect(b.rotationY - a.rotationY).toBeCloseTo(angleOf(1) - angleOf(0));
    expect(dist(a.position, b.position)).toBeGreaterThan(2.5); // room for a frame and the wall between
  });

  it('leaves room for the wall text between one work and the next, and never closes the circle', () => {
    const widest = 2.14; // a landscape frame
    expect(widest / 2 + TEXT_GAP + TEXT_SIZE[0] + 0.5).toBeLessThan(STEP * WALL_RADIUS - widest / 2);
    expect(arcOf(19).length).toBeLessThan(Math.PI * 2);
  });

  it('puts the wall text on the curve of the wall, not in front of it or behind it', () => {
    const { position, rotationY } = alongWall(2, 0);
    expect(Math.hypot(position[0], WALL_RADIUS - position[1])).toBeCloseTo(WALL_RADIUS);
    expect(rotationY).toBeCloseTo(-2 / WALL_RADIUS);
    expect(alongWall(0, 0.01).position[1]).toBeCloseTo(0.01);
  });

  it('steps back far enough to see the work and its text on a narrow screen', () => {
    expect(distanceFor(3, 16 / 9, 54)).toBeCloseTo(FOCUS_DISTANCE);
    expect(distanceFor(3.6, 0.8, 54)).toBeGreaterThan(FOCUS_DISTANCE);
  });

  it('runs the walls a little past the first and the last work', () => {
    const arc = arcOf(5);
    expect(arc.from).toBeLessThan(angleOf(0));
    expect(arc.to).toBeGreaterThan(angleOf(4));
  });

  it('stands square in front of a work to look at it', () => {
    const view = focusView(3);
    expect(dist(view.position, view.target)).toBeCloseTo(FOCUS_DISTANCE);
    expect(dist(view.target, hang(3).position)).toBeCloseTo(0);
    expect(dist(focusView(3, 0.6).target, hang(3).position)).toBeCloseTo(0.6, 1);
  });

  it('keeps the rail inside the gallery and knows the nearest work', () => {
    expect(clampRail(-5, 10)).toBeCloseTo(-0.6);
    expect(clampRail(50, 10)).toBeCloseTo(9.4);
    expect(nearest(2.6, 10)).toBe(3);
    expect(nearest(-0.4, 10)).toBe(0);
    const v = railView(2);
    expect(Math.hypot(v.position[0], v.position[2])).toBeLessThan(WALL_RADIUS);
  });

  it('gives a work the same colours every time', () => {
    expect(paletteOf('meetly')).toEqual(paletteOf('meetly'));
    expect(paletteOf('meetly').ground).toMatch(/^#/);
  });
});

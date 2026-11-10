import { describe, expect, it } from 'vitest';
import { STICKY_COLORS, STICKY_SIZE, clampSticky, nextColor, nextSpot } from './stickies';

describe('sticky notes', () => {
  it('keep their header on screen and are never bigger than it', () => {
    expect(clampSticky({ x: 5000, y: 5000, w: 260, h: 220 }, 1280, 800)).toEqual({ x: 1200, y: 760, w: 260, h: 220 });
    expect(clampSticky({ x: -900, y: -50, w: 260, h: 220 }, 1280, 800)).toMatchObject({ x: -172, y: 8 });
    expect(clampSticky({ x: 0, y: 0, w: 2000, h: 2000 }, 390, 700)).toMatchObject({ w: 374, h: STICKY_SIZE.maxH });
    expect(clampSticky({ x: 0, y: 0, w: 10, h: 10 }, 1280, 800)).toMatchObject({ w: STICKY_SIZE.minW, h: STICKY_SIZE.minH });
  });

  it('come in near the top right, each new one a step along, wrapping round', () => {
    const first = nextSpot([], 1280, 800);
    const second = nextSpot([{}], 1280, 800);
    expect(first).toMatchObject({ x: 1280 - 260 - 24, y: 88, w: 260 });
    expect(second.x).toBeLessThan(first.x);
    expect(second.y).toBeGreaterThan(first.y);
    expect(nextSpot(Array(6).fill({}), 1280, 800)).toEqual(first);
    expect(nextSpot([], 390, 700).w).toBe(260);
  });

  it('go round the colours', () => {
    expect(nextColor('yellow')).toBe('pink');
    expect(nextColor(STICKY_COLORS.at(-1))).toBe('yellow');
    expect(nextColor('unknown')).toBe('yellow');
  });
});

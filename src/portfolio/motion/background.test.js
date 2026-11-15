import { describe, expect, it } from 'vitest';
import { advanceTrail, looksSane, TRAIL } from './BackgroundField';

describe('background shader sanity check', () => {
  it('accepts the dark and light backgrounds', () => {
    expect(looksSane([12, 13, 15, 255], false)).toBe(true);
    expect(looksSane([243, 238, 229, 255], true)).toBe(true);
  });

  it('rejects a blown-out white frame on the dark theme (the bug this guards against)', () => {
    expect(looksSane([255, 255, 255, 255], false)).toBe(false);
  });

  it('rejects a black or grey frame on the light theme', () => {
    expect(looksSane([0, 0, 0, 255], true)).toBe(false);
    expect(looksSane([120, 118, 112, 255], true)).toBe(false);
  });
});

describe('pointer trail', () => {
  it('adds a point when the pointer moves and lets every point fade away', () => {
    const trail = new Float32Array(TRAIL * 3);
    let head = advanceTrail(trail, 0, 0.5, 0.5);
    expect(head).toBe(1);
    expect(trail[2]).toBeGreaterThan(0);
    // standing still adds nothing and the point fades out
    for (let i = 0; i < 60; i += 1) head = advanceTrail(trail, head, 0.5, 0.5);
    expect(head).toBe(1);
    expect(trail[2]).toBe(0);
  });

  it('reuses the oldest slot once the path is full', () => {
    const trail = new Float32Array(TRAIL * 3);
    let head = 0;
    for (let i = 0; i <= TRAIL; i += 1) head = advanceTrail(trail, head, 0.05 * i, 0.5);
    expect(head).toBe(1);
    expect(trail[0]).toBeCloseTo(0.05 * TRAIL);
  });
});

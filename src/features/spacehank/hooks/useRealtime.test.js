import { describe, expect, it } from 'vitest';
import { backoffMs } from './useRealtime';

describe('the pause before reconnecting', () => {
  const none = () => 0;
  it('doubles from one second and stops at twenty', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 12].map((n) => backoffMs(n, none))).toEqual([1000, 2000, 4000, 8000, 16000, 20000, 20000, 20000]);
  });
  it('adds a little spread so many phones do not come back at the same instant', () => {
    expect(backoffMs(0, () => 0.99)).toBeGreaterThan(1000);
    expect(backoffMs(0, () => 0.99)).toBeLessThan(1400);
  });
});

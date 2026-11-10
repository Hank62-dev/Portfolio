import { describe, expect, it } from 'vitest';
import { clamp } from './math';
import { dayKey } from './date';

describe('small shared helpers', () => {
  it('names a day by its local date, with padded month and day', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 10, 10))).toBe('2026-11-10');
  });

  it('keeps a value between two others, 0 and 1 by default', () => {
    expect(clamp(1.4)).toBe(1);
    expect(clamp(-2)).toBe(0);
    expect(clamp(5, 0.25, 3)).toBe(3);
    expect(clamp(0.1, 0.25, 3)).toBe(0.25);
    expect(clamp(2, 0.25, 3)).toBe(2);
  });
});

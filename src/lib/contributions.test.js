import { describe, expect, it } from 'vitest';
import { computeStreaks, lastDays, sumCounts } from './contributions';

const day = (date, count) => ({ date, count });

describe('contributions helpers', () => {
  it('sums and slices counts', () => {
    const days = [day('2026-01-01', 2), day('2026-01-02', 0), day('2026-01-03', 5)];
    expect(sumCounts(days)).toBe(7);
    expect(lastDays(days, 2).map((d) => d.date)).toEqual(['2026-01-02', '2026-01-03']);
  });

  it('finds the longest and current streak', () => {
    const days = [
      day('2026-01-01', 1),
      day('2026-01-02', 1),
      day('2026-01-03', 1),
      day('2026-01-04', 0),
      day('2026-01-05', 2),
      day('2026-01-06', 1),
    ];
    expect(computeStreaks(days)).toEqual({ current: 2, longest: 3 });
  });

  it('keeps a streak alive when today is still empty', () => {
    const days = [day('2026-01-01', 1), day('2026-01-02', 1), day('2026-01-03', 0)];
    expect(computeStreaks(days).current).toBe(2);
  });

  it('handles unsorted input and no activity', () => {
    expect(computeStreaks([day('2026-01-02', 1), day('2026-01-01', 1)])).toEqual({ current: 2, longest: 2 });
    expect(computeStreaks([day('2026-01-01', 0)])).toEqual({ current: 0, longest: 0 });
  });
});

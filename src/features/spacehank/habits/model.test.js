import { describe, expect, it } from 'vitest';
import { dayKey, daysSince, heatmap, longestStreak, moodLift, newHabit, rate, stageOf, streak, toggleDay } from './model';

const today = new Date(2026, 10, 2); // Monday 2 Nov 2026
const days = (...list) => list;

describe('streaks', () => {
  it('counts days in a row ending today', () => {
    expect(streak(days('2026-10-31', '2026-11-01', '2026-11-02'), today)).toBe(3);
  });
  it('keeps the streak alive until the end of today when only yesterday is done', () => {
    expect(streak(days('2026-10-31', '2026-11-01'), today)).toBe(2);
  });
  it('is broken by a missed day', () => {
    expect(streak(days('2026-10-29', '2026-11-02'), today)).toBe(1);
    expect(streak(days('2026-10-20'), today)).toBe(0);
  });
  it('knows the best run ever', () => {
    expect(longestStreak(days('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11'))).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
  it('counts days since the last time', () => {
    expect(daysSince(days('2026-10-30'), today)).toBe(3);
    expect(daysSince([], today)).toBe(Infinity);
  });
});

describe('toggleDay and newHabit', () => {
  it('adds a day in order and removes it again', () => {
    expect(toggleDay(['2026-11-01'], '2026-10-31')).toEqual(['2026-10-31', '2026-11-01']);
    expect(toggleDay(['2026-11-01'], '2026-11-01')).toEqual([]);
  });
  it('starts a habit with no days', () => {
    expect(newHabit('  Read  ')).toMatchObject({ name: 'Read', days: [] });
  });
});

describe('stageOf', () => {
  const run = (n) => Array.from({ length: n }, (_, i) => dayKey(new Date(2026, 10, 2 - i)));
  it('grows with the streak', () => {
    expect([0, 1, 3, 7, 14, 30].map((n) => stageOf(run(n), today).stage)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(stageOf(run(7), today).name).toBe('plant');
  });
  it('wilts after more than two days missed, but not for a brand-new habit', () => {
    expect(stageOf(days('2026-10-20'), today).wilting).toBe(true);
    expect(stageOf(days('2026-10-31'), today).wilting).toBe(false);
    expect(stageOf([], today).wilting).toBe(false);
  });
});

describe('rate and heatmap', () => {
  it('is the share of recent days done', () => {
    expect(rate(days('2026-11-02', '2026-11-01', '2026-10-31'), 10, today)).toBe(30);
  });
  it('lays out weeks as columns of seven days, Monday first, ending this week', () => {
    const map = heatmap(days('2026-11-02'), 4, today);
    expect(map).toHaveLength(4);
    expect(map.every((w) => w.length === 7)).toBe(true);
    expect(map[3][0]).toMatchObject({ day: '2026-11-02', done: true, future: false });
    expect(map[3][1]).toMatchObject({ day: '2026-11-03', future: true });
  });
});

describe('moodLift', () => {
  it('compares mood on days done and not done', () => {
    const mood = { a: 5, b: 4, c: 5, d: 2, e: 3, f: 2 };
    expect(moodLift(['a', 'b', 'c'], mood)).toBe(2.3);
  });
  it('says nothing without enough days on both sides', () => {
    expect(moodLift(['a'], { a: 5, b: 3, c: 3, d: 3 })).toBeNull();
  });
});

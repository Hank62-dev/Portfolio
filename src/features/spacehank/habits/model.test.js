import { describe, expect, it } from 'vitest';
import { dayKey, daysSince, gardenLine, gardenWeek, heatmap, longestStreak, moodLift, newHabit, nextStage, rate, stageOf, stageProgress, streak, todoFirst, toggleDay, weekStrip } from './model';

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

describe('the week strip', () => {
  it('lists the last seven days, oldest first, ending today', () => {
    const strip = weekStrip(['2026-11-02', '2026-10-31'], 7, today);
    expect(strip.map((d) => d.day)).toEqual(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect(strip.map((d) => d.done)).toEqual([false, false, false, false, true, false, true]);
    expect(strip.at(-1).isToday).toBe(true);
    expect(strip.filter((d) => d.isToday)).toHaveLength(1);
  });
  it('labels each day with its weekday letter', () => {
    expect(weekStrip([], 7, today).map((d) => d.label).join('')).toBe('TWTFSSM');
  });
});

describe('the garden week', () => {
  it('counts how many habits were done on each day', () => {
    const habits = [{ days: ['2026-11-02', '2026-11-01'] }, { days: ['2026-11-02'] }, { days: [] }];
    const week = gardenWeek(habits, 3, today);
    expect(week.map((d) => [d.done, d.total])).toEqual([[0, 3], [1, 3], [2, 3]]);
  });
});

describe('growing', () => {
  it('says what comes next and how far off it is', () => {
    expect(nextStage(0)).toEqual({ name: 'sprout', left: 1, at: 1 });
    expect(nextStage(5)).toEqual({ name: 'plant', left: 2, at: 7 });
    expect(nextStage(29)).toEqual({ name: 'tree', left: 1, at: 30 });
    expect(nextStage(30)).toBeNull();
  });
  it('measures the way to the next stage', () => {
    expect(stageProgress(0)).toBe(0);
    expect(stageProgress(5)).toBeCloseTo(0.5);
    expect(stageProgress(40)).toBe(1);
  });
});

describe('the garden line', () => {
  it('speaks for an empty, a half done and a finished garden', () => {
    expect(gardenLine(0, 0)).toMatch(/first habit/);
    expect(gardenLine(1, 3)).toBe('2 more plants need water today.');
    expect(gardenLine(2, 3)).toBe('1 more plant needs water today.');
    expect(gardenLine(3, 3)).toMatch(/happy/);
  });
});

describe('the order of the list', () => {
  it('puts the habits still to do first and keeps each group in order', () => {
    const list = [{ id: 'a', days: ['2026-11-02'] }, { id: 'b', days: [] }, { id: 'c', days: ['2026-11-02'] }, { id: 'd', days: [] }];
    expect(todoFirst(list, today).map((h) => h.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});

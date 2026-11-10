import { describe, expect, it } from 'vitest';
import { LOG_LIMIT, addSession, bestStreak, byDay, hoursMinutes, parseLog, sampleLog, streakOf, summarize } from './stats';

const at = (y, m, d, h = 10) => new Date(y, m - 1, d, h).getTime();
const NOW = new Date(2026, 10, 3, 15); // 3 Nov 2026, afternoon

describe('focus log', () => {
  it('adds a session and keeps only the latest LOG_LIMIT', () => {
    expect(addSession([], 25, 5)).toEqual([{ at: 5, minutes: 25 }]);
    const long = Array.from({ length: LOG_LIMIT }, (_, i) => ({ at: i, minutes: 25 }));
    const next = addSession(long, 25, 99999);
    expect(next).toHaveLength(LOG_LIMIT);
    expect(next.at(-1).at).toBe(99999);
    expect(next[0].at).toBe(1);
  });

  it('reads a saved log and drops what is not a session', () => {
    expect(parseLog('[{"at":1,"minutes":25},{"at":"x","minutes":3},null,{"at":2,"minutes":0}]')).toEqual([{ at: 1, minutes: 25 }]);
    expect(parseLog('not json')).toEqual([]);
    expect(parseLog('{"a":1}')).toEqual([]);
    expect(parseLog(null)).toEqual([]);
  });
});

describe('streaks', () => {
  const log = [at(2026, 11, 1), at(2026, 11, 2), at(2026, 11, 3, 9), at(2026, 10, 28), at(2026, 10, 27)].map((t) => ({ at: t, minutes: 25 }));

  it('counts the days in a row up to today', () => {
    expect(streakOf(byDay(log), NOW)).toBe(3);
  });

  it('keeps the streak alive until today is over', () => {
    expect(streakOf(byDay(log.filter((s) => s.at < at(2026, 11, 3, 0))), NOW)).toBe(2);
  });

  it('ends the streak after a missed day', () => {
    expect(streakOf(byDay([{ at: at(2026, 11, 1), minutes: 25 }]), NOW)).toBe(0);
  });

  it('finds the best run of all time', () => {
    expect(bestStreak(byDay(log))).toBe(3);
    expect(bestStreak(byDay([]))).toBe(0);
    expect(bestStreak(byDay([{ at: at(2026, 10, 31), minutes: 25 }, { at: at(2026, 11, 1), minutes: 25 }, { at: at(2026, 11, 3), minutes: 25 }]))).toBe(2);
  });
});

describe('summary', () => {
  it('totals today, the last seven days and everything', () => {
    const log = [
      { at: at(2026, 11, 3, 9), minutes: 25 },
      { at: at(2026, 11, 3, 11), minutes: 25 },
      { at: at(2026, 11, 1), minutes: 50 },
      { at: at(2026, 10, 20), minutes: 25 }, // outside the week
    ];
    const s = summarize(log, NOW);
    expect(s.today).toEqual({ minutes: 50, sessions: 2 });
    expect(s.week).toHaveLength(7);
    expect(s.week[6]).toMatchObject({ day: '2026-11-03', minutes: 50 });
    expect(s.week[0].day).toBe('2026-10-28');
    expect(s.weekMinutes).toBe(100);
    expect(s.totalMinutes).toBe(125);
    expect(s.totalSessions).toBe(4);
    expect(s.streak).toBe(1);
  });

  it('is all zeros with no log', () => {
    const s = summarize([], NOW);
    expect(s).toMatchObject({ today: { minutes: 0, sessions: 0 }, weekMinutes: 0, streak: 0, best: 0, totalMinutes: 0 });
  });
});

describe('hoursMinutes', () => {
  it('reads like a person would say it', () => {
    expect(hoursMinutes(0)).toBe('0m');
    expect(hoursMinutes(45)).toBe('45m');
    expect(hoursMinutes(130)).toBe('2h 10m');
    expect(hoursMinutes(60)).toBe('1h 00m');
  });
});

describe('sampleLog', () => {
  it('gives the demo a streak and a week with something in it', () => {
    const s = summarize(sampleLog(NOW), NOW);
    expect(s.streak).toBeGreaterThanOrEqual(3);
    expect(s.weekMinutes).toBeGreaterThan(100);
  });
});

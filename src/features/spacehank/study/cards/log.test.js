import { describe, expect, it } from 'vitest';
import { addReview, answeredOn, parseReviewLog, removeReview, studyStreak } from './log';

describe('the review log', () => {
  it('counts answers per day and how many were "Again"', () => {
    let log = addReview([], 2, '2026-11-02');
    log = addReview(log, 0, '2026-11-02');
    log = addReview(log, 3, '2026-11-01');
    expect(log).toEqual([
      { day: '2026-11-01', n: 1, again: 0 },
      { day: '2026-11-02', n: 2, again: 1 },
    ]);
    expect(answeredOn(log, '2026-11-02')).toBe(2);
    expect(answeredOn(log, '2026-10-01')).toBe(0);
  });
  it('takes an answer back, and drops a day that ends up empty', () => {
    const log = addReview(addReview([], 0, '2026-11-02'), 2, '2026-11-02');
    expect(removeReview(log, 0, '2026-11-02')).toEqual([{ day: '2026-11-02', n: 1, again: 0 }]);
    expect(removeReview([{ day: '2026-11-02', n: 1, again: 0 }], 2, '2026-11-02')).toEqual([]);
  });
  it('keeps only the last sixty days', () => {
    let log = [];
    for (let i = 1; i <= 70; i += 1) log = addReview(log, 2, `2026-${i <= 31 ? '01' : '02'}-${String(i <= 31 ? i : i - 31).padStart(2, '0')}`);
    expect(log).toHaveLength(60);
  });
  it('reads a saved log, and shrugs off a bad one', () => {
    expect(parseReviewLog('[{"day":"2026-11-02","n":3,"again":1},{"nope":1}]')).toEqual([{ day: '2026-11-02', n: 3, again: 1 }]);
    expect(parseReviewLog('not json')).toEqual([]);
    expect(parseReviewLog(null)).toEqual([]);
  });
});

describe('the study streak', () => {
  const today = new Date(2026, 10, 2);
  const log = (...days) => days.map((day) => ({ day, n: 1, again: 0 }));
  it('counts days in a row up to today', () => {
    expect(studyStreak(log('2026-10-31', '2026-11-01', '2026-11-02'), today)).toBe(3);
  });
  it('keeps going when only today is still empty', () => {
    expect(studyStreak(log('2026-10-31', '2026-11-01'), today)).toBe(2);
  });
  it('is zero after a gap', () => {
    expect(studyStreak(log('2026-10-29'), today)).toBe(0);
  });
});

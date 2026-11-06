import { vi as vitest } from 'vitest';

// these tests check the Vietnamese text, so the workspace is put in Vietnamese before anything is imported
vitest.hoisted(() => {
  globalThis.__HANK_LANG__ = 'vi';
});

import { describe, expect, it } from 'vitest';
import {
  bodyOf,
  composeText,
  daysBetween,
  dayLabel,
  diaryStreak,
  encouragement,
  entryOf,
  excerptOf,
  isWritten,
  journeyDays,
  journeyStats,
  memories,
  milestonesOf,
  monthLabel,
  promptsFor,
  shiftDay,
  shortLabel,
  weekMoods,
  writtenDays,
} from './model';

const TODAY = '2026-11-03';
let n = 0;
const page = (day, extra = {}) => ({ id: `n${(n += 1)}`, day, mood: 4, text: composeText(day, 'một ngày'), updatedAt: n, ...extra });
const run = (from, count) => Array.from({ length: count }, (_, i) => page(shiftDay(from, i)));

describe('days', () => {
  it('moves across month ends and counts the days between', () => {
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-10-01', '2026-11-03')).toBe(33);
    expect(daysBetween('2026-11-03', '2026-11-01')).toBe(-2);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // clocks change around here in some countries
  });

  it('names a day in Vietnamese', () => {
    expect(dayLabel('2026-11-03')).toBe('Thứ ba, 3 tháng 11');
    expect(shortLabel('2026-11-03')).toBe('T3 · 3/11');
    expect(monthLabel('2026-10-12', TODAY)).toBe('Tháng 10');
    expect(monthLabel('2025-12-12', TODAY)).toBe('Tháng 12 · 2025');
  });
});

describe('the text of a page', () => {
  it('writes a heading and the journal tag, then the words', () => {
    expect(composeText('2026-11-03', '  Hôm nay vui  ')).toBe('# Thứ ba, 3 tháng 11\n\n#journal\n\nHôm nay vui\n');
    expect(composeText('2026-11-03', '')).toBe('# Thứ ba, 3 tháng 11\n\n#journal\n');
  });

  it('reads the words back, and a page of the empty template has none', () => {
    expect(bodyOf(composeText('2026-11-03', 'Dòng một\n\nDòng hai'))).toBe('Dòng một\n\nDòng hai');
    expect(bodyOf('# Monday\n\n#journal\n\nHighlights\n- \n\nOn my mind\n')).toBe('');
    expect(bodyOf('no heading, just words')).toBe('no heading, just words');
    expect(bodyOf(undefined)).toBe('');
  });

  it('shortens for the journey', () => {
    expect(excerptOf('a  b\n c', 50)).toBe('a b c');
    expect(excerptOf('x'.repeat(100), 20)).toBe(`${'x'.repeat(19)}…`);
  });
});

describe('what counts as a day on the journey', () => {
  it('needs a mood, words or a picture', () => {
    expect(isWritten(page(TODAY))).toBe(true);
    expect(isWritten(page(TODAY, { mood: undefined, text: composeText(TODAY, '') }))).toBe(false);
    expect(isWritten(page(TODAY, { mood: undefined, text: composeText(TODAY, ''), photos: ['p1'] }))).toBe(true);
    expect(isWritten({ text: 'a plain note', mood: 3 })).toBe(false); // not a journal page: no day
    expect(isWritten(null)).toBe(false);
  });

  it('finds the page for a day, the newest edit if there are two', () => {
    const a = page(TODAY, { updatedAt: 1 });
    const b = page(TODAY, { updatedAt: 9 });
    expect(entryOf([a, b], TODAY)).toBe(b);
    expect(entryOf([a], '2026-01-01')).toBeNull();
  });
});

describe('the journey', () => {
  it('starts with today even when nothing is written', () => {
    const { days, more } = journeyDays([], TODAY);
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ day: TODAY, written: false, isToday: true });
    expect(more).toBe(false);
  });

  it('lists days newest first back to the first page, with empty stones for the days between', () => {
    const notes = [page('2026-10-31'), page('2026-11-02'), page(TODAY)];
    const { days } = journeyDays(notes, TODAY);
    expect(days.map((d) => d.day)).toEqual(['2026-11-03', '2026-11-02', '2026-11-01', '2026-10-31']);
    expect(days.map((d) => d.written)).toEqual([true, true, false, true]);
  });

  it('cuts off at the window and says there is more', () => {
    const notes = run('2026-09-01', 64); // to 2026-11-03
    const { days, more } = journeyDays(notes, TODAY, { days: 21 });
    expect(days).toHaveLength(21);
    expect(more).toBe(true);
    expect(journeyDays(notes, TODAY, { days: 100 }).more).toBe(false);
  });

  it('does not count an opened but empty page', () => {
    const { days } = journeyDays([page(TODAY, { mood: undefined, text: composeText(TODAY, '') })], TODAY);
    expect(days[0].written).toBe(false);
  });
});

describe('streaks and numbers', () => {
  it('counts days in a row, and keeps the streak until today is over', () => {
    const notes = [...run('2026-10-30', 3), page('2026-10-20')]; // 30, 31, 1 Nov
    expect(diaryStreak(notes, '2026-11-01')).toBe(3);
    expect(diaryStreak(notes, '2026-11-02')).toBe(3); // today not written yet
    expect(diaryStreak(notes, '2026-11-03')).toBe(0);
  });

  it('sums up the journey', () => {
    const notes = [...run('2026-10-01', 7), ...run('2026-11-01', 3)];
    expect(journeyStats(notes, TODAY)).toMatchObject({ total: 10, streak: 3, longest: 7, thisMonth: 3, day: 34, first: '2026-10-01' });
    expect(journeyStats([], TODAY)).toMatchObject({ total: 0, streak: 0, day: 0, first: null });
  });
});

describe('landmarks and memories', () => {
  it('marks the 1st and 7th page ever written', () => {
    const marks = milestonesOf(run('2026-10-01', 9));
    expect([...marks.keys()]).toEqual(['2026-10-01', '2026-10-07']);
    expect(marks.get('2026-10-07')).toMatchObject({ count: 7, kind: 'tent' });
    expect(marks.get('2026-10-01').kind).toBe('flag');
  });

  it('brings back pages from a week and a month ago', () => {
    const notes = [page('2026-10-27'), page('2026-10-04'), page('2026-10-10')];
    expect(memories(notes, TODAY).map((m) => [m.ago, m.label])).toEqual([
      [7, 'Một tuần trước'],
      [30, 'Một tháng trước'],
    ]);
  });

  it('has nothing to bring back when nothing was written then', () => {
    expect(memories([page(TODAY)], TODAY)).toEqual([]);
  });
});

describe('the week', () => {
  it('gives seven days with the moods that were written', () => {
    const week = weekMoods([page('2026-11-01', { mood: 2 }), page(TODAY, { mood: 5 })], TODAY);
    expect(week).toHaveLength(7);
    expect(week[6]).toMatchObject({ day: TODAY, weekday: 'T3', mood: 5, written: true });
    expect(week[4]).toMatchObject({ day: '2026-11-01', mood: 2 });
    expect(week[0].mood).toBeNull();
  });
});

describe('gentle words', () => {
  it('suggests three different prompts, the same ones all day', () => {
    const prompts = promptsFor(TODAY);
    expect(new Set(prompts).size).toBe(3);
    expect(promptsFor(TODAY)).toEqual(prompts);
  });

  it('says something fitting to the moment', () => {
    expect(encouragement({ written: false, streak: 0, total: 0, hour: 9 })).toMatch(/bước nhỏ/);
    expect(encouragement({ written: true, streak: 5, total: 9, hour: 9 })).toMatch(/Ngày thứ 5/);
    expect(encouragement({ written: true, streak: 1, total: 9, hour: 9 })).toMatch(/dấu chân/);
    expect(encouragement({ written: false, streak: 4, total: 9, hour: 21 })).toMatch(/chuỗi 4 ngày/);
    expect(encouragement({ written: false, streak: 0, total: 9, hour: 8 })).toMatch(/Buổi sáng/);
    expect(encouragement({ written: false, streak: 0, total: 9, hour: 14 })).toMatch(/Giữa ngày/);
    expect(encouragement({ written: false, streak: 0, total: 9, hour: 19 })).toMatch(/Tối rồi/);
  });

  it('keeps the written days sorted', () => {
    expect(writtenDays([page('2026-11-02'), page('2026-10-02')])).toEqual(['2026-10-02', '2026-11-02']);
  });
});

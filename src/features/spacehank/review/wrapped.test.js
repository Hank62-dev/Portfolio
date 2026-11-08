import { describe, expect, it } from 'vitest';
import { bestHabit, peakDay, spendChange, wrappedSlides } from './wrapped';

const stats = {
  tasksDone: 5,
  tasksOpen: 3,
  tasksOverdue: 1,
  habits: [{ name: 'Read', daysDone: 5 }, { name: 'Walk', daysDone: 2 }, { name: 'Sleep', daysDone: 0 }],
  habitChecks: 7,
  habitChecksPossible: 21,
  spent: 150000,
  spentBefore: 100000,
  income: 0,
  topCategories: [{ category: 'Food & drink', total: 100000 }],
  diaryDays: 3,
  notesWritten: 2,
  memos: 1,
  moodAverage: 4,
};

describe('the cards of the week', () => {
  it('has an opening, one card for each thing there is something to say about, and Hank at the end', () => {
    expect(wrappedSlides(stats).map((s) => s.id)).toEqual(['intro', 'tasks', 'habits', 'money', 'mind', 'outro']);
  });

  it('leaves out a card with nothing true on it', () => {
    const quiet = { ...stats, tasksDone: 0, tasksOpen: 0, habitChecksPossible: 0, spent: 0, income: 0, diaryDays: 0, notesWritten: 0, memos: 0 };
    expect(wrappedSlides(quiet).map((s) => s.id)).toEqual(['intro', 'outro']);
  });

  it('puts the numbers on the cards', () => {
    const by = Object.fromEntries(wrappedSlides(stats).map((s) => [s.id, s]));
    expect(by.tasks).toMatchObject({ value: 5, format: 'number', sub: '3 still open, 1 overdue' });
    expect(by.habits).toMatchObject({ value: 7, of: 21, sub: 'Best: Read (5 of 7 days)' });
    expect(by.money).toMatchObject({ value: 150000, format: 'vnd' });
    expect(by.money.sub).toContain('50% more than the week before');
    expect(by.money.sub).toContain('Food & drink');
    expect(by.mind).toMatchObject({ value: 3, of: 7, sub: 'Average mood 4 of 5' });
  });

  it('carries the range on the opening card and Hank\'s words on the last', () => {
    const slides = wrappedSlides(stats, { range: '2 Nov – 8 Nov', written: '  A steady week.  ' });
    expect(slides[0].sub).toBe('2 Nov – 8 Nov');
    expect(slides.at(-1).written).toBe('A steady week.');
    expect(wrappedSlides(stats).at(-1).written).toBe('');
  });

  it('says one task in the singular', () => {
    expect(wrappedSlides({ ...stats, tasksDone: 1 }).find((s) => s.id === 'tasks').unit).toBe('task finished');
  });
});

describe('what the cards say about change', () => {
  it('compares spending with the week before, and says nothing when there is no week before', () => {
    expect(spendChange(stats)).toBe(50);
    expect(spendChange({ spent: 5, spentBefore: 0 })).toBeNull();
    expect(spendChange({ spent: 50000, spentBefore: 100000 })).toBe(-50);
  });

  it('finds the habit kept the most days, and none when none was kept', () => {
    expect(bestHabit(stats).name).toBe('Read');
    expect(bestHabit({ habits: [{ name: 'x', daysDone: 0 }] })).toBeNull();
    expect(bestHabit({})).toBeNull();
  });
});

describe('the week drawn day by day', () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({ label, tasks: i === 2 ? 4 : i === 4 ? 1 : 0, habitsDone: i % 2, habitsTotal: 3, spent: i === 5 ? 90000 : i === 1 ? 30000 : 0, diary: i === 6, mood: i === 6 ? 5 : null }));

  it('gives the cards a chart when the days are there, and none when they are not', () => {
    const by = Object.fromEntries(wrappedSlides(stats, { days }).map((s) => [s.id, s]));
    expect(by.intro.chart.kind).toBe('path');
    expect(by.tasks.chart).toMatchObject({ kind: 'bars', peak: 'Wed' });
    expect(by.money.chart).toMatchObject({ kind: 'bars', peak: 'Sat' });
    expect(by.habits.chart.kind).toBe('dots');
    expect(by.mind.chart.kind).toBe('wave');
    expect(wrappedSlides(stats).every((s) => !s.chart)).toBe(true);
  });

  it('scales the bars against the busiest day', () => {
    const bars = wrappedSlides(stats, { days }).find((s) => s.id === 'tasks').chart.days;
    expect(bars.map((d) => d.v)).toEqual([0, 0, 1, 0, 0.25, 0, 0]);
    expect(wrappedSlides(stats, { days: days.map((d) => ({ ...d, tasks: 0 })) }).find((s) => s.id === 'tasks').chart.days.every((d) => d.v === 0)).toBe(true);
  });

  it('keeps the tasks ring and finds the peak day of anything', () => {
    expect(wrappedSlides(stats, { days }).find((s) => s.id === 'tasks').ring).toEqual({ done: 5, total: 8 });
    expect(peakDay(days, (d) => d.spent).label).toBe('Sat');
    expect(peakDay(days, () => 0)).toBeNull();
  });

  it('draws the mood wave from the mood of each day', () => {
    const wave = wrappedSlides(stats, { days }).find((s) => s.id === 'mind').chart.days;
    expect(wave[6]).toMatchObject({ v: 1, on: true });
    expect(wave[0]).toMatchObject({ v: 0, on: false });
  });
});

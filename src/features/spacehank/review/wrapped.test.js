import { describe, expect, it } from 'vitest';
import { bestHabit, spendChange, wrappedSlides } from './wrapped';

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

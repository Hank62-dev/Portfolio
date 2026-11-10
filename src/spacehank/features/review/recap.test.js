import { describe, expect, it } from 'vitest';
import { weekRecap } from './recap';
import { quotePage, wrappedSlides } from './wrapped';

const NOW = new Date(2026, 10, 7, 21, 0);
const at = (day, hour = 12) => new Date(2026, 10, day, hour).getTime();

const data = {
  cards: [
    { id: 'a', title: 'Send the invoice', column: 'done', updatedAt: at(5, 9) },
    { id: 'b', title: 'Book the dentist', column: 'done', updatedAt: at(5, 15) },
    { id: 'c', title: 'Long ago', column: 'done', updatedAt: at(-30) },
    { id: 'd', title: 'Demo', column: 'done', updatedAt: at(6), sample: true },
  ],
  habits: [
    { id: 'h1', name: 'Read', hue: 200, days: ['2026-11-05', '2026-11-06', '2026-11-07'] },
    { id: 'h2', name: 'Walk', hue: 100, days: ['2026-11-05'] },
  ],
  entries: [
    { id: 'e1', type: 'expense', amount: 90000, category: 'food', note: 'Dinner', at: at(5, 19) },
    { id: 'e2', type: 'expense', amount: 30000, category: 'transport', note: '', at: at(2) },
    { id: 'e3', type: 'expense', amount: 500000, category: 'food', at: at(-3) },
  ],
  notes: [
    { id: 'n1', text: '# Plan for Monday', createdAt: at(3), updatedAt: at(3) },
    { id: 'n2', text: '# Reading list', createdAt: at(5, 20), updatedAt: at(5, 20) },
    { id: 'j1', day: '2026-11-05', text: '# Thu\n\n#journal\n\nA great day out', mood: 5, photos: ['p1'], createdAt: at(5, 21), updatedAt: at(5, 21) },
    { id: 'j2', day: '2026-11-06', text: '# Fri\n\n#journal\n\nQuiet', mood: 3, createdAt: at(6, 21), updatedAt: at(6, 21) },
  ],
};

describe('what the week was made of', () => {
  const recap = weekRecap(data, NOW);

  it('lists the tasks finished this week, oldest first, without the demo', () => {
    expect(recap.tasks.map((t) => t.title)).toEqual(['Send the invoice', 'Book the dentist']);
  });

  it('gives each habit its seven days and puts the most kept first', () => {
    expect(recap.habits.map((h) => [h.name, h.daysDone])).toEqual([['Read', 3], ['Walk', 1]]);
    expect(recap.habits[0].pips).toEqual([false, false, false, false, true, true, true]);
    expect(recap.habits[0].streak).toBe(3);
  });

  it('lists the diary pages with a picture, and the notes newest first', () => {
    expect(recap.diary.map((d) => d.mood)).toEqual([5, 3]);
    expect(recap.photos).toEqual([{ id: 'p1', label: expect.any(String) }]);
    expect(recap.notes.map((n) => n.title)).toEqual(['Reading list', 'Plan for Monday']);
  });

  it('finds the biggest spends and how the money splits', () => {
    expect(recap.spends.map((s) => s.title)).toEqual(['Dinner', 'Transport']);
    expect(recap.categories.map((c) => c.pct)).toEqual([75, 25]);
  });

  it('finds the busiest day and what happened on it', () => {
    expect(recap.best.key).toBe('2026-11-05');
    expect(recap.best).toMatchObject({ tasks: ['Send the invoice', 'Book the dentist'], habits: ['Read', 'Walk'], diary: true, notes: 1, spent: 90000 });
  });

  it('has no best day when no day had more than one thing', () => {
    expect(weekRecap({ cards: [], habits: [], entries: [], notes: [] }, NOW).best).toBeNull();
  });
});

describe('the cards that come from it', () => {
  const stats = { tasksDone: 2, tasksOpen: 0, tasksOverdue: 0, habits: [], habitChecks: 4, habitChecksPossible: 14, spent: 120000, spentBefore: 0, income: 0, topCategories: [], diaryDays: 2, notesWritten: 2, memos: 0, moodAverage: 4 };
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => ({ label, tasks: i === 4 ? 2 : 0, habitsDone: i === 4 ? 2 : 0, habitsTotal: 2, spent: i === 4 ? 90000 : 0, diary: i === 4, mood: i === 4 ? 5 : null }));
  const slides = wrappedSlides(stats, { days, recap: weekRecap(data, NOW) });
  const by = Object.fromEntries(slides.map((s) => [s.id, s]));

  it('adds the grid, the pictures, the notes and the best day', () => {
    expect(slides.map((s) => s.id)).toEqual(['intro', 'glance', 'tasks', 'habits', 'money', 'mind', 'photos', 'notes', 'best', 'outro']);
    expect(by.glance.chart.rows.map((r) => r.id)).toEqual(['tasks', 'habits', 'diary', 'money']);
    expect(by.glance.chart.rows[0].cells[4]).toMatchObject({ v: 1, raw: 2 });
  });

  it('puts the things themselves on the cards', () => {
    expect(by.tasks.list.items.map((t) => t.title)).toEqual(['Book the dentist', 'Send the invoice']);
    expect(by.habits.list.items).toHaveLength(2);
    expect(by.money.list.items).toHaveLength(2);
    expect(by.notes).toMatchObject({ value: 2 });
    expect(by.intro.chips.map((c) => c.icon)).toEqual(['tasks', 'habits', 'diary', 'notes']);
  });

  it('quotes the happiest page that has words', () => {
    expect(by.mind.list.page.mood).toBe(5);
    expect(quotePage([])).toBeNull();
    expect(quotePage([{ excerpt: '', mood: 5 }, { excerpt: 'a', mood: 2 }]).excerpt).toBe('a');
  });

  it('keeps the cards it had when there is no recap', () => {
    expect(wrappedSlides(stats, { days }).map((s) => s.id)).toEqual(['intro', 'glance', 'tasks', 'habits', 'money', 'mind', 'outro']);
  });
});

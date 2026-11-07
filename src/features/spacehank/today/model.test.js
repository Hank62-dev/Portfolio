import { describe, expect, it } from 'vitest';
import { buildToday, spendLast7, spentToday, tasksForToday } from './model';

const NOW = new Date(2026, 10, 7, 21, 0); // Saturday evening
const card = (title, column, due = '', extra = {}) => ({ id: title, title, column, due, ...extra });
const at = (day, hour = 12) => new Date(2026, 10, day, hour).getTime();

describe('the tasks that matter today', () => {
  it('puts what is overdue first, then today, then soon, then what is in progress', () => {
    const cards = [card('later', 'backlog', '2026-11-20'), card('soon', 'backlog', '2026-11-09'), card('doing', 'doing'), card('today', 'backlog', '2026-11-07'), card('late', 'backlog', '2026-11-01')];
    expect(tasksForToday(cards, NOW).map((t) => [t.title, t.state])).toEqual([['late', 'overdue'], ['today', 'today'], ['soon', 'soon'], ['doing', 'doing']]);
  });

  it('leaves out finished tasks and the demo ones, and keeps at most six', () => {
    const many = Array.from({ length: 9 }, (_, i) => card(`t${i}`, 'backlog', '2026-11-07'));
    expect(tasksForToday([card('done', 'done', '2026-11-01'), card('demo', 'backlog', '2026-11-01', { sample: true }), ...many], NOW)).toHaveLength(6);
  });
});

describe('what was spent today', () => {
  it('adds up money out for today only', () => {
    const entries = [
      { type: 'expense', amount: 45000, at: at(7, 8) },
      { type: 'expense', amount: 30000, at: at(7, 20) },
      { type: 'income', amount: 9e6, at: at(7) },
      { type: 'expense', amount: 99000, at: at(6) },
      { type: 'expense', amount: 5000, at: at(7), sample: true },
    ];
    expect(spentToday(entries, NOW)).toEqual({ total: 75000, count: 2 });
  });
});

describe('the last seven days of spending', () => {
  it('has seven days, today last, with money out only', () => {
    const entries = [
      { type: 'expense', amount: 10000, at: at(7, 9) },
      { type: 'expense', amount: 5000, at: at(7, 19) },
      { type: 'expense', amount: 20000, at: at(5) },
      { type: 'expense', amount: 40000, at: at(1) },
      { type: 'expense', amount: 99000, at: at(0) }, // a week ago, outside the window
      { type: 'income', amount: 9e6, at: at(6) },
      { type: 'expense', amount: 7000, at: at(6), sample: true },
    ];
    expect(spendLast7(entries, NOW)).toEqual([40000, 0, 0, 0, 20000, 0, 15000]);
  });

  it('is seven zeros when nothing was spent', () => {
    expect(spendLast7([], NOW)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('the whole screen', () => {
  const data = {
    cards: [card('report', 'backlog', '2026-11-01'), card('call', 'backlog', '2026-11-07')],
    courses: [{ id: 'c', name: 'Math', exams: [], deadlines: [{ id: 'd', title: 'Essay', at: at(8) }] }],
    habits: [{ id: 'h', name: 'Read', days: [] }, { id: 'g', name: 'Walk', days: ['2026-11-07'] }],
    entries: [],
    inbox: [{}, {}, {}],
    notes: [],
    now: NOW,
  };

  it('counts habits, the inbox and deadlines', () => {
    const today = buildToday(data);
    expect(today.habits).toMatchObject({ total: 2, done: 1 });
    expect(today.habits.pending.map((h) => h.name)).toEqual(['Read']);
    expect(today.inboxCount).toBe(3);
    expect(today.deadlines).toMatchObject([{ title: 'Essay', bucket: 'tomorrow' }]);
    expect(today.diaryWritten).toBe(false);
  });

  it('nudges about at most two things, the most pressing first', () => {
    const today = buildToday(data);
    expect(today.nudges).toHaveLength(2);
    expect(today.nudges[0].id).toBe('overdue');
    expect(today.nudges[1].id).toBe('inbox');
  });

  it('has no nudge on a calm morning', () => {
    const calm = buildToday({ ...data, cards: [], inbox: [], courses: [], habits: [], now: new Date(2026, 10, 7, 9, 0) });
    expect(calm.nudges).toEqual([]);
  });
});

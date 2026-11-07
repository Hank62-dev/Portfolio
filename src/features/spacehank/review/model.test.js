import { describe, expect, it } from 'vitest';
import { hasWeek, weekLabel, weekLines, weekStats, weekWindow } from './model';
import { dayTimeline } from './timeline';

const NOW = new Date(2026, 10, 7, 21, 0);
const at = (day, hour = 12) => new Date(2026, 10, day, hour).getTime();

const data = {
  cards: [
    { id: 'a', title: 'Done this week', column: 'done', updatedAt: at(5) },
    { id: 'b', title: 'Done long ago', column: 'done', updatedAt: at(-30) },
    { id: 'c', title: 'Open late', column: 'backlog', due: '2026-11-01' },
    { id: 'd', title: 'Open', column: 'doing' },
    { id: 'e', title: 'Demo', column: 'done', updatedAt: at(6), sample: true },
  ],
  habits: [{ id: 'h', name: 'Read', days: ['2026-11-05', '2026-11-06', '2026-11-07', '2026-10-01'] }],
  entries: [
    { type: 'expense', amount: 100000, category: 'food', at: at(6) },
    { type: 'expense', amount: 50000, category: 'transport', at: at(2) },
    { type: 'expense', amount: 200000, category: 'food', at: at(-3) },
    { type: 'income', amount: 1e6, category: 'income', at: at(4) },
  ],
  notes: [
    { id: 'n', text: 'idea', createdAt: at(3), updatedAt: at(3) },
    { id: 'j', day: '2026-11-06', text: '# Friday\n\n#journal\n\nA good day', mood: 4, createdAt: at(6, 9), updatedAt: at(6, 20) },
  ],
  memos: [{ id: 'm', title: 'Memo', at: at(5), transcript: 'hello' }],
  inbox: [{}],
};

describe('the last seven days', () => {
  it('spans today and the six days before', () => {
    const { from, to } = weekWindow(NOW);
    expect(new Date(from).getDate()).toBe(1);
    expect(new Date(to).getDate()).toBe(8);
  });

  it('counts what was done in the window and nothing from the demo', () => {
    const s = weekStats(data, NOW);
    expect(s).toMatchObject({ tasksDone: 1, tasksOpen: 2, tasksOverdue: 1, habitChecks: 3, habitChecksPossible: 7, notesWritten: 1, diaryDays: 1, moodAverage: 4, memos: 1, inboxWaiting: 1 });
    expect(s.spent).toBe(150000);
    expect(s.spentBefore).toBe(200000); // the week before (at(-3) is 27 October)
    expect(s.income).toBe(1000000);
    expect(s.topCategories[0]).toMatchObject({ total: 100000 });
  });

  it('knows when there is nothing to look back on', () => {
    expect(hasWeek(weekStats({}, NOW))).toBe(false);
    expect(hasWeek(weekStats(data, NOW))).toBe(true);
  });

  it('says it in plain words without the AI', () => {
    const lines = weekLines(weekStats(data, NOW));
    expect(lines.join('\n')).toContain('Tasks finished: 1');
    expect(lines.join('\n')).toContain('Habits: 3 of 7');
    expect(lines.join('\n')).toContain('Spent');
  });

  it('names the week', () => {
    expect(weekLabel(NOW)).toBe('2026-W45');
    expect(weekLabel(new Date(2026, 0, 1))).toBe('2026-W01');
  });
});

describe('one day as a line of time', () => {
  it('orders what happened, and lists the habits checked', () => {
    const day = dayTimeline(data, '2026-11-06');
    expect(day.events.map((e) => e.kind)).toEqual(['spending', 'diary']);
    expect(day.habits).toEqual(['Read']);
    expect(dayTimeline(data, '2026-11-05').events.map((e) => e.kind)).toEqual(['memo', 'task']);
  });

  it('is empty on a quiet day', () => {
    expect(dayTimeline(data, '2026-10-20')).toEqual({ events: [], habits: [] });
  });
});

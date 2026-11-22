import { describe, expect, it } from 'vitest';
import { todayWidget } from './widget';

const now = new Date(2026, 10, 23, 10, 0);
const at = (h, m = 0) => new Date(2026, 10, 23, h, m).toISOString();

describe('the Today widget', () => {
  it('lists the events still to come, overdue and due tasks, then the habits still waiting', () => {
    const data = todayWidget({
      now,
      events: [
        { title: 'Standup', start: at(9) },
        { title: 'Lunch', start: at(12, 30) },
        { title: 'Holiday', start: at(0), allDay: true },
        { title: 'Tomorrow', start: new Date(2026, 10, 24, 9).toISOString() },
      ],
      tasks: [
        { title: 'Late one', due: '2026-11-20', column: 'todo' },
        { title: 'Today one', due: '2026-11-23', column: 'doing' },
        { title: 'Done one', due: '2026-11-23', column: 'done' },
        { title: 'Later', due: '2026-11-30', column: 'todo' },
      ],
      habits: [
        { name: 'Read', days: [] },
        { name: 'Run', days: ['2026-11-23'] },
      ],
    });
    expect(data.day).toBe('2026-11-23');
    expect(data.rows).toEqual([
      { text: '12:30 · Lunch', tab: 'hank' },
      { text: '! Late one', tab: 'missions', late: true },
      { text: '□ Today one', tab: 'missions' },
      { text: '○ Read', tab: 'habits' },
    ]);
    expect(data.count).toBe(4);
  });

  it('shows five rows at most and counts the rest', () => {
    const habits = Array.from({ length: 8 }, (_, i) => ({ name: `H${i}`, days: [] }));
    const data = todayWidget({ now, habits });
    expect(data.rows).toHaveLength(5);
    expect(data.count).toBe(8);
  });

  it('has its words for an empty day and for a stale one', () => {
    const data = todayWidget({ now });
    expect(data.rows).toEqual([]);
    expect(data.empty).toBeTruthy();
    expect(data.stale).toBeTruthy();
  });
});

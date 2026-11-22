import { describe, expect, it } from 'vitest';
import { nativeId } from './native';
import { ahead, moments } from './rules';

const at = (day, h, m = 0) => new Date(2026, 10, day, h, m);

describe('the moments ahead', () => {
  it('are each morning, evening and night hour in the window, plus a quarter hour before timed events', () => {
    const now = at(6, 10);
    const events = [{ title: 'Call', start: at(6, 15).toISOString() }, { title: 'Trip', start: at(7, 0).toISOString(), allDay: true }];
    const list = moments(now, events, 24).map((t) => new Date(t));
    expect(list.map((d) => `${d.getDate()} ${d.getHours()}:${d.getMinutes()}`)).toEqual(['6 14:45', '6 20:0', '6 21:0', '7 8:0']);
  });
});

describe('the reminders ahead', () => {
  const base = { now: at(6, 10), hours: 24 }; // to 10:00 tomorrow

  it('puts an event at a quarter hour before it, with the same words the live check uses', () => {
    const list = ahead({ ...base, events: [{ title: 'Call', start: at(6, 15).toISOString() }] });
    expect(list).toEqual([expect.objectContaining({ kind: 'calendar', title: 'Call starts in 15 min', at: at(6, 14, 45).getTime() })]);
  });

  it('puts tomorrow’s task at tomorrow morning, and today’s as overdue then (today’s own is left to the live check)', () => {
    const tasks = [
      { id: 'a', title: 'Today', due: '2026-11-06', column: 'todo' },
      { id: 'b', title: 'Tomorrow', due: '2026-11-07', column: 'todo' },
    ];
    const list = ahead({ ...base, tasks });
    expect(list.map((item) => [item.title, new Date(item.at).getDate(), new Date(item.at).getHours()])).toEqual([
      ['“Today” is overdue', 7, 8],
      ['“Tomorrow” is due today', 7, 8],
    ]);
  });

  it('nudges unwatered habits in the evening, once per day', () => {
    const habits = [{ name: 'Read', days: [] }];
    const list = ahead({ ...base, habits });
    expect(list.map((item) => [item.key, new Date(item.at).getHours()])).toEqual([['habits:2026-11-06', 20]]);
  });

  it('leaves out an evening habit already done today', () => {
    expect(ahead({ ...base, habits: [{ name: 'Read', days: ['2026-11-06'] }] })).toEqual([]);
  });
});

describe('a notification number', () => {
  it('is the same for the same occasion, positive, and differs between occasions', () => {
    expect(nativeId('habits:2026-11-06')).toBe(nativeId('habits:2026-11-06'));
    expect(nativeId('habits:2026-11-06')).toBeGreaterThan(0);
    expect(nativeId('habits:2026-11-06')).not.toBe(nativeId('habits:2026-11-07'));
  });
});

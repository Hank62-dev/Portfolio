import { beforeEach, describe, expect, it } from 'vitest';
import { ago, center, clearAll, groupByDay, markAllRead, markRead, notify, remove, setKind, unreadCount } from './center';
import { reminders } from './rules';

const at = (h, m = 0, d = new Date(2026, 10, 6)) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);

beforeEach(() => {
  clearAll();
  center.set({ seen: {} });
  setKind('calendar', true);
});

describe('the centre', () => {
  it('adds a notification, newest first, unread', () => {
    notify({ kind: 'study', title: 'One', announce: false });
    notify({ kind: 'study', title: 'Two', announce: false });
    const { items } = center.get();
    expect(items.map((i) => i.title)).toEqual(['Two', 'One']);
    expect(unreadCount(center.get())).toBe(2);
  });

  it('shows an occasion once, even after it was deleted', () => {
    const first = notify({ key: 'a', title: 'A', announce: false });
    expect(notify({ key: 'a', title: 'A', announce: false })).toBeNull();
    remove(first.id);
    expect(notify({ key: 'a', title: 'A', announce: false })).toBeNull();
    expect(center.get().items).toHaveLength(0);
  });

  it('skips a kind that is switched off', () => {
    setKind('wallet', false);
    expect(notify({ kind: 'wallet', title: 'Budget', announce: false })).toBeNull();
    setKind('wallet', true);
  });

  it('marks one or all as read', () => {
    const a = notify({ title: 'A', announce: false });
    notify({ title: 'B', announce: false });
    markRead(a.id);
    expect(unreadCount(center.get())).toBe(1);
    markAllRead();
    expect(unreadCount(center.get())).toBe(0);
  });

  it('keeps no more than sixty', () => {
    for (let i = 0; i < 70; i += 1) notify({ title: `n${i}`, announce: false });
    expect(center.get().items).toHaveLength(60);
    expect(center.get().items[0].title).toBe('n69');
  });
});

describe('showing', () => {
  const now = at(15).getTime();
  it('groups by day', () => {
    const items = [{ at: now - 1000 }, { at: now - 24 * 3600 * 1000 }, { at: now - 5 * 24 * 3600 * 1000 }];
    expect(groupByDay(items, now).map((s) => [s.label, s.items.length])).toEqual([['Today', 1], ['Yesterday', 1], ['Earlier', 1]]);
    expect(groupByDay([{ at: now }], now).map((s) => s.label)).toEqual(['Today']);
  });

  it('says how long ago', () => {
    expect(ago(now - 20 * 1000, now)).toBe('Just now');
    expect(ago(now - 5 * 60000, now)).toBe('5 min ago');
    expect(ago(now - 3 * 3600000, now)).toBe('3 h ago');
    expect(ago(now - 50 * 3600000, now)).toBe('2 d ago');
  });
});

describe('reminders', () => {
  const keys = (list) => list.map((r) => r.key);

  it('announces an event that starts within a quarter of an hour, not a later one or an all-day one', () => {
    const now = at(9, 20);
    const events = [
      { title: 'Class', start: at(9, 30).toISOString(), location: 'A2' },
      { title: 'Later', start: at(11).toISOString() },
      { title: 'Holiday', start: at(0).toISOString(), allDay: true },
    ];
    const out = reminders({ now, events });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: 'calendar', title: 'Class starts in 10 min' });
  });

  it('counts due flashcards from the morning on', () => {
    const cards = [{ due: at(7).getTime() }, { due: at(7).getTime() }, { due: at(23).getTime() }];
    expect(reminders({ now: at(7, 30), cards })).toHaveLength(0);
    const out = reminders({ now: at(9), cards });
    expect(out[0]).toMatchObject({ kind: 'study', title: '2 flashcards due' });
  });

  it('flags tasks due today and overdue, never finished ones', () => {
    const tasks = [
      { id: '1', title: 'Today', due: '2026-11-06', column: 'doing' },
      { id: '2', title: 'Late', due: '2026-11-01', column: 'backlog' },
      { id: '3', title: 'Done', due: '2026-11-01', column: 'done' },
      { id: '4', title: 'Soon', due: '2026-11-09', column: 'doing' },
    ];
    const out = reminders({ now: at(9), tasks });
    expect(out.map((r) => r.title)).toEqual(['“Today” is due today', '“Late” is overdue']);
  });

  it('nudges habits in the evening and the diary at night, but only when not done', () => {
    const habits = [{ name: 'Read', days: [] }, { name: 'Run', days: ['2026-11-06'] }];
    expect(keys(reminders({ now: at(19), habits, notes: [] }))).toEqual([]);
    expect(keys(reminders({ now: at(20, 30), habits, notes: [] }))).toEqual(['habits:2026-11-06']);
    expect(keys(reminders({ now: at(21, 30), habits, notes: [] }))).toEqual(['habits:2026-11-06', 'diary:2026-11-06']);
    expect(keys(reminders({ now: at(21, 30), habits: [], notes: [{ day: '2026-11-06' }] }))).toEqual([]);
    expect(keys(reminders({ now: at(21, 30), habits: [] }))).toEqual([]); // notes not loaded yet: say nothing
  });

  it('warns at 80% and again when a budget is used up', () => {
    const entries = [{ type: 'expense', category: 'food', amount: 850000, at: at(10).getTime() }];
    const budgets = [{ category: 'food', amount: 1000000 }];
    expect(reminders({ now: at(12), entries, budgets })[0]).toMatchObject({ key: 'budget:food:2026-11:80', kind: 'wallet' });
    entries.push({ type: 'expense', category: 'food', amount: 200000, at: at(11).getTime() });
    expect(reminders({ now: at(12), entries, budgets })[0]).toMatchObject({ key: 'budget:food:2026-11:100', tone: 'error' });
    expect(reminders({ now: at(12), entries: [], budgets })).toHaveLength(0);
  });
});

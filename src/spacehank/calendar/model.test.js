import { describe, expect, it } from 'vitest';
import { addDays, agendaGroups, byDay, clockOf, dots, draftOf, draftReady, googleItems, inputOf, localItems, monthGrid, rangeOf, searchEvents, shiftMonth, upcoming, weekOf, weekStart } from './model';

// 2026-11-08 is a Sunday
const SUNDAY = '2026-11-08';

describe('days', () => {
  it('starts the week on Monday', () => {
    expect(weekStart(SUNDAY)).toBe('2026-11-02');
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
    expect(weekOf(SUNDAY)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  });

  it('shows a month as six weeks, with the days of the other months marked', () => {
    const grid = monthGrid('2026-11-15');
    expect(grid).toHaveLength(42);
    expect(grid[0]).toEqual({ key: '2026-10-26', inMonth: false }); // 1 Nov 2026 is a Sunday: the grid starts the Monday before
    expect(grid.filter((d) => d.inMonth)).toHaveLength(30);
    expect(grid[41].key).toBe('2026-12-06');
  });

  it('moves between months and across a year', () => {
    expect(shiftMonth('2026-11-20', 1)).toBe('2026-12-01');
    expect(shiftMonth('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftMonth('2026-01-15', -1)).toBe('2025-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('knows the time span each view needs', () => {
    const month = rangeOf('month', '2026-11-15');
    expect(month.from.getTime()).toBe(new Date(2026, 9, 26).getTime());
    expect(month.to.getTime()).toBe(new Date(2026, 11, 7).getTime());
    expect(rangeOf('week', SUNDAY).from.getTime()).toBe(new Date(2026, 10, 2).getTime());
    const agenda = rangeOf('agenda', '2026-11-01', '2026-11-08');
    expect(agenda.from.getTime()).toBe(new Date(2026, 10, 8).getTime());
    expect(agenda.to.getTime() - agenda.from.getTime()).toBeLessThanOrEqual(70 * 86400000);
  });
});

describe('events from Google', () => {
  const timed = (id, start, end, extra = {}) => ({ id, calendarId: 'c', title: id, start: new Date(start).toISOString(), end: new Date(end).toISOString(), allDay: false, color: '#36c', ...extra });

  it('puts a timed event on its day', () => {
    const [item] = googleItems([timed('Dentist', new Date(2026, 10, 10, 9), new Date(2026, 10, 10, 10))]);
    expect(item).toMatchObject({ day: '2026-11-10', allDay: false, source: 'google', part: { index: 0, count: 1 } });
    expect(clockOf(item.startMs)).toBe('09:00');
  });

  it('spreads an event over every day it touches, and not onto the day it only ends at midnight', () => {
    const items = googleItems([timed('Night', new Date(2026, 10, 10, 22), new Date(2026, 10, 11, 2)), timed('Late', new Date(2026, 10, 12, 20), new Date(2026, 10, 13, 0))]);
    expect(items.map((i) => [i.title, i.day])).toEqual([['Night', '2026-11-10'], ['Night', '2026-11-11'], ['Late', '2026-11-12']]);
    expect(items[1].part).toEqual({ index: 1, count: 2 });
  });

  it('treats an all-day event as the days up to, not including, its end date', () => {
    const items = googleItems([{ id: 'Trip', calendarId: 'c', title: 'Trip', start: '2026-11-12', end: '2026-11-15', allDay: true }, { id: 'One', calendarId: 'c', title: 'One', start: '2026-11-20', end: '2026-11-21', allDay: true }]);
    expect(items.filter((i) => i.title === 'Trip').map((i) => i.day)).toEqual(['2026-11-12', '2026-11-13', '2026-11-14']);
    expect(items.filter((i) => i.title === 'One')).toHaveLength(1);
    expect(items.every((i) => i.allDay)).toBe(true);
  });

  it('ignores an event with no readable time', () => {
    expect(googleItems([{ id: 'x', calendarId: 'c', title: 'x', start: 'nonsense', end: 'nonsense', allDay: false }])).toEqual([]);
  });
});

describe('what the person keeps', () => {
  const course = { id: 'c1', name: 'Databases', code: 'DB101', hue: 210, deadlines: [{ id: 'd1', title: 'Lab 3', at: new Date(2026, 10, 9, 9).getTime(), done: false }, { id: 'd2', title: 'Lab 2', at: new Date(2026, 10, 2, 9).getTime(), done: true }], exams: [{ id: 'e1', title: 'Midterm', at: new Date(2026, 10, 20, 9).getTime() }] };

  it('lists study deadlines and exams, tasks with a date and dated Inbox tasks', () => {
    const items = localItems({
      courses: [course],
      cards: [{ id: 'k1', title: 'Pay rent', due: '2026-11-10', column: 'backlog' }, { id: 'k2', title: 'No date', due: '', column: 'backlog' }, { id: 'k3', title: 'Sample', due: '2026-11-10', column: 'backlog', sample: true }, { id: 'k4', title: 'Done one', due: '2026-11-03', column: 'done' }],
      inbox: [{ id: 'i1', kind: 'task', text: 'Call mum', due: '2026-11-11' }, { id: 'i2', kind: 'note', text: 'An idea', due: '2026-11-11' }, { id: 'i3', kind: 'task', text: 'Someday', due: '' }],
    });
    expect(items.map((i) => `${i.source}:${i.title}:${i.day}${i.done ? ':done' : ''}`).sort()).toEqual(
      ['inbox:Call mum:2026-11-11', 'study:Lab 2:2026-11-02:done', 'study:Lab 3:2026-11-09', 'study:Midterm:2026-11-20', 'task:Done one:2026-11-03:done', 'task:Pay rent:2026-11-10'].sort()
    );
    expect(items.find((i) => i.title === 'Midterm')).toMatchObject({ kind: 'exam', sub: 'DB101' });
  });

  it('puts things in the order of the day: no time first, then by the clock', () => {
    const day = '2026-11-10';
    const items = [
      ...googleItems([
        { id: 'b', calendarId: 'c', title: 'Evening', start: new Date(2026, 10, 10, 19).toISOString(), end: new Date(2026, 10, 10, 20).toISOString(), allDay: false },
        { id: 'a', calendarId: 'c', title: 'Morning', start: new Date(2026, 10, 10, 8).toISOString(), end: new Date(2026, 10, 10, 9).toISOString(), allDay: false },
      ]),
      ...localItems({ cards: [{ id: 'k', title: 'Pay rent', due: day, column: 'backlog' }] }),
    ];
    expect(byDay(items).get(day).map((i) => i.title)).toEqual(['Pay rent', 'Morning', 'Evening']);
  });

  it('shows at most three dots, one for each kind of thing, and none for what is done', () => {
    const items = [
      { source: 'google', color: '#36c', done: false },
      { source: 'google', color: '#36c', done: false },
      { source: 'google', color: '#c63', done: false },
      { source: 'study', color: 'a', done: false },
      { source: 'task', color: 'b', done: false },
      { source: 'inbox', color: 'x', done: true },
    ];
    expect(dots(items)).toEqual(['#36c', '#c63', 'a']);
    expect(dots([{ source: 'task', color: 'b', done: true }])).toEqual([]);
  });
});

describe('the agenda', () => {
  const TODAY = '2026-11-08';
  const event = (id, day, hour = 9) => ({ id, calendarId: 'c', title: id, start: new Date(...day.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))), hour).toISOString(), end: new Date(...day.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))), hour + 1).toISOString(), allDay: false });

  it('groups what is coming by when, soonest first, and leaves out what is done', () => {
    const items = [
      ...googleItems([event('Later', '2026-12-20'), event('Standup', '2026-11-08', 9), event('Dinner', '2026-11-09'), event('Review', '2026-11-12')]),
      ...localItems({ cards: [{ id: 'k1', title: 'Late task', due: '2026-11-05', column: 'backlog' }, { id: 'k2', title: 'Finished', due: '2026-11-08', column: 'done' }] }),
    ];
    const groups = agendaGroups(items, TODAY);
    expect(groups.map((g) => [g.id, g.items.map((i) => i.title)])).toEqual([
      ['overdue', ['Late task']],
      ['today', ['Standup']],
      ['tomorrow', ['Dinner']],
      ['week', ['Review']],
      ['later', ['Later']],
    ]);
  });

  it('never calls an event that has passed overdue', () => {
    expect(agendaGroups(googleItems([event('Yesterday', '2026-11-07')]), TODAY)).toEqual([]);
  });

  it('shows an event over several days once, on its first day, and on today while it lasts', () => {
    const trip = { id: 'Trip', calendarId: 'c', title: 'Trip', start: '2026-11-10', end: '2026-11-13', allDay: true };
    expect(agendaGroups(googleItems([trip]), TODAY).flatMap((g) => g.items).map((i) => i.day)).toEqual(['2026-11-10']);
    expect(agendaGroups(googleItems([trip]), '2026-11-11').flatMap((g) => g.items).map((i) => i.day)).toEqual(['2026-11-11']);
  });
});

describe('what is coming', () => {
  const at = (id, day, hour) => ({ id, calendarId: 'c', title: id, start: new Date(2026, 10, day, hour).toISOString(), end: new Date(2026, 10, day, hour + 1).toISOString(), allDay: false });
  it('lists the next events that have not ended, and no more than asked', () => {
    const items = googleItems([at('Done', 8, 8), at('Now', 8, 14), at('Tonight', 8, 19), at('Tomorrow', 9, 9), at('Later', 10, 9)]);
    const now = new Date(2026, 10, 8, 14, 30).getTime();
    expect(upcoming(items, now, 3).map((i) => i.title)).toEqual(['Now', 'Tonight', 'Tomorrow']);
  });

  it('shows an all-day trip once, and leaves tasks and deadlines to the other cards', () => {
    const items = [...googleItems([{ id: 'Trip', calendarId: 'c', title: 'Trip', start: '2026-11-09', end: '2026-11-12', allDay: true }]), ...localItems({ cards: [{ id: 'k', title: 'Task', due: '2026-11-09', column: 'backlog' }] })];
    expect(upcoming(items, new Date(2026, 10, 8, 10).getTime()).map((i) => i.title)).toEqual(['Trip']);
  });
});

describe('the event form', () => {
  const NOW = new Date(2026, 10, 8, 14, 20);

  it('opens a new event on the chosen day, an hour from now', () => {
    expect(draftOf(null, '2026-11-12', NOW)).toMatchObject({ title: '', allDay: false, date: '2026-11-12', startTime: '15:00', endTime: '16:00', repeat: 'none' });
  });

  it('opens an existing timed or all-day event with its own values', () => {
    const timed = { title: 'Dentist', allDay: false, start: new Date(2026, 10, 10, 9, 30).toISOString(), end: new Date(2026, 10, 10, 10, 15).toISOString(), location: 'Clinic', description: '', calendarId: 'c' };
    expect(draftOf(timed, '2026-11-10')).toMatchObject({ date: '2026-11-10', startTime: '09:30', endDate: '2026-11-10', endTime: '10:15', location: 'Clinic', calendarId: 'c' });
    const allDay = { title: 'Trip', allDay: true, start: '2026-11-12', end: '2026-11-15', location: '', description: '', calendarId: 'c' };
    expect(draftOf(allDay, '2026-11-12')).toMatchObject({ allDay: true, date: '2026-11-12', endDate: '2026-11-14' });
  });

  it('turns the form into what the server wants, and back again', () => {
    const draft = { ...draftOf(null, '2026-11-12', NOW), title: '  Lunch ', calendarId: 'c', startTime: '12:00', endTime: '13:30' };
    const input = inputOf(draft, { zone: 'Asia/Ho_Chi_Minh' });
    expect(input).toMatchObject({ title: 'Lunch', allDay: false, timeZone: 'Asia/Ho_Chi_Minh', calendarId: 'c' });
    expect(Date.parse(input.end) - Date.parse(input.start)).toBe(90 * 60 * 1000);
    expect(clockOf(Date.parse(input.start))).toBe('12:00');
  });

  it('fixes an end that is before the start, and ends an all-day event the day after its last day', () => {
    const backwards = inputOf({ ...draftOf(null, '2026-11-12', NOW), title: 'x', calendarId: 'c', startTime: '12:00', endTime: '11:00' });
    expect(Date.parse(backwards.end) - Date.parse(backwards.start)).toBe(60 * 60 * 1000);
    const allDay = inputOf({ ...draftOf(null, '2026-11-12', NOW), title: 'Trip', calendarId: 'c', allDay: true, endDate: '2026-11-14' });
    expect(allDay).toMatchObject({ allDay: true, start: '2026-11-12', end: '2026-11-15' });
    expect(inputOf({ ...draftOf(null, '2026-11-12', NOW), title: 'Trip', calendarId: 'c', allDay: true, endDate: '2026-11-01' })).toMatchObject({ start: '2026-11-12', end: '2026-11-13' });
  });

  it('needs a title, a day and a calendar', () => {
    const base = { ...draftOf(null, '2026-11-12', NOW), calendarId: 'c' };
    expect(draftReady({ ...base, title: 'x' })).toBe(true);
    expect(draftReady({ ...base, title: '  ' })).toBe(false);
    expect(draftReady({ ...base, title: 'x', calendarId: '' })).toBe(false);
    expect(draftReady({ ...base, title: 'x', date: '' })).toBe(false);
  });
});

describe('searching events', () => {
  const events = [
    { id: '1', title: 'Dentist', location: 'Clinic on Main', description: '' },
    { id: '2', title: 'Team lunch', location: '', description: 'with the dentist referral' },
    { id: '3', title: 'Gym', location: '', description: '' },
  ];
  it('finds events that have every word, in the title, place or notes', () => {
    expect(searchEvents(events, 'dentist').map((e) => e.id)).toEqual(['1', '2']);
    expect(searchEvents(events, 'dentist clinic').map((e) => e.id)).toEqual(['1']);
    expect(searchEvents(events, 'x')).toEqual([]);
    expect(searchEvents(events, '')).toEqual([]);
  });
});

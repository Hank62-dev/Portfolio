import { describe, expect, it } from 'vitest';
import { agenda, atOfInput, bucketOf, columnItems, courseProgress, deleteItem, flatten, inputOfAt, newItem, saveItem, stepsProgress, weekSummary } from './planner';

const now = new Date(2026, 10, 2, 10).getTime(); // Mon 2 Nov 2026, 10:00
const DAY = 86400000;
const at = (days) => now + days * DAY;

const db = { id: 'db', name: 'Databases', hue: 265, exams: [{ id: 'e1', title: 'Final', at: at(9) }, { id: 'e0', title: 'Old exam', at: at(-3) }], deadlines: [{ id: 'd1', title: 'Lab 3', at: at(2), done: false }, { id: 'd2', title: 'Proposal', at: at(-1), done: false }, { id: 'd3', title: 'Quiz', at: at(0), done: false, priority: 'high' }, { id: 'd4', title: 'Reading', at: at(0), done: false, priority: 'low' }, { id: 'd5', title: 'Done thing', at: at(-5), done: true }] };
const os = { id: 'os', name: 'Operating Systems', hue: 30, exams: [], deadlines: [{ id: 'd6', title: 'Essay', at: at(1), done: false }] };

describe('buckets', () => {
  it('places a date relative to today', () => {
    expect(bucketOf(at(-1), now)).toBe('overdue');
    expect(bucketOf(at(0), now)).toBe('today');
    expect(bucketOf(at(1), now)).toBe('tomorrow');
    expect(bucketOf(at(5), now)).toBe('week');
    expect(bucketOf(at(8), now)).toBe('later');
  });
});

describe('the agenda', () => {
  const { groups, done, open } = agenda([db, os], now);
  it('groups what is still to do by when, in order', () => {
    expect(groups.map((g) => g.id)).toEqual(['overdue', 'today', 'tomorrow', 'week', 'later']);
    expect(groups.find((g) => g.id === 'overdue').items.map((i) => i.title)).toEqual(['Proposal']);
  });
  it('puts the more important first on the same day', () => {
    expect(groups.find((g) => g.id === 'today').items.map((i) => i.title)).toEqual(['Quiz', 'Reading']);
  });
  it('drops exams that are over, and keeps finished deadlines apart', () => {
    expect(groups.flatMap((g) => g.items).some((i) => i.title === 'Old exam')).toBe(false);
    expect(done.map((i) => i.title)).toEqual(['Done thing']);
    expect(open).toBe(6);
  });
  it('carries the course with each item', () => {
    expect(groups.flatMap((g) => g.items).find((i) => i.title === 'Essay').course.id).toBe('os');
  });
});

describe('the summary', () => {
  it('counts overdue, today, the coming week and the cards due', () => {
    expect(weekSummary([db, os], [{ due: now - 1 }, { due: at(1) }], now)).toEqual({ overdue: 1, today: 2, week: 4, cardsDue: 1 });
  });
});

describe('progress', () => {
  it('measures a checklist', () => {
    expect(stepsProgress({ steps: [{ done: true }, { done: false }, { done: true }, { done: false }] })).toEqual({ done: 2, total: 4, pct: 50 });
    expect(stepsProgress({})).toEqual({ done: 0, total: 0, pct: 0 });
  });
  it('measures a course by its deadlines', () => {
    expect(courseProgress(db)).toBe(20);
    expect(courseProgress({ deadlines: [] })).toBeNull();
  });
});

describe('a board column', () => {
  it('lists what is to do soonest first, then what is done', () => {
    expect(columnItems(db, now).map((i) => i.title)).toEqual(['Proposal', 'Quiz', 'Reading', 'Lab 3', 'Final', 'Done thing']);
  });
});

describe('saving and deleting', () => {
  it('flattens every item with its kind', () => {
    expect(flatten([os]).map((i) => i.kind)).toEqual(['deadline']);
  });
  it('adds a new item to the right list of the right course, in date order', () => {
    const item = newItem({ title: ' Project ', at: at(1) });
    const updates = saveItem([db, os], item, { kind: 'deadline', courseId: 'os' });
    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe('os');
    expect(updates[0].patch.deadlines.map((d) => d.title)).toEqual(['Essay', 'Project']);
    expect(item.title).toBe('Project');
  });
  it('moves an item to another course and takes it out of the first', () => {
    const lab = db.deadlines.find((d) => d.id === 'd1');
    const updates = saveItem([db, os], lab, { kind: 'deadline', courseId: 'os' });
    const from = updates.find((u) => u.id === 'db').patch;
    const to = updates.find((u) => u.id === 'os').patch;
    expect(from.deadlines.some((d) => d.id === 'd1')).toBe(false);
    expect(to.deadlines.map((d) => d.id)).toEqual(['d6', 'd1']);
    expect(to.deadlines).toHaveLength(2);
  });
  it('turns a deadline into an exam without leaving a copy behind', () => {
    const lab = db.deadlines.find((d) => d.id === 'd1');
    const [update] = saveItem([db], lab, { kind: 'exam', courseId: 'db' });
    expect(update.patch.deadlines.some((d) => d.id === 'd1')).toBe(false);
    const exam = update.patch.exams.find((e) => e.id === 'd1');
    expect(exam).toBeTruthy();
    expect('done' in exam).toBe(false);
  });
  it('deletes an item wherever it is', () => {
    const [update] = deleteItem([db, os], 'd6');
    expect(update.id).toBe('os');
    expect(update.patch.deadlines).toEqual([]);
    expect(deleteItem([db, os], 'nope')).toEqual([]);
  });
});

describe('dates for the date field', () => {
  it('turns a date field value into a moment and back', () => {
    expect(inputOfAt(atOfInput('2026-11-05'))).toBe('2026-11-05');
    expect(new Date(atOfInput('2026-11-05')).getHours()).toBe(9);
  });
});

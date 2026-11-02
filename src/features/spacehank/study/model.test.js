import { describe, expect, it } from 'vitest';
import { GRADES, clock, countdown, dueCards, newFlashcard, nextLabels, review, upcoming } from './model';

const NOW = new Date(2026, 10, 2, 12).getTime();
const DAY = 86400000;

describe('review', () => {
  const fresh = newFlashcard('Q', 'A', '', NOW);

  it('starts a new card as due now', () => {
    expect(fresh).toMatchObject({ ease: 2.5, interval: 0, reps: 0, due: NOW });
  });

  it('sends a forgotten card back in ten minutes and makes it a little harder', () => {
    const next = review({ ...fresh, reps: 4, interval: 20, ease: 2.5 }, 0, NOW);
    expect(next).toMatchObject({ reps: 0, interval: 0, ease: 2.3 });
    expect(next.due - NOW).toBe(10 * 60000);
  });

  it('spaces a remembered card further out each time', () => {
    const first = review(fresh, 2, NOW);
    expect(first.interval).toBe(1);
    const second = review(first, 2, NOW);
    expect(second.interval).toBe(3);
    const third = review(second, 2, NOW);
    expect(third.interval).toBe(Math.round(3 * 2.5));
    expect(third.due).toBe(NOW + third.interval * DAY);
  });

  it('makes Easy longer and Hard shorter than Good, and keeps ease from collapsing', () => {
    const seasoned = { ...fresh, reps: 3, interval: 10, ease: 2.5 };
    expect(review(seasoned, 3, NOW).interval).toBeGreaterThan(review(seasoned, 2, NOW).interval);
    expect(review(seasoned, 1, NOW).interval).toBeLessThan(review(seasoned, 2, NOW).interval);
    let card = seasoned;
    for (let i = 0; i < 20; i += 1) card = review(card, 0, NOW);
    expect(card.ease).toBe(1.3);
  });

  it('labels the next review for each button', () => {
    expect(nextLabels(fresh, NOW)).toEqual(['10 min', '1 day', '1 day', '3 days']);
    expect(GRADES.map((g) => g.label)).toEqual(['Again', 'Hard', 'Good', 'Easy']);
  });
});

describe('dueCards', () => {
  const cards = [
    { id: 'a', deck: 'x', due: NOW - 2 * DAY },
    { id: 'b', deck: 'x', due: NOW + DAY },
    { id: 'c', deck: 'y', due: NOW - DAY },
  ];
  it('lists what is due, most overdue first, and can narrow to a deck', () => {
    expect(dueCards(cards, NOW).map((c) => c.id)).toEqual(['a', 'c']);
    expect(dueCards(cards, NOW, 'y').map((c) => c.id)).toEqual(['c']);
  });
});

describe('dates', () => {
  it('counts days and words them', () => {
    expect(countdown(NOW, NOW)).toMatchObject({ days: 0, label: 'today', tone: 'soon' });
    expect(countdown(NOW + 5 * DAY, NOW)).toMatchObject({ days: 5, label: 'in 5 days', tone: 'later' });
    expect(countdown(NOW - 3 * DAY, NOW)).toMatchObject({ days: -3, label: '3 days ago', tone: 'past' });
  });

  it('lists exams and open deadlines together, soonest first, and drops old and finished ones', () => {
    const courses = [
      { id: 'c1', name: 'DB', exams: [{ id: 'e1', title: 'Final', at: NOW + 9 * DAY }], deadlines: [{ id: 'd1', title: 'Lab 3', at: NOW + 2 * DAY, done: false }, { id: 'd2', title: 'Old', at: NOW - 30 * DAY }, { id: 'd3', title: 'Done', at: NOW + DAY, done: true }] },
      { id: 'c2', name: 'OS', exams: [{ id: 'e2', title: 'Midterm', at: NOW + 4 * DAY }] },
    ];
    expect(upcoming(courses, NOW).map((u) => u.title)).toEqual(['Lab 3', 'Midterm', 'Final']);
  });

  it('formats a timer', () => {
    expect([1500, 59, 0, -4].map(clock)).toEqual(['25:00', '00:59', '00:00', '00:00']);
  });
});

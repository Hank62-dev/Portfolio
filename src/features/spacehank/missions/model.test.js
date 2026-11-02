import { describe, expect, it } from 'vitest';
import { dueLabel, dueState, inColumn, moveCard, newCard, progress } from './model';

const card = (id, column, order, extra = {}) => ({ id, title: id, column, order, ...extra });
const board = [card('a', 'backlog', 0), card('b', 'backlog', 1), card('c', 'backlog', 2), card('x', 'doing', 0)];
const apply = (cards, changed) => cards.map((c) => changed.find((n) => n.id === c.id) ?? c);

describe('moveCard', () => {
  it('moves a card to another column at a position and renumbers both columns', () => {
    const next = apply(board, moveCard(board, 'b', 'doing', 0));
    expect(inColumn(next, 'doing').map((c) => c.id)).toEqual(['b', 'x']);
    expect(inColumn(next, 'backlog').map((c) => [c.id, c.order])).toEqual([['a', 0], ['c', 1]]);
  });

  it('reorders inside a column', () => {
    const next = apply(board, moveCard(board, 'a', 'backlog', 2));
    expect(inColumn(next, 'backlog').map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('puts a card at the end when the position is past the end, and ignores unknown cards', () => {
    const next = apply(board, moveCard(board, 'a', 'doing', 99));
    expect(inColumn(next, 'doing').map((c) => c.id)).toEqual(['x', 'a']);
    expect(moveCard(board, 'nope', 'done', 0)).toEqual([]);
  });

  it('returns only what changed', () => {
    expect(moveCard(board, 'c', 'backlog', 2)).toEqual([]);
    expect(moveCard(board, 'c', 'done', 0).map((c) => c.id)).toEqual(['c']);
  });
});

describe('due dates', () => {
  const now = new Date(2026, 10, 2, 15, 30);
  it('says where a date stands today', () => {
    expect(dueState('2026-11-01', now)).toBe('overdue');
    expect(dueState('2026-11-02', now)).toBe('today');
    expect(dueState('2026-11-04', now)).toBe('soon');
    expect(dueState('2026-11-20', now)).toBe('later');
    expect(dueState('', now)).toBeNull();
  });
  it('labels them in words', () => {
    expect(dueLabel('2026-11-02', now)).toBe('Today');
    expect(dueLabel('2026-11-03', now)).toBe('Tomorrow');
    expect(dueLabel('2026-10-31', now)).toBe('2 days ago');
  });
});

describe('cards and checklists', () => {
  it('trims titles and starts empty', () => {
    expect(newCard('  Ship it  ', 'doing', 3)).toMatchObject({ title: 'Ship it', column: 'doing', order: 3, checklist: [], labels: [] });
  });
  it('counts checklist progress', () => {
    expect(progress([{ done: true }, { done: false }, { done: true }, { done: true }])).toEqual({ done: 3, total: 4, pct: 75 });
    expect(progress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

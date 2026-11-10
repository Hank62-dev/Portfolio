import { describe, expect, it } from 'vitest';
import { BAU_CUA, CARO, caroMove, caroWin, clashes, countSolutions, duel, makeSudoku, newSnake, rollDice, settle, shuffle, stepSnake } from './logic';

// a fixed random source makes every game repeatable
const seeded = (seed = 7) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('shuffle', () => {
  it('keeps every item exactly once', () => {
    expect([...shuffle([1, 2, 3, 4, 5, 6], seeded())].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('Sudoku', () => {
  const { puzzle, solution } = makeSudoku(38, seeded(3));
  it('makes a full solution without a clash', () => {
    expect(solution.every((d) => d >= 1 && d <= 9)).toBe(true);
    expect(clashes(solution).size).toBe(0);
  });
  it('leaves a puzzle with the asked number of blanks and one solution', () => {
    expect(puzzle.filter((d) => d === 0).length).toBe(38);
    expect(countSolutions(puzzle)).toBe(1);
    expect(puzzle.every((d, i) => d === 0 || d === solution[i])).toBe(true);
  });
  it('points out clashing digits', () => {
    const grid = Array(81).fill(0);
    grid[0] = 5;
    grid[8] = 5;
    expect([...clashes(grid)].sort()).toEqual([0, 8]);
  });
});

describe('Cờ caro', () => {
  const place = (cells) => {
    const board = Array(CARO * CARO).fill(0);
    for (const [r, c, who] of cells) board[r * CARO + c] = who;
    return board;
  };
  it('sees five in a row, in any direction', () => {
    const board = place([[3, 3, 1], [4, 4, 1], [5, 5, 1], [6, 6, 1], [7, 7, 1]]);
    expect(caroWin(board, 5, 5)).toHaveLength(5);
    expect(caroWin(place([[3, 3, 1], [4, 4, 1], [5, 5, 1], [6, 6, 1]]), 5, 5)).toBeNull();
  });
  it('plays in the middle first, completes its own four, and blocks a four', () => {
    expect(caroMove(Array(CARO * CARO).fill(0), 2, CARO, seeded())).toBe(6 * CARO + 6);
    const own = place([[5, 2, 2], [5, 3, 2], [5, 4, 2], [5, 5, 2], [8, 8, 1]]);
    expect([5 * CARO + 1, 5 * CARO + 6]).toContain(caroMove(own, 2, CARO, seeded()));
    const block = place([[2, 2, 1], [3, 3, 1], [4, 4, 1], [5, 5, 1], [9, 1, 2]]);
    expect([1 * CARO + 1, 6 * CARO + 6]).toContain(caroMove(block, 2, CARO, seeded()));
  });
});

describe('Bầu cua tôm cá', () => {
  it('rolls three of the six symbols', () => {
    const dice = rollDice(seeded());
    expect(dice).toHaveLength(3);
    expect(dice.every((d) => BAU_CUA.includes(d))).toBe(true);
  });
  it('pays a bet once per matching die and loses it when none match', () => {
    expect(settle({ cua: 10 }, ['cua', 'ca', 'ga'])).toBe(10);
    expect(settle({ cua: 10 }, ['cua', 'cua', 'ga'])).toBe(20);
    expect(settle({ cua: 10, ca: 5 }, ['cua', 'cua', 'cua'])).toBe(30 - 5);
    expect(settle({ nai: 10 }, ['cua', 'ca', 'ga'])).toBe(-10);
  });
});

describe('Rắn săn mồi', () => {
  it('moves, grows on food, and cannot turn straight back', () => {
    const start = { ...newSnake(10), food: [5, 5] };
    const moved = stepSnake(start, 'right');
    expect(moved.body[0]).toEqual([5, 4]);
    expect(stepSnake(start, 'left').dir).toBe('right');
    const eaten = stepSnake(moved, 'right', seeded());
    expect(eaten.body).toHaveLength(4);
    expect(eaten.score).toBe(1);
  });
  it('ends at a wall and when it bites itself', () => {
    let state = newSnake(10);
    for (let i = 0; i < 10; i += 1) state = stepSnake(state, 'right');
    expect(state.over).toBe(true);
    const coil = { size: 10, dir: 'left', food: [0, 0], score: 0, over: false, body: [[5, 5], [5, 6], [6, 6], [6, 5], [6, 4], [5, 4]] };
    expect(stepSnake(coil, 'down').over).toBe(true);
  });
});

describe('Kéo búa bao', () => {
  it('knows who wins', () => {
    expect(duel('keo', 'bao')).toBe(1);
    expect(duel('keo', 'bua')).toBe(-1);
    expect(duel('bao', 'bao')).toBe(0);
  });
});

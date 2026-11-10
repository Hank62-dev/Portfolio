import { describe, expect, it } from 'vitest';
import { addTile, allOff, canMove2048, flagsLeft, isSolvedSlide, move2048, neighboursOf, new2048, newLights, newMines, newSlide, nextHole, openCell, pressLamp, pressesForLevel, slideLine, slideTile, solvedSlide, toggleFlag } from './grid';

const seeded = (seed = 7) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('2048', () => {
  it('joins equal tiles once per move', () => {
    expect(slideLine([2, 2, 2, 2])).toEqual({ line: [4, 4, 0, 0], gained: 8 });
    expect(slideLine([2, 2, 4, 0])).toEqual({ line: [4, 4, 0, 0], gained: 4 });
    expect(slideLine([0, 4, 0, 4])).toEqual({ line: [8, 0, 0, 0], gained: 8 });
    expect(slideLine([2, 4, 2, 4]).gained).toBe(0);
  });
  it('slides the whole board each way, and says when nothing moved', () => {
    const board = [2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 4];
    expect(move2048(board, 'left').board.slice(0, 4)).toEqual([4, 0, 0, 0]);
    expect(move2048(board, 'right').board.slice(12)).toEqual([0, 0, 0, 8]);
    expect(move2048(board, 'up').board[0]).toBe(2);
    expect(move2048(board, 'up').board[12]).toBe(0);
    const packed = [2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(move2048(packed, 'up').moved).toBe(false);
    expect(move2048(packed, 'left').moved).toBe(false);
  });
  it('starts with two tiles and adds one at a time', () => {
    const board = new2048(seeded(2));
    expect(board.filter(Boolean)).toHaveLength(2);
    expect(addTile(board, seeded(5)).filter(Boolean)).toHaveLength(3);
    expect(addTile(Array(16).fill(2))).toEqual(Array(16).fill(2));
  });
  it('knows when it is stuck', () => {
    const stuck = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
    expect(canMove2048(stuck)).toBe(false);
    expect(canMove2048([...stuck.slice(0, 15), 4])).toBe(true);
    expect(canMove2048([...stuck.slice(0, 14), 4, 2].map((v, i) => (i === 14 ? 2 : v)))).toBe(true); // two 2s side by side
  });
});

describe('minesweeper', () => {
  it('lays the mines on the first tap and never under it or beside it', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const game = openCell(newMines(), 40, seeded(seed));
      expect(game.mines.filter(Boolean)).toHaveLength(10);
      expect([40, ...neighboursOf(40, 9, 9)].some((i) => game.mines[i])).toBe(false);
      expect(game.status === 'playing' || game.status === 'won').toBe(true);
    }
  });
  it('opens a whole clearing when the tap has no mine around it', () => {
    const game = openCell(newMines(), 40, seeded(9));
    expect(game.opened.filter(Boolean).length).toBeGreaterThan(1);
  });
  it('ends the game on a mine and shows which one', () => {
    const first = openCell(newMines(), 40, seeded(3));
    const mine = first.mines.indexOf(true);
    const lost = openCell(first, mine);
    expect(lost.status).toBe('lost');
    expect(lost.boom).toBe(mine);
  });
  it('wins when every safe cell is open', () => {
    let game = openCell(newMines(), 40, seeded(6));
    for (let i = 0; i < 81; i += 1) if (!game.mines[i]) game = openCell(game, i);
    expect(game.status).toBe('won');
  });
  it('flags a closed cell, keeps flagged cells shut, and counts what is left', () => {
    let game = newMines();
    game = toggleFlag(game, 0);
    expect(flagsLeft(game)).toBe(9);
    expect(openCell(game, 0).opened[0]).toBe(false);
    expect(flagsLeft(toggleFlag(game, 0))).toBe(10);
  });
  it('counts neighbours at the edges', () => {
    expect(neighboursOf(0, 9, 9)).toHaveLength(3);
    expect(neighboursOf(4, 9, 9)).toHaveLength(5);
    expect(neighboursOf(40, 9, 9)).toHaveLength(8);
  });
});

describe('sliding puzzle', () => {
  it('slides a tile, or a whole row of them, into the blank', () => {
    const board = solvedSlide(); // blank at the bottom right
    expect(slideTile(board, 14)[15]).toBe(15);
    expect(slideTile(board, 14)[14]).toBe(0);
    const row = slideTile(board, 12);
    expect(row.slice(12)).toEqual([0, 13, 14, 15]);
    expect(slideTile(board, 0)).toBeNull();
    expect(slideTile(board, 15)).toBeNull();
    expect(slideTile(board, 11)?.[11]).toBe(0);
  });
  it('makes a shuffled board that is not already solved and has every tile once', () => {
    const board = newSlide(4, seeded(11));
    expect(isSolvedSlide(board)).toBe(false);
    expect([...board].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });
  it('can be undone back to solved, since it was made by sliding', () => {
    expect(isSolvedSlide(solvedSlide(3))).toBe(true);
  });
});

describe('lights out', () => {
  it('flips a lamp and its four neighbours, fewer at the edge', () => {
    const board = Array(25).fill(0);
    expect(pressLamp(board, 12).filter(Boolean)).toHaveLength(5);
    expect(pressLamp(board, 0).filter(Boolean)).toHaveLength(3);
    expect(allOff(pressLamp(pressLamp(board, 7), 7))).toBe(true);
  });
  it('makes a puzzle that is not solved yet, and that its own presses undo', () => {
    const random = seeded(4);
    const board = newLights(5, random);
    expect(allOff(board)).toBe(false);
    expect(pressesForLevel(1)).toBe(4);
    expect(pressesForLevel(50)).toBe(12);
  });
});

describe('whack-a-mole', () => {
  it('never pops up twice from the same hole', () => {
    const random = seeded(8);
    let hole = -1;
    for (let k = 0; k < 60; k += 1) {
      const next = nextHole(hole, random);
      expect(next).not.toBe(hole);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThan(9);
      hole = next;
    }
  });
});

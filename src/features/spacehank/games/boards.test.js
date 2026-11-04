import { describe, expect, it } from 'vitest';
import { C4_COLS, C4_ROWS, c4Full, c4Move, c4Winner, countDiscs, dropDisc, emptyC4, landingRow, legalMoves, newReversi, playReversi, reversiMove, whoNext } from './boards';

const seeded = (seed = 7) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('four in a row', () => {
  it('drops a disc to the lowest free row and refuses a full column', () => {
    let board = emptyC4();
    expect(landingRow(board, 3)).toBe(C4_ROWS - 1);
    for (let k = 0; k < C4_ROWS; k += 1) board = dropDisc(board, 3, 1 + (k % 2));
    expect(landingRow(board, 3)).toBe(-1);
    expect(dropDisc(board, 3, 1)).toBeNull();
    expect(board[3]).toBe(2); // the top disc is the sixth one dropped
  });
  it('finds four across, down and on both diagonals', () => {
    let across = emptyC4();
    for (const c of [1, 2, 3, 4]) across = dropDisc(across, c, 1);
    expect(c4Winner(across)).toMatchObject({ who: 1 });
    let down = emptyC4();
    for (let k = 0; k < 4; k += 1) down = dropDisc(down, 0, 2);
    expect(c4Winner(down)).toMatchObject({ who: 2 });
    // a rising diagonal: columns 0..3 with columns 1..3 filled up beneath
    let diag = emptyC4();
    const plan = [[0, 1], [1, 2], [1, 1], [2, 2], [2, 2], [2, 1], [3, 2], [3, 2], [3, 2], [3, 1]];
    for (const [c, w] of plan) diag = dropDisc(diag, c, w);
    expect(c4Winner(diag)).toMatchObject({ who: 1 });
    // a falling diagonal, the mirror of it
    let fall = emptyC4();
    for (const [c, w] of plan) fall = dropDisc(fall, C4_COLS - 1 - c, w);
    expect(c4Winner(fall)).toMatchObject({ who: 1 });
    expect(c4Winner(emptyC4())).toBeNull();
  });
  it('knows a full board', () => {
    expect(c4Full(emptyC4())).toBe(false);
    expect(c4Full(Array(C4_ROWS * C4_COLS).fill(1))).toBe(true);
  });
  it('takes a win in one move, and blocks the player who is about to win', () => {
    let win = emptyC4();
    for (const c of [1, 2, 3]) win = dropDisc(win, c, 2);
    expect([0, 4]).toContain(c4Move(win, 2, 4, seeded(1)));
    // three in a row against the wall can only be finished on one side, so that is the column to block
    let block = emptyC4();
    for (const c of [0, 1, 2]) block = dropDisc(block, c, 1);
    block = dropDisc(block, 6, 2);
    expect(c4Move(block, 2, 4, seeded(2))).toBe(3);
  });
});

describe('reversi', () => {
  it('starts with four discs and four moves for the player', () => {
    const board = newReversi();
    expect(countDiscs(board)).toEqual({ 1: 2, 2: 2 });
    expect(legalMoves(board, 1).map((m) => m.i).sort((a, b) => a - b)).toEqual([19, 26, 37, 44]);
  });
  it('turns over the discs it traps, and refuses a move that turns none', () => {
    const board = newReversi();
    const next = playReversi(board, 19, 1);
    expect(countDiscs(next)).toEqual({ 1: 4, 2: 1 });
    expect(next[27]).toBe(1);
    expect(playReversi(board, 0, 1)).toBeNull();
    expect(playReversi(next, 19, 2)).toBeNull(); // already taken
  });
  it('says who moves next, passing when a side is stuck, and ending when both are', () => {
    const board = newReversi();
    expect(whoNext(board, 1)).toBe(2);
    const stuck = Array(64).fill(1);
    expect(whoNext(stuck, 1)).toBe(0);
    // white has no move here but black still has one, so black plays again
    const row = Array(64).fill(0);
    row[0] = 1;
    row[1] = 2;
    expect(legalMoves(row, 2)).toHaveLength(0);
    expect(whoNext(row, 1)).toBe(1);
  });
  it('plays a legal move for the computer, and the only move when there is just one', () => {
    const board = newReversi();
    const move = reversiMove(playReversi(board, 19, 1), 2, seeded(3));
    expect(legalMoves(playReversi(board, 19, 1), 2).map((m) => m.i)).toContain(move);
    // with one move on the board, that is the move
    const single = Array(64).fill(0);
    single[1] = 1;
    single[2] = 2;
    expect(legalMoves(single, 2).map((m) => m.i)).toEqual([0]);
    expect(reversiMove(single, 2, seeded(4))).toBe(0);
    expect(reversiMove(Array(64).fill(1), 2)).toBe(-1);
  });
  it('plays a whole game against itself without breaking the rules', () => {
    let board = newReversi();
    let who = 1;
    const random = seeded(12);
    let turns = 0;
    while (who && turns < 80) {
      const move = reversiMove(board, who, random);
      board = playReversi(board, move, who);
      expect(board).not.toBeNull();
      who = whoNext(board, who);
      turns += 1;
    }
    const { 1: black, 2: white } = countDiscs(board);
    expect(black + white).toBeGreaterThan(4);
    expect(who).toBe(0);
  });
});

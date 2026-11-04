import { describe, expect, it } from 'vitest';
import { T_COLS, T_ROWS, cellsOf, collides, fall, hardDrop, landing, lockPiece, newTetris, rotateShape, shift, spawn, speedOf, turn, upNext } from './tetris';

const seeded = (seed = 7) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('falling blocks', () => {
  it('turns a shape a quarter, four times round to the start', () => {
    const t = spawn(3).shape;
    expect(rotateShape(t)).toEqual([[0, 1, 0], [0, 1, 1], [0, 1, 0]]);
    expect(rotateShape(rotateShape(rotateShape(rotateShape(t))))).toEqual(t);
  });
  it('starts with an empty board, a piece, and the next kinds queued', () => {
    const game = newTetris(seeded(1));
    expect(game.board.every((v) => v === 0)).toBe(true);
    expect(cellsOf(game.piece)).toHaveLength(4);
    expect(upNext(game)).toBeGreaterThanOrEqual(1);
    expect(game.over).toBe(false);
  });
  it('moves sideways, but not through a wall', () => {
    let game = newTetris(seeded(2));
    for (let k = 0; k < 12; k += 1) game = shift(game, -1);
    expect(Math.min(...cellsOf(game.piece).map(([, c]) => c))).toBe(0);
    for (let k = 0; k < 14; k += 1) game = shift(game, 1);
    expect(Math.max(...cellsOf(game.piece).map(([, c]) => c))).toBe(T_COLS - 1);
  });
  it('turns next to a wall by nudging away from it', () => {
    let game = { ...newTetris(seeded(3)), piece: { ...spawn(1), r: 5 } };
    game = turn(game); // flat to upright
    for (let k = 0; k < 12; k += 1) game = shift(game, 1);
    game = turn(game); // upright against the right wall, back to flat: needs a nudge
    expect(collides(game.board, game.piece)).toBe(false);
    expect(Math.max(...cellsOf(game.piece).map(([, c]) => c))).toBeLessThan(T_COLS);
  });
  it('falls to the floor and sets, then brings in the next piece', () => {
    let game = newTetris(seeded(4));
    const first = game.piece.kind;
    const next = upNext(game);
    game = hardDrop(game, seeded(5));
    expect(game.board.filter((v) => v === first)).toHaveLength(4);
    expect(game.piece.kind).toBe(next);
    expect(game.score).toBeGreaterThan(0);
  });
  it('clears a full line and scores it', () => {
    const board = Array(T_COLS * T_ROWS).fill(0);
    for (let c = 0; c < T_COLS; c += 1) if (c < 6) board[(T_ROWS - 1) * T_COLS + c] = 5; // the bottom row is full but for four cells
    const flat = { kind: 1, shape: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1]], r: T_ROWS - 4, c: 6 };
    const done = lockPiece({ ...newTetris(seeded(6)), board, piece: flat }, seeded(7));
    expect(done.lines).toBe(1);
    expect(done.score).toBe(100);
    expect(done.board.slice((T_ROWS - 1) * T_COLS).every((v) => v === 0)).toBe(true);
  });
  it('shows where the piece will land', () => {
    const game = newTetris(seeded(8));
    const ghost = landing(game);
    expect(collides(game.board, ghost)).toBe(false);
    expect(collides(game.board, { ...ghost, r: ghost.r + 1 })).toBe(true);
  });
  it('ends when a new piece has no room', () => {
    let game = newTetris(seeded(9));
    for (let k = 0; k < 40 && !game.over; k += 1) game = hardDrop(game, seeded(k + 1));
    expect(game.over).toBe(true);
  });
  it('speeds up with the level, to a limit', () => {
    expect(speedOf(1)).toBeGreaterThan(speedOf(5));
    expect(speedOf(40)).toBe(90);
  });
  it('lets a piece fall one row at a time first', () => {
    const game = newTetris(seeded(10));
    expect(fall(game).piece.r).toBe(game.piece.r + 1);
  });
});

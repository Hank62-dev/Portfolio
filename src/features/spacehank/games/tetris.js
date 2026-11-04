// The rules of "Xếp hình" (falling blocks), as plain functions. The board is 10 across and 20 down, a flat array of 0 (empty)
// or a number 1 to 7 for the kind of block that filled the cell.

import { shuffle } from './logic';

export const T_COLS = 10;
export const T_ROWS = 20;

// the shapes as little matrices, in the shape they spawn in
const SHAPES = {
  1: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
  2: [[1, 1], [1, 1]], // O
  3: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], // T
  4: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], // S
  5: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], // Z
  6: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], // J
  7: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], // L
};

/** A matrix turned a quarter clockwise. */
export const rotateShape = (shape) => shape[0].map((_, c) => shape.map((row) => row[c]).reverse());

export const spawn = (kind) => ({ kind, shape: SHAPES[kind], r: kind === 1 ? -1 : 0, c: Math.floor((T_COLS - SHAPES[kind][0].length) / 2) });

/** The board cells a piece covers, as `[row, col]`. */
export const cellsOf = (piece) => {
  const out = [];
  piece.shape.forEach((row, dr) => row.forEach((on, dc) => on && out.push([piece.r + dr, piece.c + dc])));
  return out;
};

/** Whether the piece is off the sides or the floor, or on a filled cell. (Above the top is allowed while it spawns.) */
export const collides = (board, piece) => cellsOf(piece).some(([r, c]) => c < 0 || c >= T_COLS || r >= T_ROWS || (r >= 0 && board[r * T_COLS + c] !== 0));

const bagOf = (random) => shuffle([1, 2, 3, 4, 5, 6, 7], random);

export const newTetris = (random = Math.random) => {
  const bag = [...bagOf(random), ...bagOf(random)];
  return { board: Array(T_COLS * T_ROWS).fill(0), piece: spawn(bag.shift()), bag, score: 0, lines: 0, level: 1, over: false, cleared: 0 };
};

const refill = (bag, random) => (bag.length > 7 ? bag : [...bag, ...bagOf(random)]);

/** The kind of block that comes next. */
export const upNext = (game) => game.bag[0];

/** Points for clearing 1, 2, 3 or 4 lines at once, times the level. */
export const LINE_POINTS = [0, 100, 300, 500, 800];

/** Fixes the piece in place, clears full lines, and brings the next one in (the game ends if it has no room). */
export const lockPiece = (game, random = Math.random) => {
  const board = [...game.board];
  for (const [r, c] of cellsOf(game.piece)) {
    if (r < 0) return { ...game, over: true };
    board[r * T_COLS + c] = game.piece.kind;
  }
  const kept = [];
  for (let r = 0; r < T_ROWS; r += 1) {
    const row = board.slice(r * T_COLS, (r + 1) * T_COLS);
    if (row.some((v) => v === 0)) kept.push(row);
  }
  const cleared = T_ROWS - kept.length;
  const filled = [...Array.from({ length: cleared }, () => Array(T_COLS).fill(0)), ...kept].flat();
  const lines = game.lines + cleared;
  const level = Math.floor(lines / 10) + 1;
  const bag = refill(game.bag, random);
  const piece = spawn(bag[0]);
  return { board: filled, piece, bag: bag.slice(1), score: game.score + LINE_POINTS[cleared] * game.level, lines, level, over: collides(filled, piece), cleared };
};

/** One step of gravity, or the piece sets down when it cannot fall any further. */
export const fall = (game, random) => {
  if (game.over) return game;
  const moved = { ...game.piece, r: game.piece.r + 1 };
  if (!collides(game.board, moved)) return { ...game, piece: moved, cleared: 0 };
  return lockPiece(game, random);
};

export const shift = (game, dc) => {
  if (game.over) return game;
  const moved = { ...game.piece, c: game.piece.c + dc };
  return collides(game.board, moved) ? game : { ...game, piece: moved };
};

/** A quarter turn, nudged a step or two sideways if the wall or the stack is in the way. */
export const turn = (game) => {
  if (game.over || game.piece.kind === 2) return game;
  const shape = rotateShape(game.piece.shape);
  for (const dc of [0, -1, 1, -2, 2]) {
    const moved = { ...game.piece, shape, c: game.piece.c + dc };
    if (!collides(game.board, moved)) return { ...game, piece: moved };
  }
  return game;
};

/** Where the piece would land if dropped now (for the ghost outline). */
export const landing = (game) => {
  let piece = game.piece;
  while (!collides(game.board, { ...piece, r: piece.r + 1 })) piece = { ...piece, r: piece.r + 1 };
  return piece;
};

/** Drops the piece all the way down and sets it, with two points for each row it fell. */
export const hardDrop = (game, random) => {
  if (game.over) return game;
  const piece = landing(game);
  const dropped = piece.r - game.piece.r;
  return lockPiece({ ...game, piece, score: game.score + dropped * 2 }, random);
};

/** Milliseconds between steps of gravity at this level: quicker as the levels go up. */
export const speedOf = (level) => Math.max(90, 760 - (level - 1) * 62);

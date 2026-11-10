// The rules of the puzzle games played on a grid in "Ra chơi": 2048, minesweeper, the sliding puzzle and lights out.
// Plain functions, so they can be tested without a screen. A board is a flat array, row after row.

import { shuffle } from './logic';

// ---- 2048 -----------------------------------------------------------------------------------------------------------

export const SIZE_2048 = 4;

/** Slides a line toward its start and joins equal neighbours once: [2,2,4,0] gives [4,4,0,0] and gains 4. */
export const slideLine = (line) => {
  const tiles = line.filter(Boolean);
  const out = [];
  let gained = 0;
  for (let i = 0; i < tiles.length; i += 1) {
    if (tiles[i] === tiles[i + 1]) {
      out.push(tiles[i] * 2);
      gained += tiles[i] * 2;
      i += 1;
    } else {
      out.push(tiles[i]);
    }
  }
  while (out.length < line.length) out.push(0);
  return { line: out, gained };
};

// for each direction, the cells of every line in the order the tiles slide along it
const lines2048 = (dir) => {
  const n = SIZE_2048;
  const out = [];
  for (let a = 0; a < n; a += 1) {
    const line = [];
    for (let b = 0; b < n; b += 1) {
      if (dir === 'left') line.push(a * n + b);
      else if (dir === 'right') line.push(a * n + (n - 1 - b));
      else if (dir === 'up') line.push(b * n + a);
      else line.push((n - 1 - b) * n + a);
    }
    out.push(line);
  }
  return out;
};

/** Moves the whole board one way. `moved` is false when nothing slid, so the move does not count. */
export const move2048 = (board, dir) => {
  const next = [...board];
  let gained = 0;
  for (const cells of lines2048(dir)) {
    const result = slideLine(cells.map((i) => board[i]));
    gained += result.gained;
    cells.forEach((cell, k) => {
      next[cell] = result.line[k];
    });
  }
  return { board: next, gained, moved: next.some((v, i) => v !== board[i]) };
};

/** A new tile (a 2, now and then a 4) in a random empty cell; the same board if it is full. */
export const addTile = (board, random = Math.random) => {
  const empty = board.flatMap((v, i) => (v === 0 ? [i] : []));
  if (!empty.length) return board;
  const next = [...board];
  next[empty[Math.floor(random() * empty.length)]] = random() < 0.9 ? 2 : 4;
  return next;
};

export const new2048 = (random = Math.random) => addTile(addTile(Array(SIZE_2048 * SIZE_2048).fill(0), random), random);

/** Whether any move is left: an empty cell, or two equal tiles side by side. */
export const canMove2048 = (board) => ['left', 'right', 'up', 'down'].some((dir) => move2048(board, dir).moved);

// ---- Minesweeper ----------------------------------------------------------------------------------------------------

export const MINES = { rows: 9, cols: 9, mines: 10 };

export const neighboursOf = (i, rows, cols) => {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
    }
  }
  return out;
};

/** A fresh field: nothing is laid yet (the mines go down on the first tap, so that tap is always safe). */
export const newMines = ({ rows, cols, mines } = MINES) => ({
  rows,
  cols,
  total: mines,
  mines: null,
  counts: null,
  opened: Array(rows * cols).fill(false),
  flags: Array(rows * cols).fill(false),
  status: 'ready',
  boom: -1,
});

const layMines = (game, safe, random) => {
  const { rows, cols, total } = game;
  const keep = new Set([safe, ...neighboursOf(safe, rows, cols)]);
  const options = shuffle(
    Array.from({ length: rows * cols }, (_, i) => i).filter((i) => !keep.has(i)),
    random
  );
  const mines = Array(rows * cols).fill(false);
  options.slice(0, total).forEach((i) => {
    mines[i] = true;
  });
  const counts = mines.map((_, i) => neighboursOf(i, rows, cols).filter((j) => mines[j]).length);
  return { mines, counts };
};

/** Opens a cell. A zero opens its neighbours too, as far as the zeros go. A mine ends the game. */
export const openCell = (game, i, random = Math.random) => {
  if (game.status === 'won' || game.status === 'lost' || game.flags[i] || game.opened[i]) return game;
  const laid = game.mines ? game : { ...game, ...layMines(game, i, random), status: 'playing' };
  if (laid.mines[i]) return { ...laid, status: 'lost', boom: i };
  const opened = [...laid.opened];
  const queue = [i];
  opened[i] = true;
  while (queue.length) {
    const at = queue.pop();
    if (laid.counts[at] !== 0) continue;
    for (const j of neighboursOf(at, laid.rows, laid.cols)) {
      if (opened[j] || laid.flags[j]) continue;
      opened[j] = true;
      queue.push(j);
    }
  }
  const safeCells = laid.rows * laid.cols - laid.total;
  const won = opened.filter(Boolean).length === safeCells;
  return { ...laid, opened, status: won ? 'won' : 'playing' };
};

/** Puts a flag on a closed cell, or takes it off. */
export const toggleFlag = (game, i) => {
  if (game.status === 'won' || game.status === 'lost' || game.opened[i]) return game;
  const flags = [...game.flags];
  flags[i] = !flags[i];
  return { ...game, flags };
};

export const flagsLeft = (game) => game.total - game.flags.filter(Boolean).length;

// ---- The sliding puzzle (15) ----------------------------------------------------------------------------------------

export const solvedSlide = (size = 4) => [...Array.from({ length: size * size - 1 }, (_, i) => i + 1), 0];

export const isSolvedSlide = (board) => board.every((v, i) => v === (i === board.length - 1 ? 0 : i + 1));

/** Moves the tile at `i` toward the blank, and every tile between them, as a finger would. Null if it cannot slide. */
export const slideTile = (board, i, size = 4) => {
  const blank = board.indexOf(0);
  if (i === blank) return null;
  const r = Math.floor(i / size);
  const c = i % size;
  const br = Math.floor(blank / size);
  const bc = blank % size;
  if (r !== br && c !== bc) return null;
  const stride = r === br ? (bc > c ? 1 : -1) : br > r ? size : -size; // from the tile toward the blank
  const next = [...board];
  let at = blank;
  while (at !== i) {
    next[at] = next[at - stride];
    at -= stride;
  }
  next[i] = 0;
  return next;
};

/** A shuffled board that can always be solved, made by sliding tiles at random from the solved one. */
export const newSlide = (size = 4, random = Math.random, steps = 160) => {
  let board = solvedSlide(size);
  let last = -1;
  for (let k = 0; k < steps; k += 1) {
    const blank = board.indexOf(0);
    const options = neighboursOf(blank, size, size).filter((j) => {
      const sameRow = Math.floor(j / size) === Math.floor(blank / size);
      const sameCol = j % size === blank % size;
      return (sameRow || sameCol) && j !== last;
    });
    const pick = options[Math.floor(random() * options.length)];
    last = blank;
    board = slideTile(board, pick, size);
  }
  return isSolvedSlide(board) ? newSlide(size, random, steps + 1) : board;
};

// ---- Lights out -----------------------------------------------------------------------------------------------------

export const LIGHTS = 5;

/** Pressing a lamp flips it and the four beside it. */
export const pressLamp = (board, i, size = LIGHTS) => {
  const r = Math.floor(i / size);
  const c = i % size;
  const next = [...board];
  for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < size && cc >= 0 && cc < size) next[rr * size + cc] = next[rr * size + cc] ? 0 : 1;
  }
  return next;
};

export const allOff = (board) => board.every((v) => !v);

/** A puzzle that can be solved in `presses` presses or fewer, made by pressing that many different lamps at random. */
export const newLights = (presses, random = Math.random, size = LIGHTS) => {
  const picks = shuffle(Array.from({ length: size * size }, (_, i) => i), random).slice(0, presses);
  const board = picks.reduce((b, i) => pressLamp(b, i, size), Array(size * size).fill(0));
  return allOff(board) ? newLights(presses, random, size) : board;
};

/** How many lamps level `n` starts with pressed: a few at first, up to a dozen. */
export const pressesForLevel = (level) => Math.min(3 + level, 12);

// ---- Whack-a-mole ---------------------------------------------------------------------------------------------------

/** Which hole the next mole comes out of: never the one it just left. */
export const nextHole = (previous, random = Math.random, holes = 9) => {
  const options = Array.from({ length: holes }, (_, i) => i).filter((i) => i !== previous);
  return options[Math.floor(random() * options.length)];
};

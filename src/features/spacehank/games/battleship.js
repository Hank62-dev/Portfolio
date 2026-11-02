// Bắn tàu: the notebook-paper naval game. Ten by ten squares, a fleet of ten boats (one of four squares, two of three,
// three of two, four of one), and the boats may not touch, even at a corner. Pure rules and a computer opponent.

import { shuffle } from './logic';

export const SIZE = 10;
export const FLEET = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

const at = (r, c) => r * SIZE + c;
const inside = (r, c) => r >= 0 && c >= 0 && r < SIZE && c < SIZE;
export const around = (i) => {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  const out = [];
  for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) if ((dr || dc) && inside(r + dr, c + dc)) out.push(at(r + dr, c + dc));
  return out;
};
const beside = (i) => {
  const r = Math.floor(i / SIZE);
  const c = i % SIZE;
  return [[-1, 0], [1, 0], [0, -1], [0, 1]].filter(([dr, dc]) => inside(r + dr, c + dc)).map(([dr, dc]) => at(r + dr, c + dc));
};

/** A random fleet with no two boats touching: [{ id, size, cells }]. */
export const randomFleet = (random = Math.random) => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const taken = new Set();
    const ships = [];
    let ok = true;
    for (const [id, size] of FLEET.entries()) {
      let placed = false;
      for (let tries = 0; tries < 300 && !placed; tries += 1) {
        const vertical = random() < 0.5;
        const r = Math.floor(random() * (vertical ? SIZE - size + 1 : SIZE));
        const c = Math.floor(random() * (vertical ? SIZE : SIZE - size + 1));
        const cells = Array.from({ length: size }, (_, k) => (vertical ? at(r + k, c) : at(r, c + k)));
        if (cells.some((cell) => taken.has(cell) || around(cell).some((n) => taken.has(n)))) continue;
        cells.forEach((cell) => taken.add(cell));
        ships.push({ id, size, cells, vertical });
        placed = true;
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (ok) return ships;
  }
  throw new Error('Could not place the fleet');
};

/** What the shooter knows about a board: 0 unknown, 1 miss, 2 hit, 3 part of a sunk boat. */
export const blankShots = () => Array(SIZE * SIZE).fill(0);

/**
 * Fires at square `i` of a board with this `fleet`. Returns { shots, outcome, ship, done } where outcome is 'repeat', 'miss',
 * 'hit' or 'sunk'. A sunk boat also marks every square around it as a miss, as the players do on paper.
 */
export const shoot = (fleet, shots, i) => {
  if (shots[i] !== 0) return { shots, outcome: 'repeat', ship: null, done: false };
  const next = [...shots];
  const ship = fleet.find((s) => s.cells.includes(i));
  if (!ship) {
    next[i] = 1;
    return { shots: next, outcome: 'miss', ship: null, done: false };
  }
  next[i] = 2;
  if (!ship.cells.every((cell) => next[cell] >= 2)) return { shots: next, outcome: 'hit', ship, done: false };
  for (const cell of ship.cells) {
    next[cell] = 3;
    for (const n of around(cell)) if (next[n] === 0) next[n] = 1;
  }
  const done = fleet.every((s) => s.cells.every((cell) => next[cell] === 3));
  return { shots: next, outcome: 'sunk', ship, done };
};

/** The sizes of the boats still afloat, from what the shooter has seen. */
export const afloat = (fleet, shots) => fleet.filter((s) => !s.cells.every((cell) => shots[cell] === 3)).map((s) => s.size);

const group = (shots, start, seen) => {
  const cells = [];
  const queue = [start];
  seen.add(start);
  while (queue.length) {
    const cell = queue.pop();
    cells.push(cell);
    for (const n of beside(cell)) if (shots[n] === 2 && !seen.has(n)) {
      seen.add(n);
      queue.push(n);
    }
  }
  return cells;
};

/** The computer's shot: finish a boat it has hurt, otherwise the square where most of the remaining boats could lie. */
export const aiPick = (shots, sizes, random = Math.random) => {
  const seen = new Set();
  for (let i = 0; i < shots.length; i += 1) {
    if (shots[i] !== 2 || seen.has(i)) continue;
    const cells = group(shots, i, seen);
    let options;
    if (cells.length >= 2) {
      const row = Math.floor(cells[0] / SIZE);
      const horizontal = cells.every((cell) => Math.floor(cell / SIZE) === row);
      const step = horizontal ? 1 : SIZE;
      const lo = Math.min(...cells);
      const hi = Math.max(...cells);
      options = [lo - step, hi + step].filter((n) => n >= 0 && n < shots.length && shots[n] === 0 && (!horizontal || Math.floor(n / SIZE) === row));
    } else options = beside(cells[0]).filter((n) => shots[n] === 0);
    if (options.length) return options[Math.floor(random() * options.length)];
  }
  const weight = Array(shots.length).fill(0);
  for (const size of sizes) {
    for (let r = 0; r < SIZE; r += 1) {
      for (let c = 0; c < SIZE; c += 1) {
        for (const vertical of [false, true]) {
          if (vertical ? r + size > SIZE : c + size > SIZE) continue;
          const cells = Array.from({ length: size }, (_, k) => (vertical ? at(r + k, c) : at(r, c + k)));
          if (cells.every((cell) => shots[cell] === 0)) cells.forEach((cell) => (weight[cell] += 1));
        }
      }
    }
  }
  const top = Math.max(...weight);
  if (top > 0) return shuffle(weight.flatMap((w, i) => (w === top ? [i] : [])), random)[0];
  const free = shots.flatMap((s, i) => (s === 0 ? [i] : []));
  return free[Math.floor(random() * free.length)];
};

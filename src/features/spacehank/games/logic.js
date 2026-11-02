// The rules of the games in "Ra chơi", as plain functions so they can be tested without a screen.

export const shuffle = (list, random = Math.random) => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// ---- Sudoku ---------------------------------------------------------------------------------------------------------

const rowOf = (i) => Math.floor(i / 9);
const colOf = (i) => i % 9;
const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

/** The digits that can still go in cell `i` of `grid` (81 numbers, 0 for empty). */
export const candidates = (grid, i) => {
  const used = new Set();
  for (let j = 0; j < 81; j += 1) if (j !== i && grid[j] && (rowOf(j) === rowOf(i) || colOf(j) === colOf(i) || boxOf(j) === boxOf(i))) used.add(grid[j]);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d));
};

/** Counts solutions of a grid, stopping at `limit` (2 is enough to know whether it is unique). */
export const countSolutions = (grid, limit = 2) => {
  const work = [...grid];
  let found = 0;
  const go = () => {
    let best = -1;
    let bestOptions = null;
    for (let i = 0; i < 81; i += 1) {
      if (work[i]) continue;
      const options = candidates(work, i);
      if (options.length === 0) return;
      if (!bestOptions || options.length < bestOptions.length) {
        best = i;
        bestOptions = options;
        if (options.length === 1) break;
      }
    }
    if (best === -1) {
      found += 1;
      return;
    }
    for (const d of bestOptions) {
      work[best] = d;
      go();
      if (found >= limit) return;
    }
    work[best] = 0;
  };
  go();
  return found;
};

const fillGrid = (random) => {
  const grid = Array(81).fill(0);
  const go = () => {
    const at = grid.indexOf(0);
    if (at === -1) return true;
    for (const d of shuffle(candidates(grid, at), random)) {
      grid[at] = d;
      if (go()) return true;
    }
    grid[at] = 0;
    return false;
  };
  go();
  return grid;
};

/** A puzzle with exactly one solution: { puzzle, solution }. `blanks` is how many cells to empty (about 36 easy, 46 medium, 52 hard). */
export const makeSudoku = (blanks = 40, random = Math.random) => {
  const solution = fillGrid(random);
  const puzzle = [...solution];
  let left = blanks;
  for (const i of shuffle([...Array(81).keys()], random)) {
    if (left === 0) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle) === 1) left -= 1;
    else puzzle[i] = keep;
  }
  return { puzzle, solution };
};

/** The cells whose digit clashes with another in the same row, column or box. */
export const clashes = (grid) => {
  const bad = new Set();
  for (let i = 0; i < 81; i += 1) {
    if (!grid[i]) continue;
    for (let j = i + 1; j < 81; j += 1) {
      if (grid[j] === grid[i] && (rowOf(i) === rowOf(j) || colOf(i) === colOf(j) || boxOf(i) === boxOf(j))) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return bad;
};

// ---- Cờ caro (five in a row) ----------------------------------------------------------------------------------------

export const CARO = 12;
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

/** The winning line of five for `who` that goes through (r, c), or null. */
export const caroWin = (board, r, c, size = CARO) => {
  const who = board[r * size + c];
  if (!who) return null;
  for (const [dr, dc] of DIRS) {
    const line = [[r, c]];
    for (const sign of [1, -1]) {
      let rr = r + dr * sign;
      let cc = c + dc * sign;
      while (rr >= 0 && rr < size && cc >= 0 && cc < size && board[rr * size + cc] === who) {
        line.push([rr, cc]);
        rr += dr * sign;
        cc += dc * sign;
      }
    }
    if (line.length >= 5) return line;
  }
  return null;
};

// how much a run of `n` stones is worth, with `open` free ends
const worth = (n, open) => {
  if (n >= 5) return 100000;
  if (n === 4) return open === 2 ? 10000 : open === 1 ? 1000 : 0;
  if (n === 3) return open === 2 ? 1000 : open === 1 ? 100 : 0;
  if (n === 2) return open === 2 ? 100 : open === 1 ? 10 : 0;
  return open ? 2 : 0;
};

const lineScore = (board, r, c, who, size) => {
  let total = 0;
  for (const [dr, dc] of DIRS) {
    let n = 1;
    let open = 0;
    for (const sign of [1, -1]) {
      let rr = r + dr * sign;
      let cc = c + dc * sign;
      while (rr >= 0 && rr < size && cc >= 0 && cc < size && board[rr * size + cc] === who) {
        n += 1;
        rr += dr * sign;
        cc += dc * sign;
      }
      if (rr >= 0 && rr < size && cc >= 0 && cc < size && board[rr * size + cc] === 0) open += 1;
    }
    total += worth(n, open);
  }
  return total;
};

/** The computer's move: it values making its own lines slightly above blocking yours, and stays near the stones. */
export const caroMove = (board, ai = 2, size = CARO, random = Math.random) => {
  const human = ai === 1 ? 2 : 1;
  const stones = board.filter(Boolean).length;
  if (stones === 0) return Math.floor(size / 2) * size + Math.floor(size / 2);
  let best = -1;
  let bestScore = -1;
  for (let i = 0; i < size * size; i += 1) {
    if (board[i]) continue;
    const r = Math.floor(i / size);
    const c = i % size;
    let near = false;
    for (let dr = -2; dr <= 2 && !near; dr += 1) for (let dc = -2; dc <= 2; dc += 1) if (board[(r + dr) * size + c + dc] && r + dr >= 0 && r + dr < size && c + dc >= 0 && c + dc < size) near = true;
    if (!near) continue;
    const score = lineScore(board, r, c, ai, size) * 1.1 + lineScore(board, r, c, human, size) + random() * 3;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  }
  return best;
};

// ---- Bầu cua tôm cá -------------------------------------------------------------------------------------------------

export const BAU_CUA = ['bau', 'cua', 'tom', 'ca', 'ga', 'nai'];

export const rollDice = (random = Math.random) => [0, 1, 2].map(() => BAU_CUA[Math.floor(random() * BAU_CUA.length)]);

/** What the bets win or lose for these dice: a bet on a symbol pays its stake once for each die that shows it, and is lost if none does. */
export const settle = (bets, dice) =>
  Object.entries(bets).reduce((net, [symbol, stake]) => {
    const hits = dice.filter((d) => d === symbol).length;
    return net + (hits > 0 ? stake * hits : -stake);
  }, 0);

// ---- Rắn săn mồi ------------------------------------------------------------------------------------------------------

const MOVE = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const newSnake = (size = 14) => ({ size, body: [[Math.floor(size / 2), 3], [Math.floor(size / 2), 2], [Math.floor(size / 2), 1]], dir: 'right', food: [Math.floor(size / 2), size - 4], score: 0, over: false });

/** One step of the snake. `want` is the direction asked for (it cannot turn straight back). */
export const stepSnake = (state, want, random = Math.random) => {
  if (state.over) return state;
  const dir = want && want !== OPPOSITE[state.dir] ? want : state.dir;
  const [dr, dc] = MOVE[dir];
  const head = [state.body[0][0] + dr, state.body[0][1] + dc];
  const hitWall = head[0] < 0 || head[1] < 0 || head[0] >= state.size || head[1] >= state.size;
  const eats = head[0] === state.food[0] && head[1] === state.food[1];
  const body = eats ? state.body : state.body.slice(0, -1);
  if (hitWall || body.some(([r, c]) => r === head[0] && c === head[1])) return { ...state, dir, over: true };
  const grown = [head, ...body];
  let food = state.food;
  if (eats) {
    const free = [];
    for (let r = 0; r < state.size; r += 1) for (let c = 0; c < state.size; c += 1) if (!grown.some(([a, b]) => a === r && b === c)) free.push([r, c]);
    food = free.length ? free[Math.floor(random() * free.length)] : state.food;
  }
  return { ...state, body: grown, dir, food, score: state.score + (eats ? 1 : 0) };
};

// ---- Kéo búa bao --------------------------------------------------------------------------------------------------------

export const HANDS = ['keo', 'bua', 'bao'];
const BEATS = { keo: 'bao', bua: 'keo', bao: 'bua' };
/** 1 when `a` wins, -1 when `b` wins, 0 for a draw. */
export const duel = (a, b) => (a === b ? 0 : BEATS[a] === b ? 1 : -1);

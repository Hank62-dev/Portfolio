// The rules, and the computer's play, for the two board games against the phone: four in a row and reversi.
// A board is a flat array, row after row. 0 is empty, 1 is the player, 2 is the computer.

// ---- Four in a row --------------------------------------------------------------------------------------------------

export const C4_ROWS = 6;
export const C4_COLS = 7;

export const emptyC4 = () => Array(C4_ROWS * C4_COLS).fill(0);

/** The row a disc dropped in `col` would land on (6 is the floor), or -1 when the column is full. */
export const landingRow = (board, col) => {
  for (let r = C4_ROWS - 1; r >= 0; r -= 1) if (!board[r * C4_COLS + col]) return r;
  return -1;
};

/** The board after `who` drops a disc in `col`, or null when the column is full. */
export const dropDisc = (board, col, who) => {
  const r = landingRow(board, col);
  if (r < 0) return null;
  const next = [...board];
  next[r * C4_COLS + col] = who;
  return next;
};

// every run of four cells that can win: across, down and both diagonals
const WINDOWS = (() => {
  const out = [];
  for (let r = 0; r < C4_ROWS; r += 1) {
    for (let c = 0; c < C4_COLS; c += 1) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const er = r + dr * 3;
        const ec = c + dc * 3;
        if (er < 0 || er >= C4_ROWS || ec < 0 || ec >= C4_COLS) continue;
        out.push([0, 1, 2, 3].map((k) => (r + dr * k) * C4_COLS + c + dc * k));
      }
    }
  }
  return out;
})();

/** Who has four in a row, and which four cells: `{ who, line }`, or null. */
export const c4Winner = (board) => {
  for (const line of WINDOWS) {
    const who = board[line[0]];
    if (who && line.every((i) => board[i] === who)) return { who, line };
  }
  return null;
};

export const c4Full = (board) => !board.includes(0);

const ORDER = [3, 2, 4, 1, 5, 0, 6]; // the middle first: better moves are looked at sooner, so more of the search is skipped

const rate = (board, me) => {
  const other = 3 - me;
  let score = 0;
  for (const line of WINDOWS) {
    let mine = 0;
    let theirs = 0;
    for (const i of line) {
      if (board[i] === me) mine += 1;
      else if (board[i] === other) theirs += 1;
    }
    if (mine && theirs) continue;
    if (mine === 3) score += 12;
    else if (mine === 2) score += 3;
    else if (theirs === 3) score -= 14;
    else if (theirs === 2) score -= 3;
  }
  for (let r = 0; r < C4_ROWS; r += 1) {
    const centre = board[r * C4_COLS + 3];
    if (centre === me) score += 2;
    else if (centre === other) score -= 2;
  }
  return score;
};

const search = (board, depth, alpha, beta, who, me) => {
  const win = c4Winner(board);
  if (win) return win.who === me ? 100000 + depth : -100000 - depth; // sooner wins and later losses are better
  if (c4Full(board)) return 0;
  if (depth === 0) return rate(board, me);
  const maximising = who === me;
  let best = maximising ? -Infinity : Infinity;
  for (const col of ORDER) {
    const next = dropDisc(board, col, who);
    if (!next) continue;
    const value = search(next, depth - 1, alpha, beta, 3 - who, me);
    if (maximising) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return best;
};

/** The column the computer plays: it looks `depth` discs ahead, and picks at random among equally good columns. */
export const c4Move = (board, who = 2, depth = 5, random = Math.random) => {
  let best = -Infinity;
  let columns = [];
  for (const col of ORDER) {
    const next = dropDisc(board, col, who);
    if (!next) continue;
    const value = search(next, depth - 1, -Infinity, Infinity, 3 - who, who);
    if (value > best) {
      best = value;
      columns = [col];
    } else if (value === best) {
      columns.push(col);
    }
  }
  return columns[Math.floor(random() * columns.length)];
};

// ---- Reversi --------------------------------------------------------------------------------------------------------

export const R_SIZE = 8;

export const newReversi = () => {
  const board = Array(R_SIZE * R_SIZE).fill(0);
  board[27] = 2;
  board[28] = 1;
  board[35] = 1;
  board[36] = 2;
  return board;
};

const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

/** The discs that would turn over if `who` played at `i` (empty when the move is not allowed). */
export const flipsFor = (board, i, who) => {
  if (board[i]) return [];
  const r0 = Math.floor(i / R_SIZE);
  const c0 = i % R_SIZE;
  const flips = [];
  for (const [dr, dc] of DIRS) {
    const run = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < R_SIZE && c >= 0 && c < R_SIZE && board[r * R_SIZE + c] === 3 - who) {
      run.push(r * R_SIZE + c);
      r += dr;
      c += dc;
    }
    if (run.length && r >= 0 && r < R_SIZE && c >= 0 && c < R_SIZE && board[r * R_SIZE + c] === who) flips.push(...run);
  }
  return flips;
};

/** Every move `who` may play, with what it turns over: `[{ i, flips }]`. */
export const legalMoves = (board, who) => {
  const out = [];
  for (let i = 0; i < board.length; i += 1) {
    const flips = flipsFor(board, i, who);
    if (flips.length) out.push({ i, flips });
  }
  return out;
};

export const playReversi = (board, i, who) => {
  const flips = flipsFor(board, i, who);
  if (!flips.length) return null;
  const next = [...board];
  next[i] = who;
  for (const f of flips) next[f] = who;
  return next;
};

export const countDiscs = (board) => ({ 1: board.filter((v) => v === 1).length, 2: board.filter((v) => v === 2).length });

/** Who moves after `who` has played: the other side, or `who` again if the other has to pass, or 0 when nobody can move. */
export const whoNext = (board, who) => {
  if (legalMoves(board, 3 - who).length) return 3 - who;
  if (legalMoves(board, who).length) return who;
  return 0;
};

// corners are gold, the squares beside them are a trap, edges are good
const WEIGHT = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [10, -2, -1, -1, -1, -1, -2, 10],
  [5, -2, -1, -1, -1, -1, -2, 5],
  [5, -2, -1, -1, -1, -1, -2, 5],
  [10, -2, -1, -1, -1, -1, -2, 10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10, 5, 5, 10, -20, 100],
].flat();

const worth = (board, me) => {
  let total = 0;
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === me) total += WEIGHT[i];
    else if (board[i]) total -= WEIGHT[i];
  }
  return total + 3 * (legalMoves(board, me).length - legalMoves(board, 3 - me).length);
};

/** The move the computer plays: it weighs each one by what the player could answer, and takes the best. */
export const reversiMove = (board, who = 2, random = Math.random) => {
  const moves = legalMoves(board, who);
  if (!moves.length) return -1;
  let best = -Infinity;
  let picks = [];
  for (const { i } of moves) {
    const after = playReversi(board, i, who);
    const replies = legalMoves(after, 3 - who);
    let value;
    if (!replies.length) value = worth(after, who) + 30;
    else value = Math.min(...replies.map((m) => worth(playReversi(after, m.i, 3 - who), who)));
    if (value > best) {
      best = value;
      picks = [i];
    } else if (value === best) {
      picks.push(i);
    }
  }
  return picks[Math.floor(random() * picks.length)];
};

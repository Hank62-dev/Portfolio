// The rules of the second shelf of games, kept apart from their drawing so they can be tested: word guess, copy the colours,
// paper plane, brick breaker, quick draw, type fast, picture logic, mental math, dots and boxes, tower of Hanoi.
// `rand` is always a function giving 0..1 (Math.random by default), so a test can pass its own.

const pick = (list, rand = Math.random) => list[Math.floor(rand() * list.length)];

// ---- word guess ---------------------------------------------------------------------------------------------------------

export const MISSES_ALLOWED = 7;

/** The word as shown: its letters where guessed, `_` where not; spaces and dashes are shown as they are. */
export const shownWord = (word, guesses) => [...word].map((ch) => (/[A-Z]/.test(ch) && !guesses.has(ch) ? '_' : ch)).join('');

/** How many guessed letters are not in the word. */
export const missCount = (word, guesses) => [...guesses].filter((ch) => !word.includes(ch)).length;

/** 'won', 'lost' or 'playing'. */
export const wordState = (word, guesses) => (missCount(word, guesses) >= MISSES_ALLOWED ? 'lost' : shownWord(word, guesses).includes('_') ? 'playing' : 'won');

// ---- copy the colours ---------------------------------------------------------------------------------------------------

/** The sequence one colour longer (colours 0..3). */
export const extendSequence = (sequence, rand = Math.random) => [...sequence, Math.floor(rand() * 4)];

// ---- paper plane --------------------------------------------------------------------------------------------------------

export const PLANE = { gravity: 1500, flap: -430, speed: 150, gap: 150, every: 1.55, width: 54 };

/** Whether a plane (a circle at x, y of radius r) touches a pencil pair: the pencils fill `x0..x0+width` except the gap at `gapY`. */
export const planeHits = ({ x, y, r }, { x0, gapY }, { gap = PLANE.gap, width = PLANE.width } = {}) => {
  if (x + r < x0 || x - r > x0 + width) return false;
  return y - r < gapY - gap / 2 || y + r > gapY + gap / 2;
};

// ---- brick breaker -----------------------------------------------------------------------------------------------------

/** The bricks: `rows` × `cols` filling `width`, each { x, y, w, h, row, alive }. */
export const layBricks = (rows, cols, width, { top = 40, h = 16, gap = 4, side = 8 } = {}) => {
  const w = (width - side * 2 - gap * (cols - 1)) / cols;
  return Array.from({ length: rows * cols }, (_, i) => ({
    x: side + (i % cols) * (w + gap),
    y: top + Math.floor(i / cols) * (h + gap),
    w,
    h,
    row: Math.floor(i / cols),
    alive: true,
  }));
};

/**
 * A ball (x, y, r, moving vx, vy) against a box: null when they do not touch, otherwise the side it came in from, 'x'
 * (bounce sideways) or 'y' (bounce up or down), whichever overlap is the shallower.
 */
export const ballHits = ({ x, y, r }, box) => {
  const nx = Math.max(box.x, Math.min(x, box.x + box.w));
  const ny = Math.max(box.y, Math.min(y, box.y + box.h));
  if ((x - nx) ** 2 + (y - ny) ** 2 > r * r) return null;
  const overlapX = Math.min(x + r - box.x, box.x + box.w - (x - r));
  const overlapY = Math.min(y + r - box.y, box.y + box.h - (y - r));
  return overlapX < overlapY ? 'x' : 'y';
};

/** Where the ball leaves the paddle: further from its middle sends it out at a steeper angle (up to 60°), same speed. */
export const paddleBounce = (ballX, paddle, speed) => {
  const t = Math.max(-1, Math.min(1, (ballX - (paddle.x + paddle.w / 2)) / (paddle.w / 2)));
  const angle = t * (Math.PI / 3);
  return { vx: speed * Math.sin(angle), vy: -speed * Math.cos(angle) };
};

// ---- quick draw ---------------------------------------------------------------------------------------------------------

/** The average of the reaction times that counted (a tap too early is null and leaves no time), rounded; null if none. */
export const averageTime = (times) => {
  const fair = times.filter((t) => typeof t === 'number');
  return fair.length ? Math.round(fair.reduce((n, t) => n + t, 0) / fair.length) : null;
};

// ---- type fast ----------------------------------------------------------------------------------------------------------

export const WORDS = 'time people way year day thing man world life hand part child eye woman place work week case point number group problem fact water room mother area money story month lot right study book job word business issue side kind head house friend father power hour game line end member law car city name team minute idea kid body back parent face others level office door health person art war history party result change morning reason research girl guy moment air teacher force education foot boy age policy music market sense nation plan college interest death experience effect class control care field development role effort rate heart drug show leader light voice wife police mind price report decision son view relationship town road arm difference value building action model season society tax director position player record paper space ground form event official matter center couple site project activity star table need court oil situation cost industry figure street image phone data picture practice piece land product doctor wall patient worker news test movie north love support technology step baby computer type attention film tree source organization hair window evidence population site garden river'.split(' ');

/** A shuffled run of words to type. */
export const wordRun = (count, rand = Math.random) => Array.from({ length: count }, () => pick(WORDS, rand));

/** Words a minute: correct characters (spaces included) over five, per minute. */
export const wordsPerMinute = (correctChars, seconds) => (seconds > 0 ? Math.round(correctChars / 5 / (seconds / 60)) : 0);

// ---- picture logic (nonogram) -------------------------------------------------------------------------------------------

/** The clue of a line: the lengths of its runs of filled cells, or [0] for an empty line. */
export const lineClue = (cells) => {
  const runs = [];
  let n = 0;
  for (const c of cells) {
    if (c) n += 1;
    else if (n) {
      runs.push(n);
      n = 0;
    }
  }
  if (n) runs.push(n);
  return runs.length ? runs : [0];
};

const rows = (grid, size) => Array.from({ length: size }, (_, r) => grid.slice(r * size, r * size + size));
const cols = (grid, size) => Array.from({ length: size }, (_, c) => Array.from({ length: size }, (_, r) => grid[r * size + c]));

/** The clues of a picture: { rows: [[…]], cols: [[…]] }. */
export const pictureClues = (grid, size) => ({ rows: rows(grid, size).map(lineClue), cols: cols(grid, size).map(lineClue) });

/** A random picture of `size` × `size` (about 3 cells in 5 filled), never with an empty row or column. */
export const makePicture = (size, rand = Math.random) => {
  for (;;) {
    const grid = Array.from({ length: size * size }, () => (rand() < 0.6 ? 1 : 0));
    const clues = pictureClues(grid, size);
    if (![...clues.rows, ...clues.cols].some((c) => c[0] === 0)) return grid;
  }
};

/** Solved when every row and column of the filled cells matches its clue (any picture that fits the clues counts). */
export const pictureSolved = (filled, clues, size) => {
  const mine = pictureClues(filled.map((c) => (c === 1 ? 1 : 0)), size);
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  return mine.rows.every((c, i) => same(c, clues.rows[i])) && mine.cols.every((c, i) => same(c, clues.cols[i]));
};

// ---- mental math --------------------------------------------------------------------------------------------------------

/** A sum to work out in your head, harder as `level` (the questions answered so far) rises: { text, answer }. */
export const mathQuestion = (level, rand = Math.random) => {
  const top = 10 + level * 4;
  const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
  const kind = level < 3 ? pick(['+', '-'], rand) : pick(['+', '-', '×', '×', '÷'], rand);
  if (kind === '+') {
    const a = int(2, top);
    const b = int(2, top);
    return { text: `${a} + ${b}`, answer: a + b };
  }
  if (kind === '-') {
    const a = int(4, top);
    const b = int(1, a);
    return { text: `${a} − ${b}`, answer: a - b };
  }
  const a = int(2, Math.min(12, 3 + Math.floor(level / 2)));
  const b = int(2, 12);
  return kind === '×' ? { text: `${a} × ${b}`, answer: a * b } : { text: `${a * b} ÷ ${a}`, answer: b };
};

// ---- dots and boxes -----------------------------------------------------------------------------------------------------

// A board of n × n boxes has (n+1) × n lines across and n × (n+1) lines down. A line is 'h:r:c' (across, above box r, c;
// r up to n) or 'v:r:c' (down, left of box r, c; c up to n).

/** Every line of an n × n board. */
export const allLines = (n) => [
  ...Array.from({ length: (n + 1) * n }, (_, i) => `h:${Math.floor(i / n)}:${i % n}`),
  ...Array.from({ length: n * (n + 1) }, (_, i) => `v:${Math.floor(i / (n + 1))}:${i % (n + 1)}`),
];

/** The four sides of box r, c. */
export const boxSides = (r, c) => [`h:${r}:${c}`, `h:${r + 1}:${c}`, `v:${r}:${c}`, `v:${r}:${c + 1}`];

/** The boxes a line borders: [[r, c]…], one or two. */
export const boxesOf = (line, n) => {
  const [kind, rs, cs] = line.split(':');
  const r = Number(rs);
  const c = Number(cs);
  const out = kind === 'h' ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]];
  return out.filter(([br, bc]) => br >= 0 && bc >= 0 && br < n && bc < n);
};

/**
 * A player draws a line: { drawn, owner, closed } after it, `closed` how many boxes the line finished (they become the
 * player's). Closing a box earns another turn; the caller decides whose turn it is.
 */
export const drawLine = ({ drawn, owner }, line, player, n) => {
  const next = new Set(drawn).add(line);
  const own = { ...owner };
  let closed = 0;
  for (const [r, c] of boxesOf(line, n)) {
    if (boxSides(r, c).every((s) => next.has(s))) {
      own[`${r}:${c}`] = player;
      closed += 1;
    }
  }
  return { drawn: next, owner: own, closed };
};

/**
 * The computer's line: one that finishes a box if there is one; else one that gives no box a third side; else (all lines
 * left give something away) the one that hands over the fewest boxes at once.
 */
export const computerLine = ({ drawn }, n, rand = Math.random) => {
  const free = allLines(n).filter((l) => !drawn.has(l));
  const sidesAfter = (line) => boxesOf(line, n).map(([r, c]) => boxSides(r, c).filter((s) => drawn.has(s) || s === line).length);
  const finishing = free.filter((l) => sidesAfter(l).includes(4));
  if (finishing.length) return pick(finishing, rand);
  const safe = free.filter((l) => !sidesAfter(l).includes(3));
  if (safe.length) return pick(safe, rand);
  const cost = (l) => sidesAfter(l).filter((s) => s === 3).length;
  const least = Math.min(...free.map(cost));
  return pick(free.filter((l) => cost(l) === least), rand);
};

// ---- tower of Hanoi -----------------------------------------------------------------------------------------------------

/** Three pegs, all `discs` on the first, biggest at the bottom: [[n…1], [], []]. */
export const startTower = (discs) => [Array.from({ length: discs }, (_, i) => discs - i), [], []];

/** Whether the top disc of peg `from` may go onto peg `to` (never onto a smaller one). */
export const canMove = (pegs, from, to) => from !== to && pegs[from].length > 0 && (pegs[to].length === 0 || pegs[to].at(-1) > pegs[from].at(-1));

/** The pegs after a move (unchanged if the move is not allowed). */
export const moveDisc = (pegs, from, to) => {
  if (!canMove(pegs, from, to)) return pegs;
  const next = pegs.map((p) => [...p]);
  next[to].push(next[from].pop());
  return next;
};

/** Done when every disc stands on the last peg. */
export const towerDone = (pegs, discs) => pegs[2].length === discs;

/** The fewest moves it can be done in. */
export const fewestMoves = (discs) => 2 ** discs - 1;

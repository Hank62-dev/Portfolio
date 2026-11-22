import { describe, expect, it } from 'vitest';
import {
  averageTime,
  ballHits,
  boxesOf,
  canMove,
  computerLine,
  drawLine,
  extendSequence,
  fewestMoves,
  layBricks,
  lineClue,
  makePicture,
  mathQuestion,
  missCount,
  moveDisc,
  paddleBounce,
  pictureClues,
  pictureSolved,
  planeHits,
  shownWord,
  startTower,
  towerDone,
  wordState,
  wordsPerMinute,
} from './more';

const seq = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('word guess', () => {
  it('shows the guessed letters and keeps spaces', () => {
    expect(shownWord('AO DAI', new Set(['A']))).toBe('A_ _A_');
    expect(missCount('AO DAI', new Set(['A', 'Z', 'Q']))).toBe(2);
  });

  it('is won when every letter is out and lost after seven misses', () => {
    expect(wordState('PHO', new Set(['P', 'H', 'O']))).toBe('won');
    expect(wordState('PHO', new Set([...'ABCDEFG']))).toBe('lost');
    expect(wordState('PHO', new Set(['P']))).toBe('playing');
  });
});

describe('copy the colours', () => {
  it('adds one colour of the four', () => {
    expect(extendSequence([1, 2], () => 0.99)).toEqual([1, 2, 3]);
  });
});

describe('paper plane', () => {
  const pencils = { x0: 100, gapY: 200 };
  it('flies through the gap and hits the pencils above or below it', () => {
    expect(planeHits({ x: 120, y: 200, r: 10 }, pencils)).toBe(false);
    expect(planeHits({ x: 120, y: 100, r: 10 }, pencils)).toBe(true);
    expect(planeHits({ x: 20, y: 100, r: 10 }, pencils)).toBe(false);
  });
});

describe('brick breaker', () => {
  it('lays the bricks in rows across the width', () => {
    const bricks = layBricks(3, 5, 300);
    expect(bricks).toHaveLength(15);
    expect(bricks.at(-1).x + bricks.at(-1).w).toBeCloseTo(292);
  });

  it('bounces up off a brick hit from below and sideways off one hit from the side', () => {
    const brick = { x: 100, y: 100, w: 40, h: 10 };
    expect(ballHits({ x: 120, y: 113, r: 4 }, brick)).toBe('y');
    expect(ballHits({ x: 97, y: 105, r: 4 }, brick)).toBe('x');
    expect(ballHits({ x: 50, y: 50, r: 4 }, brick)).toBeNull();
  });

  it('sends the ball off the paddle\'s edge at a steeper angle, upward, at the same speed', () => {
    const paddle = { x: 0, w: 100 };
    const mid = paddleBounce(50, paddle, 300);
    const edge = paddleBounce(100, paddle, 300);
    expect(mid.vx).toBeCloseTo(0);
    expect(mid.vy).toBeCloseTo(-300);
    expect(edge.vx).toBeGreaterThan(200);
    expect(Math.hypot(edge.vx, edge.vy)).toBeCloseTo(300);
  });
});

describe('quick draw and type fast', () => {
  it('averages the fair times only', () => {
    expect(averageTime([200, null, 300])).toBe(250);
    expect(averageTime([null])).toBeNull();
  });

  it('counts five characters as a word', () => {
    expect(wordsPerMinute(150, 30)).toBe(60);
  });
});

describe('picture logic', () => {
  it('reads the runs of a line', () => {
    expect(lineClue([1, 1, 0, 1, 0])).toEqual([2, 1]);
    expect(lineClue([0, 0, 0])).toEqual([0]);
  });

  it('makes a picture with no empty line, solved by itself or anything with the same clues', () => {
    const grid = makePicture(5, seq(0.1, 0.5, 0.9, 0.3, 0.7, 0.2));
    const clues = pictureClues(grid, 5);
    expect([...clues.rows, ...clues.cols].every((c) => c[0] > 0)).toBe(true);
    expect(pictureSolved(grid, clues, 5)).toBe(true);
    const marked = grid.map((c) => (c ? 1 : 2)); // crosses count as empty
    expect(pictureSolved(marked, clues, 5)).toBe(true);
    expect(pictureSolved(grid.map(() => 0), clues, 5)).toBe(false);
  });
});

describe('mental math', () => {
  it('gives sums whose answer is right', () => {
    for (let level = 0; level < 20; level += 1) {
      const q = mathQuestion(level);
      const expr = q.text.replace('×', '*').replace('÷', '/').replace('−', '-');
      expect(Function(`return ${expr}`)()).toBe(q.answer);
      expect(Number.isInteger(q.answer) && q.answer >= 0).toBe(true);
    }
  });
});

describe('dots and boxes', () => {
  it('knows the boxes on each side of a line', () => {
    expect(boxesOf('h:0:0', 3)).toEqual([[0, 0]]);
    expect(boxesOf('v:1:1', 3)).toEqual([
      [1, 0],
      [1, 1],
    ]);
  });

  it('gives the box to whoever draws its fourth side', () => {
    let s = { drawn: new Set(['h:0:0', 'h:1:0', 'v:0:0']), owner: {} };
    s = drawLine(s, 'v:0:1', 'me', 2);
    expect(s.closed).toBe(1);
    expect(s.owner['0:0']).toBe('me');
  });

  it('takes a box when it can and never gives one away when it need not', () => {
    const open = { drawn: new Set(['h:0:0', 'h:1:0', 'v:0:0']), owner: {} };
    expect(computerLine(open, 2)).toBe('v:0:1');
    const fresh = { drawn: new Set(['h:0:0', 'h:1:0']), owner: {} };
    for (let i = 0; i < 20; i += 1) {
      const line = computerLine(fresh, 2);
      expect(['v:0:0', 'v:0:1']).not.toContain(line);
    }
  });
});

describe('tower of Hanoi', () => {
  it('never puts a disc on a smaller one and is done when all stand on the last peg', () => {
    let pegs = startTower(2);
    expect(canMove(pegs, 1, 0)).toBe(false);
    pegs = moveDisc(pegs, 0, 1);
    expect(moveDisc(pegs, 0, 1)).toBe(pegs);
    pegs = moveDisc(moveDisc(pegs, 0, 2), 1, 2);
    expect(towerDone(pegs, 2)).toBe(true);
    expect(fewestMoves(3)).toBe(7);
  });
});

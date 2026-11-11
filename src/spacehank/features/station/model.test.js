import { describe, expect, it } from 'vitest';
import { CORE, RING_RADIUS, along, anchorOf, ease, flightMid, handoffsIn, ringSeats, statusTone, taskTitle } from './model';

describe('seats', () => {
  it('puts the crew round the ring, the first at the back, all at the same distance from the core', () => {
    const seats = ringSeats(['a', 'b', 'c', 'd'], 4);
    expect(seats.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(seats[0].z).toBeCloseTo(-4);
    expect(seats[0].x).toBeCloseTo(0);
    expect(seats[2].z).toBeCloseTo(4);
    for (const s of ringSeats(Array.from({ length: 11 }, (_, i) => `x${i}`))) expect(Math.hypot(s.x, s.z)).toBeCloseTo(RING_RADIUS, 3);
  });

  it('starts a flight at the core for the owner and at the head of a crew member', () => {
    const seats = ringSeats(['a', 'b'], 4);
    expect(anchorOf(CORE, seats)).toEqual([0, 1.9, 0]);
    expect(anchorOf('a', seats)[2]).toBeCloseTo(-4);
  });
});

describe('flights', () => {
  it('arch above both ends and run from one to the other', () => {
    const from = [0, 1.9, 0];
    const to = [4, 1.85, 0];
    const mid = flightMid(from, to);
    expect(mid[1]).toBeGreaterThan(2.5);
    expect(along(from, mid, to, 0)).toEqual(from);
    expect(along(from, mid, to, 1).map((n) => +n.toFixed(6))).toEqual(to);
    expect(along(from, mid, to, 0.5)[1]).toBeGreaterThan(from[1]);
    expect([ease(0), ease(0.5), ease(1)]).toEqual([0, 0.5, 1]);
  });
});

describe('hand-offs', () => {
  const known = ['codex', 'mira', 'nova'];
  it('reads who gave whom which task, the owner when the event does not say', () => {
    const events = [
      { id: '3', agent: 'nova', action: 'delegated', to: 'codex', text: 'Write the tests', at: '3' },
      { id: '2', agent: 'codex', action: 'output', text: 'compiling…' },
      { id: '1', agent: 'codex', action: 'started', text: 'Minh Codex accepted “Fix the login”', at: '1' },
      { id: '0', agent: 'ghost', action: 'started', text: 'x' },
    ];
    expect(handoffsIn(events, known)).toEqual([
      { id: '3', from: 'nova', to: 'codex', text: 'Write the tests', at: '3' },
      { id: '1', from: CORE, to: 'codex', text: 'Fix the login', at: '1' },
    ]);
  });

  it('takes a `from` the server gives, and drops a hand-off to oneself', () => {
    expect(handoffsIn([{ id: 'a', agent: 'codex', from: 'mira', action: 'started', text: 'x' }], known)[0]).toMatchObject({ from: 'mira', to: 'codex' });
    expect(handoffsIn([{ agent: 'codex', from: 'codex', action: 'started' }], known)).toEqual([]);
    expect(handoffsIn(undefined, known)).toEqual([]);
  });

  it('pulls the task out of the quotes', () => {
    expect(taskTitle('An Claude accepted "Read the paper"')).toBe('Read the paper');
    expect(taskTitle('plain words')).toBe('plain words');
  });
});

describe('status', () => {
  it('reads each status as a tone', () => {
    expect(['working', 'completed', 'failed', 'idle', 'offline', 'whatever'].map(statusTone)).toEqual(['busy', 'done', 'failed', 'idle', 'offline', 'offline']);
  });
});

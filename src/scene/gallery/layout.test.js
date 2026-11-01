import { describe, expect, it } from 'vitest';
import { EYE, NAVE, NAVE_START, PLAZA_RADIUS, PLINTH_RADIUS, VIEW_DISTANCE, buildExhibition, clampPitch, constrain, shortestTurn, stepFrame, wrapIndex, wrapText } from './layout';
import { moveFromKeys, releaseAll, setKey, stepWalk, walk } from './walk';

const wings = ['team', 'team', 'team', 'team', 'personal', 'personal', 'studies', 'studies', 'studies'];

describe('exhibition layout', () => {
  const { slots, zones, length } = buildExhibition(wings);

  it('gives every project a frame, in the order it was listed', () => {
    expect(slots).toHaveLength(wings.length);
    slots.forEach((slot, i) => {
      expect(slot.index).toBe(i);
      expect(slot.wing).toBe(wings[i]);
    });
  });

  it('puts zones one after another down the nave, each with its count', () => {
    expect(zones.map((z) => [z.wing, z.count])).toEqual([['team', 4], ['personal', 2], ['studies', 3]]);
    expect(zones[0].z).toBeGreaterThan(zones[1].z);
    expect(zones[1].z).toBeGreaterThan(zones[2].z);
    expect(length).toBeGreaterThan(Math.abs(slots[slots.length - 1].position[2]));
  });

  it('alternates the walls inside a zone and hangs them facing the middle of the nave', () => {
    expect(slots.slice(0, 4).map((s) => s.side)).toEqual(['left', 'right', 'left', 'right']);
    const left = slots[0];
    const right = slots[1];
    expect(left.position[0]).toBeLessThan(0);
    expect(right.position[0]).toBeGreaterThan(0);
    expect(left.yaw).toBeCloseTo(Math.PI / 2); // faces +x
    expect(right.yaw).toBeCloseTo(-Math.PI / 2); // faces -x
  });

  it('starts below the plaza and spaces rows by the nave spacing, without frames overlapping', () => {
    expect(slots[0].position[2]).toBeLessThan(NAVE_START);
    expect(slots[0].position[2] - slots[2].position[2]).toBeCloseTo(NAVE.spacing);
    const sameWall = slots.filter((s) => s.side === 'left').map((s) => s.position[2]);
    sameWall.slice(1).forEach((z, i) => expect(sameWall[i] - z).toBeGreaterThanOrEqual(NAVE.spacing - 1e-9));
  });

  it('stands the visitor at eye height, facing the frame, VIEW_DISTANCE from the wall', () => {
    slots.forEach((slot) => {
      expect(slot.station.position[1]).toBe(EYE);
      expect(slot.station.yaw).toBeCloseTo(slot.yaw);
      expect(Math.abs(slot.position[0] - slot.station.position[0])).toBeCloseTo(VIEW_DISTANCE - 0.06);
      expect(slot.station.position[2]).toBe(slot.position[2]);
    });
  });
});

describe('walking limits', () => {
  const { length } = buildExhibition(wings);

  it('lets you walk anywhere inside the plaza and the nave', () => {
    expect(constrain(3, 3, length)).toEqual([3, 3]);
    expect(constrain(2, 2, length)).toEqual([2, 2]);
    expect(constrain(-3, -20, length)).toEqual([-3, -20]);
  });

  it('stops you at the nave walls and its end, sliding along them', () => {
    const [x, z] = constrain(-9, -20, length);
    expect(x).toBeCloseTo(-(NAVE.halfWidth - 0.45));
    expect(z).toBe(-20);
    const end = constrain(0, -(length + 5), length);
    expect(end[1]).toBeCloseTo(-(length - 0.45));
  });

  it('walks you round the plinth, not through it', () => {
    const [x, z] = constrain(0.2, 0.3, length);
    expect(Math.hypot(x, z)).toBeCloseTo(PLINTH_RADIUS);
    expect(constrain(0, 0, length)[1]).toBeCloseTo(PLINTH_RADIUS);
  });

  it('keeps you inside the plaza wall too', () => {
    const [x, z] = constrain(0, 20, length);
    expect(Math.hypot(x, z)).toBeLessThanOrEqual(PLAZA_RADIUS);
    const [ex, ez] = constrain(7, 2, length);
    expect(Math.hypot(ex, ez)).toBeLessThanOrEqual(PLAZA_RADIUS);
  });
});

describe('stepping and text helpers', () => {
  it('steps through frames in both directions, starting from the plaza', () => {
    expect(stepFrame(-1, 1, 5)).toBe(0);
    expect(stepFrame(-1, -1, 5)).toBe(4);
    expect(stepFrame(4, 1, 5)).toBe(0);
    expect(stepFrame(0, -1, 5)).toBe(4);
    expect(wrapIndex(-7, 5)).toBe(3);
  });

  it('turns the short way round and limits looking up and down', () => {
    expect(shortestTurn(0.1, 2 * Math.PI - 0.1)).toBeCloseTo(-0.2);
    expect(shortestTurn(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(clampPitch(3)).toBe(0.85);
    expect(clampPitch(-3)).toBe(-0.85);
  });

  it('wraps text on word boundaries and marks what was cut', () => {
    expect(wrapText('one two three four', 8, 4)).toEqual(['one two', 'three', 'four']);
    const cut = wrapText('alpha beta gamma delta epsilon zeta eta theta', 10, 2);
    expect(cut).toHaveLength(2);
    expect(cut[1].endsWith('…')).toBe(true);
    expect(wrapText('', 10)).toEqual([]);
  });
});

describe('keyboard walking', () => {
  it('reads W A S D and the arrow keys', () => {
    expect(moveFromKeys(new Set(['KeyW']))).toEqual({ forward: 1, strafe: 0, turn: 0, run: false });
    expect(moveFromKeys(new Set(['KeyS', 'KeyD']))).toEqual({ forward: -1, strafe: 1, turn: 0, run: false });
    expect(moveFromKeys(new Set(['ArrowUp', 'ArrowLeft', 'ShiftLeft']))).toEqual({ forward: 1, strafe: 0, turn: -1, run: true });
    expect(moveFromKeys(new Set(['KeyW', 'KeyS']))).toMatchObject({ forward: 0 });
  });

  it('keeps the live state in step with presses and releases, and lets go of everything', () => {
    setKey('KeyW', true);
    setKey('KeyA', true);
    expect(walk).toMatchObject({ forward: 1, strafe: -1 });
    setKey('KeyW', false);
    expect(walk.forward).toBe(0);
    releaseAll();
    expect(walk).toMatchObject({ forward: 0, strafe: 0, turn: 0, run: false });
  });

  it('walks along the view direction and no faster diagonally', () => {
    // yaw 0 faces -z; forward 1 for one second at 2 m/s moves 2 m that way
    const [x, z] = stepWalk([0, 0], 0, { forward: 1, strafe: 0 }, 2, 1);
    expect(x).toBeCloseTo(0);
    expect(z).toBeCloseTo(-2);
    // facing +x (yaw -90deg): forward is +x, strafe right is +z
    const [fx, fz] = stepWalk([0, 0], -Math.PI / 2, { forward: 1, strafe: 1 }, 2, 1);
    expect(Math.hypot(fx, fz)).toBeCloseTo(2);
    expect(fx).toBeGreaterThan(0);
    expect(fz).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { FLEET, SIZE, afloat, aiPick, around, blankShots, randomFleet, shoot } from './battleship';

const seeded = (seed = 11) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe('randomFleet', () => {
  it('places every boat inside the board, none touching another', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const fleet = randomFleet(seeded(seed));
      expect(fleet.map((s) => s.size).sort()).toEqual([...FLEET].sort());
      const all = fleet.flatMap((s) => s.cells);
      expect(new Set(all).size).toBe(all.length);
      expect(all.every((cell) => cell >= 0 && cell < SIZE * SIZE)).toBe(true);
      for (const ship of fleet) {
        const rows = new Set(ship.cells.map((c) => Math.floor(c / SIZE)));
        const cols = new Set(ship.cells.map((c) => c % SIZE));
        expect(rows.size === 1 || cols.size === 1).toBe(true);
        const others = fleet.filter((o) => o !== ship).flatMap((o) => o.cells);
        expect(ship.cells.some((cell) => around(cell).some((n) => others.includes(n)))).toBe(false);
      }
    }
  });
});

describe('shoot', () => {
  const fleet = [{ id: 0, size: 2, cells: [11, 12], vertical: false }, { id: 1, size: 1, cells: [55], vertical: false }];
  it('tells a miss, a hit and a repeat apart', () => {
    let result = shoot(fleet, blankShots(), 0);
    expect(result.outcome).toBe('miss');
    expect(result.shots[0]).toBe(1);
    expect(shoot(fleet, result.shots, 0).outcome).toBe('repeat');
    result = shoot(fleet, blankShots(), 11);
    expect(result.outcome).toBe('hit');
  });
  it('sinks a boat, marks the squares around it as misses, and ends the game when all are sunk', () => {
    let result = shoot(fleet, blankShots(), 11);
    result = shoot(fleet, result.shots, 12);
    expect(result.outcome).toBe('sunk');
    expect([11, 12].every((c) => result.shots[c] === 3)).toBe(true);
    expect(around(11).concat(around(12)).filter((n) => ![11, 12].includes(n)).every((n) => result.shots[n] === 1)).toBe(true);
    expect(result.done).toBe(false);
    expect(afloat(fleet, result.shots)).toEqual([1]);
    expect(shoot(fleet, result.shots, 55).done).toBe(true);
  });
});

describe('aiPick', () => {
  it('never shoots a square that has been shot', () => {
    const fleet = randomFleet(seeded(5));
    let shots = blankShots();
    for (let turn = 0; turn < 100; turn += 1) {
      const pick = aiPick(shots, afloat(fleet, shots), seeded(turn + 1));
      expect(shots[pick]).toBe(0);
      const result = shoot(fleet, shots, pick);
      shots = result.shots;
      if (result.done) break;
    }
  });
  it('goes after the neighbours of a hit, and along the line once it has two', () => {
    const shots = blankShots();
    shots[44] = 2;
    expect([34, 54, 43, 45]).toContain(aiPick(shots, [4, 3], seeded()));
    shots[45] = 2;
    expect([43, 46]).toContain(aiPick(shots, [4, 3], seeded()));
  });
  it('wins a whole game in well under a hundred shots', () => {
    let total = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const fleet = randomFleet(seeded(seed * 3));
      let shots = blankShots();
      let count = 0;
      const random = seeded(seed * 7);
      while (count < 100) {
        const result = shoot(fleet, shots, aiPick(shots, afloat(fleet, shots), random));
        shots = result.shots;
        count += 1;
        if (result.done) break;
      }
      expect(count).toBeLessThan(100);
      total += count;
    }
    expect(total / 20).toBeLessThan(75);
  });
});

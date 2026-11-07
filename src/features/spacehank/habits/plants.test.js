import { describe, expect, it } from 'vitest';
import { gardenPlants, newlyWatered } from './plants';

const TODAY = new Date(2026, 10, 7);

describe('the plants of the garden', () => {
  it('has a stage for each habit, and whether it was watered today', () => {
    const habits = [
      { id: 'a', name: 'Read', hue: 140, days: ['2026-11-05', '2026-11-06', '2026-11-07'] },
      { id: 'b', name: 'Walk', hue: 200, days: [] },
      { id: 'c', name: 'Write', hue: 30, days: ['2026-10-20'] },
    ];
    const plants = gardenPlants(habits, TODAY);
    expect(plants.map((p) => [p.id, p.stage, p.doneToday, p.wilting])).toEqual([
      ['a', 2, true, false],
      ['b', 0, false, false],
      ['c', 0, false, true],
    ]);
  });

  it('is empty for an empty garden', () => {
    expect(gardenPlants([], TODAY)).toEqual([]);
  });
});

describe('what was just watered', () => {
  it('is what is watered now and was not before', () => {
    expect(newlyWatered(new Set(['a']), new Set(['a', 'b']))).toEqual(['b']);
    expect(newlyWatered(new Set(['a', 'b']), new Set(['a']))).toEqual([]);
    expect(newlyWatered(new Set(), new Set())).toEqual([]);
  });
});

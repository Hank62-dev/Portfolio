import { describe, expect, it } from 'vitest';
import { composeText } from '../diary/model';
import { STAGES, TAP_LINES, derivePet, growthPoints, lineFor, outfitOf, petMood, stageOf } from './model';

const NOW = new Date(2026, 10, 3, 15); // Tuesday 3 Nov 2026, afternoon
const page = (day) => ({ id: day, day, mood: 4, text: composeText(day, 'x'), updatedAt: 1 });
const none = { hour: 15, wroteToday: false, focusToday: 0, streak: 0, daysAway: 0, entries: 0 };

describe('growing up', () => {
  it('counts a page as three and a focus session as one', () => {
    expect(growthPoints({ entries: 4, focusSessions: 5 })).toBe(17);
    expect(growthPoints({})).toBe(0);
  });

  it('finds the stage, the next one and how far along', () => {
    expect(stageOf(0)).toMatchObject({ stage: { id: 'baby' }, next: { id: 'kid' }, left: 6, progress: 0 });
    expect(stageOf(3).progress).toBe(0.5);
    expect(stageOf(6).stage.id).toBe('kid');
    expect(stageOf(24).stage.id).toBe('traveler');
    expect(stageOf(500)).toMatchObject({ stage: { id: 'legend' }, next: null, left: 0, progress: 1 });
    expect(STAGES.map((s) => s.min)).toEqual([...STAGES.map((s) => s.min)].sort((a, b) => a - b));
  });

  it('dresses her more as she grows', () => {
    expect(outfitOf('baby')).toEqual({ scarf: false, backpack: false, hat: false, star: false });
    expect(outfitOf('kid')).toMatchObject({ scarf: true, backpack: false });
    expect(outfitOf('traveler')).toMatchObject({ scarf: true, backpack: true, hat: false });
    expect(outfitOf('legend')).toEqual({ scarf: true, backpack: true, hat: true, star: true });
  });
});

describe('how she feels', () => {
  it('sleeps at night', () => {
    expect(petMood({ ...none, hour: 23 })).toBe('sleepy');
    expect(petMood({ ...none, hour: 3, wroteToday: true })).toBe('sleepy');
    expect(petMood({ ...none, hour: 5 })).toBe('calm');
  });

  it('is happy after a page or a focus session, and over the moon after a great day', () => {
    expect(petMood({ ...none, wroteToday: true })).toBe('happy');
    expect(petMood({ ...none, focusToday: 25 })).toBe('happy');
    expect(petMood({ ...none, wroteToday: true, focusToday: 50 })).toBe('excited');
    expect(petMood({ ...none, wroteToday: true, streak: 7 })).toBe('excited');
    expect(petMood({ ...none, wroteToday: true, streak: 6 })).toBe('happy');
  });

  it('misses you after three days, and worries when tonight could end a streak', () => {
    expect(petMood({ ...none, entries: 5, daysAway: 3 })).toBe('lonely');
    expect(petMood({ ...none, entries: 5, daysAway: 2 })).toBe('calm');
    expect(petMood({ ...none, hour: 21, streak: 4 })).toBe('worried');
    expect(petMood({ ...none, hour: 21, streak: 0 })).toBe('calm');
  });
});

describe('what she says', () => {
  it('always has a line, the same one for the same seed', () => {
    for (const mood of ['sleepy', 'excited', 'happy', 'lonely', 'worried', 'calm']) {
      expect(lineFor(mood, 3).length).toBeGreaterThan(5);
      expect(lineFor(mood, 3)).toBe(lineFor(mood, 3));
    }
    expect(lineFor('nonsense', 0)).toBe(lineFor('calm', 0));
    expect(TAP_LINES.length).toBeGreaterThan(2);
  });
});

describe('derivePet', () => {
  it('starts as a calm little sprout', () => {
    const pet = derivePet({ notes: [], log: [], now: NOW });
    expect(pet).toMatchObject({ name: 'Niú', mood: 'calm', points: 0, stage: { id: 'baby' } });
    expect(pet.outfit.scarf).toBe(false);
  });

  it('is happy and a bit bigger once there are pages and a focus session today', () => {
    const notes = [page('2026-11-01'), page('2026-11-02'), page('2026-11-03')];
    const log = [{ at: new Date(2026, 10, 3, 9).getTime(), minutes: 25 }];
    const pet = derivePet({ notes, log, now: NOW });
    expect(pet.points).toBe(10);
    expect(pet.stage.id).toBe('kid');
    expect(pet.mood).toBe('excited'); // a page and 25 minutes of focus
    expect(pet.focusToday).toBe(25);
    expect(pet.outfit.scarf).toBe(true);
  });

  it('misses you when the last page is old', () => {
    const pet = derivePet({ notes: [page('2026-10-28')], log: [], now: NOW });
    expect(pet.mood).toBe('lonely');
  });
});

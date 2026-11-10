import { dayKey, stageOf } from './model.js';

// The garden as plain functions: which plants stand in the scene, and which one has just been watered.

/** The plants of the garden, oldest first: [{ id, name, hue, stage, wilting, streak, doneToday }]. The demo's sample habits are included. */
export const gardenPlants = (habits, today = new Date()) => {
  const key = dayKey(today);
  return habits.map((h) => {
    const { stage, wilting, streak } = stageOf(h.days, today);
    return { id: h.id, name: h.name, hue: h.hue, stage, wilting, streak, doneToday: h.days.includes(key) };
  });
};

/** The ids that are watered now but were not before: `before` and `now` are Sets of the ids watered today. */
export const newlyWatered = (before, now) => [...now].filter((id) => !before.has(id));

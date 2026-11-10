import { createCollection } from '../../core/collections';
import { dayKey, newHabit } from './model';

export const habits = createCollection('habits', { order: (a, b) => a.createdAt - b.createdAt });

/** Three habits with a history, so the garden has something growing the first time you look. */
export const sampleHabits = (today = new Date()) => {
  const back = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return dayKey(d);
  };
  const run = (length, skip = []) => Array.from({ length }, (_, i) => back(i)).filter((_, i) => !skip.includes(i));
  const make = (name, icon, hue, days) => ({ id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now(), sample: true, ...newHabit(name, icon, hue), days: days.sort() });
  return [
    make('Read 20 minutes', 'book', 210, run(34)),
    make('Move your body', 'run', 140, run(40, [3, 4, 11, 12, 13, 20, 27, 28, 29])),
    make('Write in the journal', 'write', 30, run(5, [2])),
  ];
};

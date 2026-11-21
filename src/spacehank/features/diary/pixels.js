import { isWritten } from './model.js';

// A year as pixels: one cell per day, in columns of weeks (Monday on top), coloured by the diary's mood or by how many habits
// were kept. Pure: data in, cells out.

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * The cells of `year`: [{ day, week, weekday, mood, habits, future }], where `week` is the column (0 = the week of 1 January),
 * `weekday` the row (0 = Monday), `mood` 1–5 or 0, `habits` the share of habits kept that day (0–1, or null with no habits).
 */
export const yearCells = ({ year, notes = [], habits = [], today }) => {
  const moods = new Map();
  for (const note of notes) {
    if (note.day?.startsWith(`${year}-`) && isWritten(note)) {
      const was = moods.get(note.day);
      if (!was || (note.updatedAt ?? 0) > was.at) moods.set(note.day, { mood: note.mood || 0, at: note.updatedAt ?? 0 });
    }
  }
  const live = habits.filter((h) => !h.sample);
  const kept = new Map();
  for (const habit of live) for (const day of habit.days ?? []) if (day.startsWith(`${year}-`)) kept.set(day, (kept.get(day) ?? 0) + 1);
  const first = new Date(year, 0, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const cells = [];
  for (let d = new Date(first); d.getFullYear() === year; d.setDate(d.getDate() + 1)) {
    const day = keyOf(d);
    const index = lead + cells.length;
    cells.push({
      day,
      week: Math.floor(index / 7),
      weekday: index % 7,
      mood: moods.get(day)?.mood ?? 0,
      written: moods.has(day),
      habits: live.length ? Math.min(1, (kept.get(day) ?? 0) / live.length) : null,
      future: day > today,
    });
  }
  return cells;
};

/** Where each month starts, for the labels over the columns: [{ month: 0–11, week }]. */
export const monthStarts = (cells) => cells.filter((c) => c.day.endsWith('-01')).map((c) => ({ month: Number(c.day.slice(5, 7)) - 1, week: c.week }));

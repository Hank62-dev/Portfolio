import { isDemo } from '../../../core/demo/mode';
import { createStore } from '../../../core/store';
import { dayKey } from '../../habits/model';

// How many cards were answered each day, kept on this device (a line a day). The demo has a log of its own.

const KEEP_DAYS = 60;
const key = () => (isDemo() ? 'hank62.demo.cards.log' : 'hank62.cards.log');

/** The log with one more answer on `day`. `grade` 0 is "Again". Pure. */
export const addReview = (log, grade, day = dayKey()) => {
  const rest = log.filter((entry) => entry.day !== day);
  const today = log.find((entry) => entry.day === day) ?? { day, n: 0, again: 0 };
  return [...rest, { day, n: today.n + 1, again: today.again + (grade === 0 ? 1 : 0) }].sort((a, b) => (a.day < b.day ? -1 : 1)).slice(-KEEP_DAYS);
};

/** The log with one answer taken back (for "Undo"). Pure. */
export const removeReview = (log, grade, day = dayKey()) =>
  log
    .map((entry) => (entry.day === day ? { ...entry, n: Math.max(0, entry.n - 1), again: Math.max(0, entry.again - (grade === 0 ? 1 : 0)) } : entry))
    .filter((entry) => entry.n > 0);

/** What was saved, or nothing usable. Pure. */
export const parseReviewLog = (text) => {
  try {
    const saved = JSON.parse(text ?? '[]');
    return Array.isArray(saved) ? saved.filter((e) => typeof e?.day === 'string' && Number.isFinite(e.n) && e.n > 0).map((e) => ({ day: e.day, n: e.n, again: Number(e.again) || 0 })) : [];
  } catch {
    return [];
  }
};

/** Answers given on `day`. Pure. */
export const answeredOn = (log, day = dayKey()) => log.find((entry) => entry.day === day)?.n ?? 0;

/** Days in a row with at least one answer, up to today (or up to yesterday, while today has none yet). Pure. */
export const studyStreak = (log, today = new Date()) => {
  const days = new Set(log.map((e) => e.day));
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let run = 0;
  while (days.has(dayKey(cursor))) {
    run += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return run;
};

const read = () => {
  try {
    return parseReviewLog(localStorage.getItem(key()));
  } catch {
    return [];
  }
};
const write = (log) => {
  try {
    localStorage.setItem(key(), JSON.stringify(log));
  } catch {
    /* private mode: the count just will not outlive this visit */
  }
};

export const reviewLog = createStore({ log: read() });

/** A card was answered. */
export const recordReview = (grade) => {
  const log = addReview(reviewLog.get().log, grade);
  write(log);
  reviewLog.set({ log });
};

/** An answer was taken back. */
export const unrecordReview = (grade) => {
  const log = removeReview(reviewLog.get().log, grade);
  write(log);
  reviewLog.set({ log });
};

import { dayKey } from '../habits/model.js';
import { dayOf } from '../wallet/model.js';
import { bodyOf, entryOf } from '../diary/model.js';

// The day as a front page: what it leads with, its columns and a line from the diary. Pure: data in, a plain object out.

/** The part of the day it is, for the order of the home screen: morning (5–11), midday (11–17), evening (17–5). */
export const partOfDay = (now = new Date()) => {
  const h = now.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'midday';
  return 'evening';
};

/** The first sentence of a text, cut to `max` characters. */
export const firstSentence = (text, max = 160) => {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const end = clean.search(/[.!?…](\s|$)/);
  const sentence = end > 0 ? clean.slice(0, end + 1) : clean;
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
};

/**
 * Today's front page: { day, headline, done: [titles], habits: { done, total, names }, money: { total, count, biggest },
 * quote, mood }. The headline is the task finished last today (the day's news), or null on a quiet day.
 */
export const dayPaper = ({ cards = [], habits = [], entries = [], notes = [], now = new Date() }) => {
  const key = dayKey(now);
  const doneToday = cards
    .filter((c) => c.column === 'done' && !c.sample && c.updatedAt && dayKey(new Date(c.updatedAt)) === key)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const live = habits.filter((h) => !h.sample);
  const kept = live.filter((h) => h.days.includes(key));
  const spent = entries.filter((e) => e.type === 'expense' && !e.sample && dayOf(e.at) === key);
  const biggest = spent.reduce((top, e) => (!top || e.amount > top.amount ? e : top), null);
  const page = entryOf(notes, key);
  return {
    day: key,
    headline: doneToday[0]?.title ?? null,
    done: doneToday.map((c) => c.title),
    habits: { done: kept.length, total: live.length, names: kept.map((h) => h.name) },
    money: { total: spent.reduce((n, e) => n + e.amount, 0), count: spent.length, biggest: biggest ? { amount: biggest.amount, note: biggest.note || '' } : null },
    quote: page ? firstSentence(bodyOf(page.text)) : '',
    mood: page?.mood ?? 0,
  };
};

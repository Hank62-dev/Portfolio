import { locale } from '../lang.js';
import { bodyOf, entryOf, excerptOf, isWritten } from '../diary/model.js';
import { dayKey, stageOf } from '../habits/model.js';
import { hueOf, titleOf } from '../notes/notes.js';
import { categoryOf, summarize } from '../wallet/model.js';
import { weekWindow } from './model.js';

// What the week was made of, thing by thing: the tasks finished, each habit's seven days, the diary pages, the notes, the
// biggest spends, the busiest day. It is read on the device to draw the story and is never sent anywhere (what the AI gets is
// `weekStats`, which has totals only).

const DAY = 86400000;
const within = (t, from, to) => t >= from && t < to;

/**
 * { tasks, habits, diary, photos, notes, spends, categories, best } for the seven days of the window.
 * tasks: [{ id, title, label }] oldest first · habits: [{ id, name, hue, stage, wilting, streak, pips[7], daysDone }] best first ·
 * diary: [{ key, label, mood, excerpt, photo }] · photos: [{ id, label }] · notes: [{ id, title, hue, label, at }] newest first ·
 * spends: the three biggest [{ id, title, amount, hue }] · categories: [{ label, hue, total, pct }] ·
 * best: the busiest day { key, name, tasks[], habits[], diary, notes, spent } or null when no day had more than one thing.
 */
export const weekRecap = ({ cards = [], habits = [], entries = [], notes = [] }, now = new Date()) => {
  const { from, to } = weekWindow(now);
  const real = (list) => list.filter((x) => !x.sample);
  const short = (t) => new Date(t).toLocaleDateString(locale(), { weekday: 'short' });
  const keys = Array.from({ length: 7 }, (_, i) => dayKey(new Date(from + i * DAY + 3600000)));

  const tasks = real(cards)
    .filter((c) => c.column === 'done' && within(c.updatedAt ?? 0, from, to))
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .map((c) => ({ id: c.id, title: c.title, label: short(c.updatedAt) }));

  const live = real(habits);
  const habitRows = live
    .map((h) => {
      const { stage, wilting, streak } = stageOf(h.days, now);
      const pips = keys.map((k) => h.days.includes(k));
      return { id: h.id, name: h.name, hue: h.hue ?? 140, stage, wilting, streak, pips, daysDone: pips.filter(Boolean).length };
    })
    .sort((a, b) => b.daysDone - a.daysDone);

  const pages = keys.map((key, i) => {
    const entry = entryOf(notes, key);
    return isWritten(entry) ? { key, label: short(from + i * DAY + 3600000), mood: entry.mood ?? null, excerpt: excerptOf(bodyOf(entry.text), 150), photo: entry.photos?.[0] ?? null, photos: entry.photos ?? [] } : null;
  });
  const diary = pages.filter(Boolean).map((p) => ({ key: p.key, label: p.label, mood: p.mood, excerpt: p.excerpt, photo: p.photo }));
  const photos = pages.filter(Boolean).flatMap((p) => p.photos.map((id) => ({ id, label: p.label }))).slice(0, 6);

  const written = real(notes)
    .filter((n) => !n.day && within(n.createdAt ?? 0, from, to))
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((n) => {
      const title = titleOf(n.text);
      return { id: n.id, title, hue: hueOf(title), label: short(n.createdAt), at: n.createdAt };
    });

  const money = real(entries).filter((e) => within(e.at ?? 0, from, to));
  const spends = money
    .filter((e) => e.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((e) => ({ id: e.id, title: e.note || categoryOf(e.category).label, amount: e.amount, hue: categoryOf(e.category).hue }));
  const categories = summarize(money)
    .byCategory.slice(0, 4)
    .map((c) => ({ label: categoryOf(c.category).label, hue: categoryOf(c.category).hue, total: c.total, pct: c.pct }));

  let best = null;
  let bestScore = 1;
  keys.forEach((key, i) => {
    const start = from + i * DAY;
    const end = start + DAY;
    const day = {
      key,
      name: new Date(start + 3600000).toLocaleDateString(locale(), { weekday: 'long' }),
      tasks: real(cards)
        .filter((c) => c.column === 'done' && within(c.updatedAt ?? 0, start, end))
        .map((c) => c.title),
      habits: live.filter((h) => h.days.includes(key)).map((h) => h.name),
      diary: Boolean(pages[i]),
      notes: written.filter((n) => within(n.at, start, end)).length,
      spent: summarize(money.filter((e) => within(e.at ?? 0, start, end))).spent,
    };
    const score = day.tasks.length + day.habits.length + (day.diary ? 1 : 0) + day.notes + (day.spent > 0 ? 1 : 0);
    if (score > bestScore) {
      best = day;
      bestScore = score;
    }
  });

  return { tasks, habits: habitRows, diary, photos, notes: written, spends, categories, best };
};

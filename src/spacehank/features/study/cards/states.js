import { tr } from '../../../core/i18n/lang';
// Flashcards as plain functions: what state a card is in, how a deck is doing, what is coming, and blanks (cloze).

const DAY = 86400000;
const MATURE = 21; // days between reviews from which a card counts as well known

const dayStart = (t) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** 'new' (never reviewed), 'learning' (still being learnt, or forgotten again), or 'mature' (comes back in 21 days or more). */
export const cardState = (card) => {
  if (!card.reps && !card.lastReviewed) return 'new';
  return card.interval >= MATURE ? 'mature' : 'learning';
};

/** How a set of cards stands: counts by state, and how many are due. */
export const deckStats = (cards, now = Date.now()) => {
  const stats = { total: cards.length, due: 0, new: 0, learning: 0, mature: 0 };
  for (const card of cards) {
    stats[cardState(card)] += 1;
    if (card.due <= now) stats.due += 1;
  }
  return stats;
};

/** How many cards fall due on each of the next `days` days; the first day also holds everything already due. */
export const forecast = (cards, days = 7, now = Date.now()) => {
  const today = dayStart(now);
  const counts = Array.from({ length: days }, () => 0);
  for (const card of cards) {
    const index = Math.max(0, Math.round((dayStart(card.due) - today) / DAY));
    if (index < days) counts[index] += 1;
  }
  return counts;
};

/** The cards for a session: the ones due (most overdue first), or with `ahead` the ones that will be due soonest. At most `limit`. */
export const sessionCards = (cards, { now = Date.now(), ahead = false, limit = 50 } = {}) => {
  const pool = ahead ? [...cards].sort((a, b) => a.due - b.due) : cards.filter((c) => c.due <= now).sort((a, b) => a.due - b.due);
  return pool.slice(0, limit);
};

/** Cards whose front or back holds every word of the search, case and accents aside. */
export const searchCards = (cards, query) => {
  const fold = (text) => String(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return cards;
  return cards.filter((card) => {
    const haystack = fold(`${card.front} ${card.back}`);
    return words.every((word) => haystack.includes(word));
  });
};

// ---- blanks: "The {{heart}} pumps blood" is shown as "The [...] pumps blood" and answered with "heart"
const CLOZE = /\{\{([^{}]+?)\}\}/g;

export const hasCloze = (text) => new RegExp(CLOZE.source).test(String(text));

/** The text with every blank hidden: "The [...] pumps blood". */
export const clozeFront = (text) => String(text).replace(CLOZE, '[...]');

/** The text split into plain and blank pieces, for drawing the answer with the blanks marked: [{ text, blank }]. */
export const clozeParts = (text) => {
  const parts = [];
  let last = 0;
  for (const match of String(text).matchAll(CLOZE)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), blank: false });
    parts.push({ text: match[1], blank: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), blank: false });
  return parts;
};

/** Wraps the selected part of a text in a blank. Returns the new text, or the same text if nothing is selected. */
export const wrapBlank = (text, start, end) => {
  if (!(end > start)) return text;
  const picked = text.slice(start, end).trim();
  if (!picked || /[{}]/.test(picked)) return text;
  const left = text.slice(0, start) + (text.slice(start, end).startsWith(' ') ? ' ' : '');
  const right = (text.slice(start, end).endsWith(' ') ? ' ' : '') + text.slice(end);
  return `${left}{{${picked}}}${right}`;
};

/** A session's numbers once it is over: how many, how many were not forgotten, and the share. `grades` is a list of 0 to 3. */
export const summarize = (grades) => {
  const counts = [0, 0, 0, 0];
  for (const g of grades) counts[g] += 1;
  const total = grades.length;
  const remembered = total - counts[0];
  return { total, counts, remembered, accuracy: total ? Math.round((remembered / total) * 100) : 0 };
};

/** A length of time as "45s", "3 min", "1 h 05". */
export const duration = (ms) => {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return tr('{0} min', minutes);
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
};

/** When a card is next due, in words: "now", "in 2 hours", "tomorrow", "in 5 days", "in 3 weeks". */
export const dueIn = (due, now = Date.now()) => {
  if (due <= now) return 'now';
  const minutes = Math.round((due - now) / 60000);
  if (minutes < 60) return tr('in {0} min', minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return tr('in {0} {1}', hours, hours === 1 ? tr('hour') : tr('hours'));
  const days = Math.round((dayStart(due) - dayStart(now)) / DAY);
  if (days <= 1) return 'tomorrow';
  if (days < 14) return tr('in {0} days', days);
  if (days < 60) return tr('in {0} weeks', Math.round(days / 7));
  return tr('in {0} months', Math.round(days / 30));
};

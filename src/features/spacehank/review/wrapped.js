import { tr } from '../lang.js';
import { formatVnd } from '../wallet/model.js';

// The weekly review as a few full-screen cards, like a story: one fact on each, big. This only decides which cards there are and
// what they say; the screen draws them. A card is left out when there is nothing true to put on it.

/** How much more or less was spent than the week before, in whole percent (positive: more); null when there is nothing to compare. */
export const spendChange = (stats) => (stats.spentBefore > 0 ? Math.round(((stats.spent - stats.spentBefore) / stats.spentBefore) * 100) : null);

/** The habit kept on the most days this week, or null when none was kept at all. */
export const bestHabit = (stats) => [...(stats.habits ?? [])].filter((h) => h.daysDone > 0).sort((a, b) => b.daysDone - a.daysDone)[0] ?? null;

/**
 * The cards of the story: [{ id, hue, kicker, value, of?, format, unit, sub }]. `value` is a number the screen counts up to;
 * `format` is 'number' or 'vnd'. The first card has no number; the last is Hank's own words (`written`, which may be empty).
 */
export const wrappedSlides = (stats, { range = '', written = '' } = {}) => {
  const slides = [{ id: 'intro', hue: 16, kicker: tr('YOUR WEEK'), unit: tr('Here is how it went'), sub: range }];

  if (stats.tasksDone > 0 || stats.tasksOpen > 0) {
    const open = stats.tasksOverdue ? tr('{0} still open, {1} overdue', stats.tasksOpen, stats.tasksOverdue) : tr('{0} still open', stats.tasksOpen);
    slides.push({ id: 'tasks', hue: 196, kicker: tr('TASKS'), value: stats.tasksDone, format: 'number', unit: stats.tasksDone === 1 ? tr('task finished') : tr('tasks finished'), sub: open });
  }

  if (stats.habitChecksPossible > 0) {
    const best = bestHabit(stats);
    slides.push({ id: 'habits', hue: 132, kicker: tr('HABITS'), value: stats.habitChecks, of: stats.habitChecksPossible, format: 'number', unit: tr('habit check-ins'), sub: best ? tr('Best: {0} ({1} of 7 days)', best.name, best.daysDone) : tr('No habit was ticked this week. A small one is enough to start.') });
  }

  if (stats.spent > 0 || stats.income > 0) {
    const change = spendChange(stats);
    const top = stats.topCategories?.[0];
    const parts = [];
    if (change !== null && change !== 0) parts.push(change > 0 ? tr('{0}% more than the week before', change) : tr('{0}% less than the week before', -change));
    if (top) parts.push(tr('Most went on {0} ({1}).', top.category, formatVnd(top.total)));
    slides.push({ id: 'money', hue: 84, kicker: tr('MONEY'), value: stats.spent, format: 'vnd', unit: tr('spent this week'), sub: parts.join(' · ') });
  }

  if (stats.diaryDays > 0 || stats.notesWritten > 0 || stats.memos > 0) {
    slides.push({
      id: 'mind',
      hue: 350,
      kicker: tr('YOUR HEAD'),
      value: stats.diaryDays,
      of: 7,
      format: 'number',
      unit: tr('days in your diary'),
      sub: stats.moodAverage ? tr('Average mood {0} of 5', stats.moodAverage) : tr('New notes: {0}. Voice memos: {1}.', stats.notesWritten, stats.memos),
    });
  }

  slides.push({ id: 'outro', hue: 16, kicker: tr('FROM HANK'), written: String(written ?? '').trim() });
  return slides;
};

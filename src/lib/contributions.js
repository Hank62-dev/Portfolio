// Pure helpers over [{ date: 'YYYY-MM-DD', count }] — kept separate so they are easy to test.

const DAY = 86400000;

const toUtc = (iso) => Date.parse(`${iso}T00:00:00Z`);

export const sumCounts = (days) => days.reduce((sum, d) => sum + d.count, 0);

export const lastDays = (days, n) => days.slice(-n);

/**
 * Longest run of consecutive active days, and the current run.
 * A run that ended yesterday still counts as current (today may not be over yet).
 */
export const computeStreaks = (days) => {
  const sorted = [...days].sort((a, b) => toUtc(a.date) - toUtc(b.date));
  let longest = 0;
  let run = 0;
  let prev = null;

  sorted.forEach((d) => {
    const consecutive = prev !== null && toUtc(d.date) - prev === DAY;
    run = d.count > 0 ? (consecutive || run === 0 ? run + 1 : 1) : 0;
    longest = Math.max(longest, run);
    prev = toUtc(d.date);
  });

  let current = 0;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const d = sorted[i];
    if (d.count > 0) current += 1;
    else if (i === sorted.length - 1) continue; // today still empty
    else break;
  }

  return { current, longest };
};

const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6]; // Sunday first, like GitHub's own graph

/**
 * Lays days out for a weekly heatmap: one column per week, seven rows (Sunday..Saturday).
 * Returns { cells: [{ date, count, level, col, row }], weeks }. `level` is 0..4, scaled to the busiest day.
 */
export const heatmapCells = (days, weeks = 53) => {
  const recent = days.slice(-weeks * 7);
  if (!recent.length) return { cells: [], weeks: 0 };
  const max = Math.max(...recent.map((d) => d.count), 1);
  const firstRow = WEEKDAY_ORDER.indexOf(new Date(`${recent[0].date}T00:00:00Z`).getUTCDay());

  const cells = recent.map((d) => {
    const slot = firstRow + Math.round((toUtc(d.date) - toUtc(recent[0].date)) / DAY);
    const level = d.count === 0 ? 0 : Math.min(4, Math.ceil((d.count / max) * 4));
    return { date: d.date, count: d.count, level, col: Math.floor(slot / 7), row: slot % 7 };
  });
  return { cells, weeks: cells[cells.length - 1].col + 1 };
};

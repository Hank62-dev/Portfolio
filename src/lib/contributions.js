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

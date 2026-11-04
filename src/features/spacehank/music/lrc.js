// Synced lyrics from an .lrc file the owner attaches: "[mm:ss.xx] words".

const TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

/** Lines as [{ time (seconds), text }] sorted by time; lines with several stamps repeat; metadata tags are skipped. */
export const parseLrc = (source) => {
  const lines = [];
  for (const raw of String(source ?? '').split(/\r?\n/)) {
    const stamps = [...raw.matchAll(TAG)];
    if (!stamps.length) continue;
    const text = raw.replace(TAG, '').trim();
    for (const [, min, sec, frac = '0'] of stamps) {
      lines.push({ time: Number(min) * 60 + Number(sec) + Number(frac) / 10 ** frac.length, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
};

/** Index of the line being sung at `time`, or -1 before the first line. */
export const activeLine = (lines, time) => {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= time) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
};

/**
 * Lyrics with no times, laid out along the song anyway: every line gets a moment, in proportion to how much there is to sing in it
 * (a blank line between verses is a breath, so it adds a little), between a short intro and a short outro. It is a guess, and a
 * good enough one for the sung line to be marked and the list to slide along; with no length to go by there is nothing to lay out.
 * Returns [{ time, text }], like parseLrc.
 */
export const estimateLines = (source, duration) => {
  if (!(duration > 20)) return [];
  const rows = [];
  for (const raw of String(source ?? '').split(/\r?\n/)) {
    const text = raw.trim();
    if (text) rows.push({ text, weight: Math.max(10, text.length) });
    else if (rows.length) rows[rows.length - 1].weight += 14; // the pause before the next verse
  }
  if (!rows.length) return [];
  const start = Math.min(14, Math.max(4, duration * 0.05));
  const end = duration - Math.min(16, Math.max(6, duration * 0.06));
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  let spent = 0;
  return rows.map((row) => {
    const time = start + ((end - start) * spent) / total;
    spent += row.weight;
    return { time: Math.round(time * 100) / 100, text: row.text };
  });
};

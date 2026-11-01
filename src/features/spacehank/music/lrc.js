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

// Command-palette search: plain functions, so the ranking can be tested without a browser.

const norm = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // "bài" matches "bai"
    .replace(/đ/g, 'd');

/**
 * How well `query` matches `text`, 0 for no match. A prefix of a word beats a substring, which beats the
 * letters appearing in order; earlier and tighter matches score higher.
 */
export const scoreText = (query, text) => {
  const q = norm(query).trim();
  const t = norm(text);
  if (!q) return 1;
  if (!t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90 - Math.min(20, t.length - q.length);
  const wordStart = t.split(/[\s\-_/·]+/).findIndex((word) => word.startsWith(q));
  if (wordStart >= 0) return 75 - Math.min(15, wordStart * 3);
  const at = t.indexOf(q);
  if (at >= 0) return 60 - Math.min(20, at);

  // letters in order, with a penalty for each gap
  let cursor = 0;
  let gaps = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, cursor);
    if (found < 0) return 0;
    gaps += found - cursor;
    cursor = found + 1;
  }
  return Math.max(1, 40 - Math.min(35, gaps));
};

/** Commands matching the query, best first. A command may also carry `keywords` (extra words it answers to). */
export const filterCommands = (commands, query, limit = 40) => {
  const q = query.trim();
  if (!q) return commands.slice(0, limit);
  return commands
    .map((command) => ({
      command,
      score: Math.max(scoreText(q, command.label), scoreText(q, command.keywords ?? '') * 0.8, scoreText(q, command.hint ?? '') * 0.5),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ command }) => command);
};

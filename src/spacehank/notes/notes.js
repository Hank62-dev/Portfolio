import { locale } from '../lang';
// Notes as plain data and plain functions: what a note's title and tags are, how a search ranks them, and the
// numbers behind the journal's mood chart. Nothing here touches the browser, so all of it is tested.

export const strip = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

/** A note's title: its first line of text, without markdown marks. */
export const titleOf = (text) => {
  const line = String(text ?? '')
    .split('\n')
    .map((l) => l.replace(/^[#>\-*\s]+/, '').replace(/[*_`[\]]/g, '').trim())
    .find(Boolean);
  return line ? line.slice(0, 80) : 'Untitled';
};

/** #tags written in the text (a "# Heading" with a space is not one), lowercase, in order of first use. */
export const tagsOf = (text) => {
  const found = [];
  for (const match of String(text ?? '').matchAll(/(^|[\s(])#([\p{L}\p{N}][\p{L}\p{N}_-]{1,29})/gu)) {
    const tag = match[2].toLowerCase();
    if (!found.includes(tag)) found.push(tag);
  }
  return found;
};

/** A steady colour (a hue, 0 to 359) for any word, so a tag or topic always looks the same. */
export const hueOf = (word) => [...String(word || 'note')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);

export const tokenize = (text) => strip(text).split(/[^a-z0-9]+/).filter((t) => t.length > 1);

const K1 = 1.4;
const B = 0.75;

/**
 * Notes that match a query, best first (BM25 on the words, with the title counting triple). A query word also
 * matches the start of a longer word, so "plan" finds "planning". Returns [{ note, score }].
 */
export const searchNotes = (notes, query, limit = 20) => {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [];
  const docs = notes.map((note) => {
    const words = [...tokenize(titleOf(note.text)), ...tokenize(titleOf(note.text)), ...tokenize(titleOf(note.text)), ...tokenize(note.text)];
    return { note, words };
  });
  const avg = docs.reduce((sum, d) => sum + d.words.length, 0) / Math.max(1, docs.length) || 1;
  const df = new Map(terms.map((t) => [t, docs.filter((d) => d.words.some((w) => w === t || w.startsWith(t))).length]));

  return docs
    .map(({ note, words }) => {
      let score = 0;
      for (const term of terms) {
        const tf = words.reduce((n, w) => n + (w === term ? 1 : w.startsWith(term) ? 0.6 : 0), 0);
        if (!tf) continue;
        const idf = Math.log(1 + (docs.length - df.get(term) + 0.5) / (df.get(term) + 0.5));
        score += (idf * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * words.length) / avg));
      }
      return { note, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.note.updatedAt - a.note.updatedAt)
    .slice(0, limit);
};

/** A short piece of the text around the first place the query appears, for the results list. */
export const excerpt = (text, query, length = 120) => {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  const at = tokenize(query)
    .map((t) => strip(flat).indexOf(t))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
  if (at === undefined || at < length / 3) return flat.slice(0, length) + (flat.length > length ? '…' : '');
  const start = Math.max(0, at - Math.floor(length / 3));
  return `…${flat.slice(start, start + length)}${start + length < flat.length ? '…' : ''}`;
};

/** 'YYYY-MM-DD' for a date, in the viewer's own time zone. */
export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

/** The last `days` days, oldest first, each with that day's mood (1 to 5) or null: the data for the mood chart. */
export const moodSeries = (notes, days = 30, today = new Date()) => {
  const byDay = new Map(notes.filter((n) => n.day && n.mood).map((n) => [n.day, n.mood]));
  return Array.from({ length: days }, (_, i) => {
    const day = dayKey(addDays(today, i - (days - 1)));
    return { day, mood: byDay.get(day) ?? null };
  });
};

/** How many days in a row, ending today (or yesterday, if today is not written yet), have a journal entry. */
export const journalStreak = (notes, today = new Date()) => {
  const written = new Set(notes.filter((n) => n.day).map((n) => n.day));
  let cursor = written.has(dayKey(today)) ? today : addDays(today, -1);
  let count = 0;
  while (written.has(dayKey(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
};

export const MOODS = [
  { value: 1, label: 'Rough' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];

const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Plain text as the editor's HTML, for notes written before the rich editor (or created from text, like a note
 * Hank saves for you): "# " and "## " lines become headings, "- " lines a list, "- [ ] " lines a task list, and
 * every other line a paragraph. Everything is escaped, so a note can never inject markup.
 */
export const textToHtml = (text) => {
  const out = [];
  let list = null; // 'ul' | 'tasks'
  const close = () => {
    if (list) out.push(list === 'ul' ? '</ul>' : '</ul>');
    list = null;
  };
  for (const line of String(text ?? '').split('\n')) {
    const task = /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (task) {
      if (list !== 'tasks') {
        close();
        out.push('<ul data-type="taskList">');
        list = 'tasks';
      }
      out.push(`<li data-type="taskItem" data-checked="${task[1] !== ' '}"><p>${escapeHtml(task[2])}</p></li>`);
    } else if (bullet) {
      if (list !== 'ul') {
        close();
        out.push('<ul>');
        list = 'ul';
      }
      out.push(`<li><p>${escapeHtml(bullet[1])}</p></li>`);
    } else {
      close();
      if (heading) out.push(`<h${heading[1].length}>${escapeHtml(heading[2])}</h${heading[1].length}>`);
      else if (line.trim()) out.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  close();
  return out.join('') || '<p></p>';
};

/** The text a new journal entry starts with. */
export const journalTemplate = (date = new Date()) =>
  `# ${date.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

#journal

Highlights
- 

On my mind
`;

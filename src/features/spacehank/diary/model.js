import { dayKey } from '../notes/notes';
import { tr } from '../lang';

// The diary as plain functions. A diary page is a journal note (`day` is its 'YYYY-MM-DD', `mood` is 1 to 5), so the same
// pages show up in Second Brain too; this file works out what the Nhật ký screen draws: the journey of days, the landmarks
// along it, the memories from a week or a year ago.

const DAY = 86400000;

export const parseDay = (key) => {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const shiftDay = (key, n) => {
  const date = parseDay(key);
  date.setDate(date.getDate() + n);
  return dayKey(date);
};

/** Whole days from `a` to `b` (both 'YYYY-MM-DD'); negative when `b` is earlier. */
export const daysBetween = (a, b) => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY);
};

const WEEKDAYS = [tr('CN'), tr('T2'), tr('T3'), tr('T4'), tr('T5'), tr('T6'), tr('T7')];
const WEEKDAYS_LONG = [tr('Chủ nhật'), tr('Thứ hai'), tr('Thứ ba'), tr('Thứ tư'), tr('Thứ năm'), tr('Thứ sáu'), tr('Thứ bảy')];

/** "T3 · 3/11" */
export const shortLabel = (key) => {
  const date = parseDay(key);
  return `${WEEKDAYS[date.getDay()]} · ${date.getDate()}/${date.getMonth() + 1}`;
};

/** "Thứ ba, 3 tháng 11" */
export const dayLabel = (key) => {
  const date = parseDay(key);
  return tr('{0}, {1} tháng {2}', WEEKDAYS_LONG[date.getDay()], date.getDate(), date.getMonth() + 1);
};

/** "Tháng 11" or "Tháng 11 · 2025" when it is not this year. */
export const monthLabel = (key, today = dayKey()) => {
  const date = parseDay(key);
  return date.getFullYear() === parseDay(today).getFullYear() ? tr('Tháng {0}', date.getMonth() + 1) : tr('Tháng {0} · {1}', date.getMonth() + 1, date.getFullYear());
};

export const MOOD_WORDS = [tr('Mệt mỏi'), tr('Hơi buồn'), tr('Bình thường'), tr('Vui'), tr('Rất vui')];
export const moodWord = (mood) => MOOD_WORDS[mood - 1] ?? '';

// ---- the text of a page ---------------------------------------------------------------------------------------------

/** What the person wrote, without the heading and the #journal tag the page starts with (and without the empty template). */
export const bodyOf = (text) => {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  if (/^#\s/.test(lines[0] ?? '')) i = 1;
  while (i < lines.length && (lines[i].trim() === '' || lines[i].trim().toLowerCase() === '#journal')) i += 1;
  const rest = lines.slice(i).join('\n').trim();
  return /^Highlights\s*\n-\s*\n+On my mind$/.test(rest) ? '' : rest;
};

/** The text saved on the note: a dated heading, the journal tag, then the words. */
export const composeText = (day, body) => {
  const words = String(body ?? '').trim();
  return `# ${dayLabel(day)}\n\n#journal${words ? `\n\n${words}` : ''}\n`;
};

/** The first words of a page, for the journey. */
export const excerptOf = (body, length = 90) => {
  const flat = String(body ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > length ? `${flat.slice(0, length - 1).trimEnd()}…` : flat;
};

// ---- the pages --------------------------------------------------------------------------------------------------------

/** A page counts once it has a mood, some words or a picture; an empty one (just opened) is not a day on the journey. */
export const isWritten = (note) => Boolean(note && note.day && (note.mood || bodyOf(note.text) || note.photos?.length));

/** The page for a day (the most recently edited, if there are two), or null. */
export const entryOf = (notes, day) => notes.filter((n) => n.day === day).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;

const writtenByDay = (notes) => {
  const map = new Map();
  for (const note of notes) if (isWritten(note) && (!map.has(note.day) || note.updatedAt > map.get(note.day).updatedAt)) map.set(note.day, note);
  return map;
};

/** Written days, oldest first. */
export const writtenDays = (notes) => [...writtenByDay(notes).keys()].sort();

export const MILESTONES = {
  1: { title: tr('Bước chân đầu tiên'), kind: 'flag' },
  7: { title: tr('Một tuần đồng hành'), kind: 'tent' },
  14: { title: tr('Hai tuần rồi đó'), kind: 'tent' },
  30: { title: tr('Một tháng nhật ký'), kind: 'lighthouse' },
  60: { title: tr('Hai tháng bền bỉ'), kind: 'lighthouse' },
  100: { title: tr('Trăm ngày trên đường'), kind: 'mountain' },
  200: { title: tr('Hai trăm trang'), kind: 'mountain' },
  365: { title: tr('Một năm ròng rã'), kind: 'mountain' },
};

/** Which pages are landmarks: the 1st, 7th, 30th… page ever written. Map of day -> { count, title, kind }. */
export const milestonesOf = (notes) => {
  const marks = new Map();
  writtenDays(notes).forEach((day, i) => {
    const milestone = MILESTONES[i + 1];
    if (milestone) marks.set(day, { count: i + 1, ...milestone });
  });
  return marks;
};

/**
 * The days of the journey, newest first: today, then back to the first page (or `days` days, whichever is shorter).
 * Days with nothing written stay in as empty stepping stones. `more` says whether older days are left.
 */
export const journeyDays = (notes, today = dayKey(), { days = 21 } = {}) => {
  const pages = writtenByDay(notes);
  const first = writtenDays(notes)[0] ?? today;
  const span = Math.min(days, daysBetween(first, today) + 1);
  const list = Array.from({ length: span }, (_, i) => {
    const day = shiftDay(today, -i);
    const entry = pages.get(day) ?? null;
    return { day, entry, written: Boolean(entry), mood: entry?.mood ?? null, isToday: i === 0 };
  });
  return { days: list, more: daysBetween(first, today) + 1 > span, first };
};

/** Days in a row with a page, ending today (or yesterday, if today is not written yet). */
export const diaryStreak = (notes, today = dayKey()) => {
  const done = new Set(writtenDays(notes));
  let cursor = done.has(today) ? today : shiftDay(today, -1);
  let count = 0;
  while (done.has(cursor)) {
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
};

const longestRun = (days) => {
  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of days) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
};

/** Numbers for the top of the screen. `day` is which day of the journey today is (1 on the first page's day). */
export const journeyStats = (notes, today = dayKey()) => {
  const days = writtenDays(notes);
  return {
    total: days.length,
    streak: diaryStreak(notes, today),
    longest: longestRun(days),
    thisMonth: days.filter((d) => d.slice(0, 7) === today.slice(0, 7)).length,
    day: days.length ? daysBetween(days[0], today) + 1 : 0,
    first: days[0] ?? null,
  };
};

/** Pages from a week, two weeks, a month, 100 days or a year ago today: [{ ago, label, entry }], nearest first. */
export const memories = (notes, today = dayKey()) => {
  const pages = writtenByDay(notes);
  const WHEN = [
    [7, tr('Một tuần trước')],
    [14, tr('Hai tuần trước')],
    [30, tr('Một tháng trước')],
    [100, '100 ngày trước'],
    [365, tr('Một năm trước')],
  ];
  return WHEN.flatMap(([ago, label]) => (pages.has(shiftDay(today, -ago)) ? [{ ago, label, entry: pages.get(shiftDay(today, -ago)) }] : []));
};

/** The last seven days, oldest first: [{ day, weekday, mood }]. */
export const weekMoods = (notes, today = dayKey()) => {
  const pages = writtenByDay(notes);
  return Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(today, i - 6);
    return { day, weekday: WEEKDAYS[parseDay(day).getDay()], mood: pages.get(day)?.mood ?? null, written: pages.has(day) };
  });
};

// ---- gentle words ---------------------------------------------------------------------------------------------------------

export const PROMPTS = [
  tr('Điều làm mình mỉm cười hôm nay là…'),
  tr('Hôm nay mình biết ơn…'),
  tr('Một điều nhỏ mình học được hôm nay…'),
  tr('Khoảnh khắc mình muốn nhớ mãi là…'),
  tr('Hôm nay mình tự hào vì…'),
  tr('Người làm mình thấy ấm lòng hôm nay…'),
  tr('Nếu hôm nay là một bài hát thì nó là…'),
  tr('Điều mình mong chờ ngày mai…'),
  tr('Hôm nay mình đã chăm sóc bản thân bằng cách…'),
  tr('Một điều mình muốn nói với chính mình…'),
  tr('Món ngon nhất hôm nay…'),
  tr('Điều bất ngờ nhỏ xíu hôm nay…'),
];

/** Three prompts for a day, always the same ones for the same day. */
export const promptsFor = (day) => {
  const seed = [...day].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7);
  return [0, 1, 2].map((k) => PROMPTS[(seed + k * 5) % PROMPTS.length]);
};

/** What the Today card says. */
export const encouragement = ({ written, streak, total, hour }) => {
  if (written) return streak >= 3 ? tr('Ngày thứ {0} liền nhau rồi. Hành trình của bạn đẹp lắm.', streak) : tr('Hôm nay đã có thêm một dấu chân trên đường. Giỏi lắm!');
  if (total === 0) return tr('Hành trình nào cũng bắt đầu từ một bước nhỏ. Chỉ cần vài dòng thôi.');
  if (hour >= 20 && streak > 0) return tr('Giữ chuỗi {0} ngày nào. Chỉ cần vài dòng thôi.', streak);
  if (hour < 12) return tr('Buổi sáng nhẹ nhàng. Hôm nay bạn mong chờ điều gì?');
  if (hour < 18) return tr('Giữa ngày rồi. Thử ghi lại một khoảnh khắc nhỏ nhé.');
  return tr('Tối rồi. Kể mình nghe hôm nay thế nào nhé.');
};

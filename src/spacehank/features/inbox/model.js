import { tr } from '../../core/i18n/lang.js';
import { CATEGORIES, parseEntry, parseAmount } from '../wallet/model.js';
import { dayKey } from '../habits/model.js';

// The Inbox as plain functions: guessing what a quickly typed line is (a task, money spent, a diary line or a note), and
// reading a due date out of it ("mai", "thứ sáu", "12/11", "tomorrow"). Nothing here saves anything.

export const KINDS = [
  { id: 'task', label: tr('Task') },
  { id: 'expense', label: tr('Spending') },
  { id: 'income', label: tr('Income') },
  { id: 'note', label: tr('Note') },
  { id: 'diary', label: tr('Diary') },
];
export const kindLabel = (id) => KINDS.find((k) => k.id === id)?.label ?? '';

const pad = (n) => String(n).padStart(2, '0');
const addDays = (date, n) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
};

// a word on its own: the neighbours are the edge of the text, a space or punctuation (\b does not know Vietnamese letters)
const word = (pattern) => new RegExp(`(^|[\\s,.;:!?()])(?:${pattern})(?=$|[\\s,.;:!?()])`, 'i');

const WEEKDAYS = [
  { n: 1, re: word('thứ hai|thu hai|t2|monday|mon') },
  { n: 2, re: word('thứ ba|thu ba|t3|tuesday|tue') },
  { n: 3, re: word('thứ tư|thu tu|t4|wednesday|wed') },
  { n: 4, re: word('thứ năm|thu nam|t5|thursday|thu') },
  { n: 5, re: word('thứ sáu|thu sau|t6|friday|fri') },
  { n: 6, re: word('thứ bảy|thu bay|t7|saturday|sat') },
  { n: 0, re: word('chủ nhật|chu nhat|cn|sunday|sun') },
];

/**
 * A day read out of a sentence, as YYYY-MM-DD, or '' when none is said. Understands today, tomorrow, the day after, a
 * weekday (the next one that is not today), and 12/11 or 12/11/2026 (this year, or next when it has passed).
 */
export const parseDue = (text, now = new Date()) => {
  const source = String(text ?? '');
  const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (word('hôm nay|hom nay|today|tonight|tối nay').test(source)) return key(now);
  if (word('ngày mai|ngay mai|mai|tomorrow|tmr').test(source)) return key(addDays(now, 1));
  if (word('ngày kia|ngay kia|day after tomorrow').test(source)) return key(addDays(now, 2));

  const date = /(^|[\s,.;:(])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?=$|[\s,.;:)])/.exec(source);
  if (date) {
    const day = Number(date[2]);
    const month = Number(date[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      let year = date[4] ? Number(date[4]) : now.getFullYear();
      let picked = new Date(year, month - 1, day);
      if (!date[4] && picked < new Date(now.getFullYear(), now.getMonth(), now.getDate())) picked = new Date(++year, month - 1, day);
      if (picked.getMonth() === month - 1) return key(picked); // 31/02 is no day at all
    }
  }

  for (const { n, re } of WEEKDAYS) {
    if (!re.test(source)) continue;
    const ahead = (n - now.getDay() + 7) % 7 || 7;
    return key(addDays(now, ahead));
  }
  return '';
};

// the start of a line, with a letter (any language) or the end after it: the word-edge of a regex only knows ASCII letters
const starts = (list) => new RegExp(String.raw`^\s*(?:${list})(?=$|[^\p{L}])`, 'iu');
const TASK_MARK = starts(String.raw`\[ ?\]|-\s*\[ ?\]|todo|to-do|task|việc|nhắc|nhớ|cần|phải|remind|need to|must|don't forget|dont forget`);
const TASK_VERB = starts('làm|gọi|nộp|gửi|đặt|họp|hẹn|hoàn thành|mua|call|send|buy|submit|finish|book|schedule|email');
const DIARY_START = starts('nhật ký|dear diary|hôm nay (?:mình|tôi|em|tớ|t)|today i|today was');
const EXPLICIT_MONEY = /\d\s*(?:k|nghìn|ngàn|tr|triệu|m|đ|vnd|vnđ|₫|đồng|dong)(?=$|[^\p{L}])/iu;

const clean = (text) =>
  String(text ?? '')
    .replace(/^\s*(?:-\s*)?(?:\[ ?\]\s*|todo:?\s*|to-do:?\s*|task:?\s*|việc:?\s*)/i, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * A guess at what a line is, for filing it with one tap: { kind, title, due, amount, category }. Money needs an amount that
 * looks like money (45k, 1.5tr, 30.000đ, or a big number beside a word like "cơm"), so "meeting at 3" stays a task.
 * Long or many-lined text is a note. A guess is only a first suggestion: the person can always choose another.
 */
export const classify = (text, now = new Date()) => {
  const raw = String(text ?? '').trim();
  const blank = { kind: 'note', title: '', due: '', amount: 0, category: '' };
  if (!raw) return blank;
  const firstLine = raw.split(/\n/)[0];
  const long = raw.length > 220 || raw.split(/\n/).filter((l) => l.trim()).length > 3;
  if (long) return { ...blank, title: clean(firstLine).slice(0, 80) };

  const entry = parseEntry(raw);
  const { amount } = parseAmount(raw);
  const category = entry.category;
  const looksLikeMoney = amount > 0 && (EXPLICIT_MONEY.test(raw) || (amount >= 1000 && category !== 'other'));
  if (looksLikeMoney && !TASK_MARK.test(raw)) {
    return { kind: entry.type, title: entry.note || clean(raw).slice(0, 80), due: '', amount: entry.amount, category };
  }
  if (DIARY_START.test(raw)) return { ...blank, kind: 'diary', title: clean(raw).slice(0, 80) };
  const due = parseDue(raw, now);
  if (TASK_MARK.test(raw) || TASK_VERB.test(raw) || due) return { ...blank, kind: 'task', title: clean(raw).slice(0, 140), due };
  return { ...blank, title: clean(firstLine).slice(0, 80) };
};

/** A new inbox record. `guess` is what classify (or the AI) made of it. */
export const newInboxItem = (text, { source = 'typed', guess, now = new Date() } = {}) => {
  const made = guess ?? classify(text, now);
  return { text: String(text).trim().slice(0, 4000), source, kind: made.kind, due: made.due ?? '', amount: made.amount ?? 0, category: made.category ?? '' };
};

/** A receipt that was read (see the server's /api/ai/receipt) as the line that goes to the Inbox. */
export const receiptItem = ({ amount, merchant, date, category }, now = new Date()) => {
  const text = [merchant || tr('Receipt'), amount ? `${new Intl.NumberFormat('vi-VN').format(amount)}₫` : ''].filter(Boolean).join(' ');
  const on = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dayKey(now);
  return { ...newInboxItem(text, { source: 'receipt', guess: { kind: 'expense', title: merchant || tr('Receipt'), due: '', amount, category } }), day: on };
};

export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? '';

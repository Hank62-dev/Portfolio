import { tr } from '../lang.js';
// The Wallet as plain functions: reading "ăn trưa 45k" into an entry, and the sums behind the charts.

export const CATEGORIES = [
  { id: 'food', label: tr('Food & drink'), icon: 'utensils', hue: 22, words: ['ăn', 'cơm', 'phở', 'bún', 'bánh', 'trà sữa', 'trà', 'cafe', 'cà phê', 'coffee', 'nhậu', 'bữa', 'lunch', 'dinner', 'breakfast', 'nước', 'quán', 'pizza', 'kem'] },
  { id: 'transport', label: tr('Transport'), icon: 'bus', hue: 205, words: ['grab', 'xe', 'xăng', 'gửi xe', 'taxi', 'bus', 'buýt', 'vé xe', 'đi lại', 'be ', 'gojek', 'tàu', 'máy bay'] },
  { id: 'home', label: tr('Home & bills'), icon: 'home', hue: 150, words: ['nhà', 'trọ', 'điện', 'nước sinh hoạt', 'wifi', 'internet', 'điện thoại', 'sim', 'gas'] },
  { id: 'study', label: tr('Study'), icon: 'study', hue: 265, words: ['sách', 'học', 'khóa', 'khoá', 'course', 'học phí', 'in ấn', 'photo', 'udemy', 'văn phòng phẩm'] },
  { id: 'fun', label: tr('Fun'), icon: 'fun', hue: 330, words: ['phim', 'game', 'netflix', 'spotify', 'giải trí', 'du lịch', 'karaoke', 'concert', 'youtube', 'steam'] },
  { id: 'health', label: tr('Health'), icon: 'health', hue: 0, words: ['thuốc', 'khám', 'gym', 'bác sĩ', 'răng', 'vitamin', 'y tế'] },
  { id: 'shopping', label: tr('Shopping'), icon: 'bag', hue: 48, words: ['mua', 'quần', 'áo', 'giày', 'shopee', 'lazada', 'tiki', 'đồ', 'túi'] },
  { id: 'income', label: tr('Income'), icon: 'cash', hue: 140, words: [] },
  { id: 'other', label: tr('Other'), icon: 'other', hue: 220, words: [] },
];

export const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

const UNIT = { k: 1e3, nghìn: 1e3, ngàn: 1e3, tr: 1e6, triệu: 1e6, m: 1e6 };

/**
 * Finds an amount in text and returns { amount, rest } (rest is the text without it). Understands 45k, 45 nghìn,
 * 1.5tr, 1,5 triệu, 1tr5, 2 triệu, 30000 and 30.000. Returns amount 0 when there is none.
 */
export const parseAmount = (text) => {
  const source = String(text ?? '');
  // 1tr5 means 1.5 million
  const short = /(\d+)\s*(tr|triệu|m)\s*(\d)\b/i.exec(source);
  if (short) return { amount: Math.round(Number(`${short[1]}.${short[3]}`) * 1e6), rest: source.replace(short[0], ' ') };

  const unit = /(\d+(?:[.,]\d+)?)\s*(k|nghìn|ngàn|tr|triệu|m)\b/i.exec(source);
  if (unit) return { amount: Math.round(Number(unit[1].replace(',', '.')) * UNIT[unit[2].toLowerCase()]), rest: source.replace(unit[0], ' ') };

  const plain = /\d{1,3}(?:[.,]\d{3})+|\d+/.exec(source);
  if (plain) return { amount: Number(plain[0].replace(/[.,]/g, '')), rest: source.replace(plain[0], ' ') };
  return { amount: 0, rest: source };
};

const INCOME = /(^|\s)(lương|thưởng|nhận|thu nhập|được cho|income|salary|bonus|\+)/i;

/** "ăn trưa 45k" → { type, amount, category, note }. The category comes from keywords and can be changed after. */
export const parseEntry = (text) => {
  const { amount, rest } = parseAmount(text);
  const clean = rest.replace(/\s+/g, ' ').replace(/^[\s,:;+-]+|[\s,:;+-]+$/g, '');
  const type = INCOME.test(` ${text}`) ? 'income' : 'expense';
  const lower = ` ${clean.toLowerCase()} `;
  const found = type === 'income' ? CATEGORIES.find((c) => c.id === 'income') : CATEGORIES.find((c) => c.words.some((w) => lower.includes(w)));
  return { type, amount, category: (found ?? categoryOf('other')).id, note: clean ? clean[0].toUpperCase() + clean.slice(1) : '' };
};

export const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
export const dayOf = (time) => {
  const d = new Date(time);
  return `${monthKey(d)}-${String(d.getDate()).padStart(2, '0')}`;
};
/**
 * How the balance of a month moved, day by day: the money in minus the money out up to the end of each day, from the 1st to
 * `today` (or to the last day, for a month that is over). A list of numbers for a small line.
 */
export const balanceSeries = (entries, key, today = new Date()) => {
  const [y, m] = key.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const upTo = monthKey(today) === key ? today.getDate() : lastDay;
  const net = Array.from({ length: lastDay }, () => 0);
  for (const e of entries) {
    if (monthKey(new Date(e.at)) !== key) continue;
    net[new Date(e.at).getDate() - 1] += e.type === 'income' ? e.amount : -e.amount;
  }
  let running = 0;
  return net.slice(0, upTo).map((n) => (running += n));
};

export const inMonth = (entries, key) => entries.filter((e) => monthKey(new Date(e.at)) === key);

/** Totals for a month's entries: money in and out, each category's share, and spending per day. */
export const summarize = (entries) => {
  const spent = entries.filter((e) => e.type === 'expense');
  const income = entries.filter((e) => e.type === 'income');
  const spentTotal = spent.reduce((n, e) => n + e.amount, 0);
  const incomeTotal = income.reduce((n, e) => n + e.amount, 0);

  const byCat = new Map();
  for (const e of spent) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
  const byCategory = [...byCat.entries()]
    .map(([category, total]) => ({ category, total, pct: spentTotal ? Math.round((total / spentTotal) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);

  const byDayMap = new Map();
  for (const e of spent) byDayMap.set(dayOf(e.at), (byDayMap.get(dayOf(e.at)) ?? 0) + e.amount);
  const byDay = [...byDayMap.entries()].map(([day, total]) => ({ day, total })).sort((a, b) => a.day.localeCompare(b.day));

  return { spent: spentTotal, income: incomeTotal, balance: incomeTotal - spentTotal, byCategory, byDay };
};

/** 1 500 000 → "1.5tr", 45 000 → "45k": short enough for a chart. */
export const compact = (n) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}${+(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}tr`;
  if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3)}k`;
  return `${sign}${abs}`;
};

export const formatVnd = (n) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;

/** CSV text for a list of entries (opens in any spreadsheet). */
export const toCsv = (entries) =>
  ['date,type,category,amount,note', ...entries.map((e) => [new Date(e.at).toISOString().slice(0, 10), e.type, e.category, e.amount, `"${(e.note ?? '').replace(/"/g, '""')}"`].join(','))].join('\n');

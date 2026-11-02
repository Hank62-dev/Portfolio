import { describe, expect, it } from 'vitest';
import { compact, formatVnd, inMonth, monthKey, parseAmount, parseEntry, summarize, toCsv } from './model';

describe('parseAmount', () => {
  it('reads Vietnamese shorthand', () => {
    expect(parseAmount('cà phê 30k').amount).toBe(30000);
    expect(parseAmount('45 nghìn').amount).toBe(45000);
    expect(parseAmount('2 triệu').amount).toBe(2000000);
    expect(parseAmount('1.5tr').amount).toBe(1500000);
    expect(parseAmount('1,5 triệu').amount).toBe(1500000);
    expect(parseAmount('1tr5').amount).toBe(1500000);
  });
  it('reads plain numbers with or without thousand separators', () => {
    expect(parseAmount('xăng 30000').amount).toBe(30000);
    expect(parseAmount('xăng 30.000').amount).toBe(30000);
    expect(parseAmount('xăng 1,250,000').amount).toBe(1250000);
  });
  it('is zero without a number, and hands back the rest of the text', () => {
    expect(parseAmount('không có tiền').amount).toBe(0);
    expect(parseAmount('ăn trưa 45k').rest.trim()).toBe('ăn trưa');
  });
});

describe('parseEntry', () => {
  it('turns a sentence into an expense with a category and a tidy note', () => {
    expect(parseEntry('ăn trưa 45k')).toEqual({ type: 'expense', amount: 45000, category: 'food', note: 'Ăn trưa' });
    expect(parseEntry('grab đi học 38k')).toMatchObject({ amount: 38000, category: 'transport' });
    expect(parseEntry('mua sách 120k')).toMatchObject({ amount: 120000, category: 'study' });
    expect(parseEntry('mua áo 300k')).toMatchObject({ category: 'shopping' });
    expect(parseEntry('netflix 260k')).toMatchObject({ category: 'fun' });
  });
  it('recognises money coming in', () => {
    expect(parseEntry('lương tháng 10 8tr')).toMatchObject({ type: 'income', amount: 8000000, category: 'income' });
    expect(parseEntry('nhận 500k từ mẹ')).toMatchObject({ type: 'income', amount: 500000 });
  });
  it('falls back to Other', () => {
    expect(parseEntry('linh tinh 10k').category).toBe('other');
  });
});

describe('summarize', () => {
  const at = (day, h = 12) => new Date(2026, 10, day, h).getTime();
  const entries = [
    { type: 'expense', amount: 45000, category: 'food', at: at(1) },
    { type: 'expense', amount: 55000, category: 'food', at: at(1, 18) },
    { type: 'expense', amount: 100000, category: 'transport', at: at(2) },
    { type: 'income', amount: 500000, category: 'income', at: at(2) },
    { type: 'expense', amount: 999, category: 'food', at: new Date(2026, 9, 31).getTime() },
  ];

  it('picks out a month', () => {
    expect(inMonth(entries, '2026-11')).toHaveLength(4);
    expect(monthKey(new Date(2026, 10, 2))).toBe('2026-11');
  });
  it('adds up money in and out and the share of each category', () => {
    const s = summarize(inMonth(entries, '2026-11'));
    expect(s).toMatchObject({ spent: 200000, income: 500000, balance: 300000 });
    expect(s.byCategory).toEqual([
      { category: 'food', total: 100000, pct: 50 },
      { category: 'transport', total: 100000, pct: 50 },
    ]);
    expect(s.byDay).toEqual([
      { day: '2026-11-01', total: 100000 },
      { day: '2026-11-02', total: 100000 },
    ]);
  });
  it('copes with nothing', () => {
    expect(summarize([])).toEqual({ spent: 0, income: 0, balance: 0, byCategory: [], byDay: [] });
  });
});

describe('formatting', () => {
  it('shortens amounts for charts', () => {
    expect([45000, 1500000, 12000000, 800, -250000].map(compact)).toEqual(['45k', '1.5tr', '12tr', '800', '-250k']);
  });
  it('writes dong the Vietnamese way', () => {
    expect(formatVnd(1250000)).toMatch(/^1\.250\.000\s?₫$/);
  });
  it('exports a CSV with quoted notes', () => {
    const csv = toCsv([{ type: 'expense', category: 'food', amount: 45000, note: 'Phở "đặc biệt"', at: new Date(2026, 10, 2, 12).getTime() }]);
    expect(csv.split('\n')[1]).toBe('2026-11-02,expense,food,45000,"Phở ""đặc biệt"""');
  });
});

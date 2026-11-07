import { describe, expect, it } from 'vitest';
import { classify, newInboxItem, parseDue, receiptItem } from './model';

// Saturday 7 November 2026
const NOW = new Date(2026, 10, 7, 10, 0);

describe('reading a day out of a sentence', () => {
  it('knows today, tomorrow and the day after, in both languages', () => {
    expect(parseDue('nộp báo cáo hôm nay', NOW)).toBe('2026-11-07');
    expect(parseDue('nộp báo cáo mai', NOW)).toBe('2026-11-08');
    expect(parseDue('submit it tomorrow', NOW)).toBe('2026-11-08');
    expect(parseDue('họp ngày kia', NOW)).toBe('2026-11-09');
  });

  it('picks the next weekday that is not today', () => {
    expect(parseDue('họp thứ hai', NOW)).toBe('2026-11-09');
    expect(parseDue('gọi mẹ chủ nhật', NOW)).toBe('2026-11-08');
    expect(parseDue('review on Saturday', NOW)).toBe('2026-11-14');
    expect(parseDue('nộp bài T6', NOW)).toBe('2026-11-13');
  });

  it('reads 12/11 and 12/11/2027, and rolls a past day to next year', () => {
    expect(parseDue('thi 12/11', NOW)).toBe('2026-11-12');
    expect(parseDue('thi 12/11/2027', NOW)).toBe('2027-11-12');
    expect(parseDue('sinh nhật 1/3', NOW)).toBe('2027-03-01');
    expect(parseDue('nothing on 31/02', NOW)).toBe('');
  });

  it('does not find a day inside another word', () => {
    expect(parseDue('Mai Anh gửi file', NOW)).toBe('2026-11-08'); // "Mai" on its own is a word: a known limit, the person can change it
    expect(parseDue('mailing list', NOW)).toBe('');
    expect(parseDue('a note about nothing', NOW)).toBe('');
  });
});

describe('guessing what a line is', () => {
  it('takes money with a unit as spending, and a salary as income', () => {
    expect(classify('ăn trưa 45k', NOW)).toMatchObject({ kind: 'expense', amount: 45000, category: 'food' });
    expect(classify('grab đi học 38.000đ', NOW)).toMatchObject({ kind: 'expense', amount: 38000, category: 'transport' });
    expect(classify('nhận lương 6tr', NOW)).toMatchObject({ kind: 'income', amount: 6000000 });
    expect(classify('mua sữa 30k', NOW)).toMatchObject({ kind: 'expense', amount: 30000 });
  });

  it('does not take a plain small number for money', () => {
    expect(classify('họp lúc 3 giờ chiều', NOW).kind).toBe('task');
    expect(classify('ghi nhớ: chương 4 trang 120', NOW).kind).toBe('note');
  });

  it('takes a to-do marker, a verb or a day as a task, with its due date', () => {
    expect(classify('todo: gửi hợp đồng', NOW)).toMatchObject({ kind: 'task', title: 'gửi hợp đồng', due: '' });
    expect(classify('nộp báo cáo mai', NOW)).toMatchObject({ kind: 'task', due: '2026-11-08' });
    expect(classify('remind me to call Linh', NOW).kind).toBe('task');
    expect(classify('cần mua pin 100k', NOW).kind).toBe('task'); // a marker wins over the money
    expect(classify('mua pin', NOW).kind).toBe('task');
  });

  it('takes a diary opening as the diary, and the rest as a note', () => {
    expect(classify('Hôm nay mình thấy nhẹ nhõm hơn hẳn', NOW).kind).toBe('diary');
    expect(classify('Dear diary, it rained all day', NOW).kind).toBe('diary');
    expect(classify('an idea for the landing page: show the floor first', NOW).kind).toBe('note');
  });

  it('keeps long text as a note, with its first line as the title', () => {
    const long = `Meeting notes\n${'line of talk\n'.repeat(6)}`;
    expect(classify(long, NOW)).toMatchObject({ kind: 'note', title: 'Meeting notes' });
    expect(classify('x'.repeat(300), NOW).kind).toBe('note');
  });

  it('says note for nothing', () => {
    expect(classify('   ', NOW)).toMatchObject({ kind: 'note', title: '' });
  });
});

describe('an inbox item', () => {
  it('carries the text and what it was guessed to be', () => {
    expect(newInboxItem('  cà phê 30k  ', { now: NOW })).toEqual({ text: 'cà phê 30k', source: 'typed', kind: 'expense', due: '', amount: 30000, category: 'food' });
  });

  it('can carry a guess made elsewhere (the AI, a receipt)', () => {
    const item = newInboxItem('Pay rent', { source: 'voice', guess: { kind: 'task', due: '2026-11-10' } });
    expect(item).toMatchObject({ source: 'voice', kind: 'task', due: '2026-11-10', amount: 0 });
  });

  it('makes a spending line from a receipt, on the day printed or today', () => {
    const read = { amount: 123456, merchant: 'Highlands', date: '2026-11-05', category: 'food' };
    expect(receiptItem(read, NOW)).toMatchObject({ source: 'receipt', kind: 'expense', amount: 123456, category: 'food', day: '2026-11-05' });
    expect(receiptItem({ ...read, date: '' }, NOW).day).toBe('2026-11-07');
    expect(receiptItem({ ...read, merchant: '' }, NOW).text).toContain('123');
  });
});

import { describe, expect, it } from 'vitest';
import { dayPaper, firstSentence, partOfDay } from './paper';

const NOW = new Date(2026, 10, 21, 21, 0);
const at = (h) => new Date(2026, 10, 21, h).getTime();

describe('the day paper', () => {
  it('knows the part of the day', () => {
    expect(partOfDay(new Date(2026, 10, 21, 7))).toBe('morning');
    expect(partOfDay(new Date(2026, 10, 21, 13))).toBe('midday');
    expect(partOfDay(new Date(2026, 10, 21, 22))).toBe('evening');
    expect(partOfDay(new Date(2026, 10, 21, 2))).toBe('evening');
  });

  it('cuts the first sentence', () => {
    expect(firstSentence('Hôm nay trời mưa. Mình ở nhà.')).toBe('Hôm nay trời mưa.');
    expect(firstSentence('')).toBe('');
    expect(firstSentence('a'.repeat(200), 20)).toHaveLength(20);
  });

  it('leads with the task finished last and fills its columns', () => {
    const paper = dayPaper({
      now: NOW,
      cards: [
        { id: 1, title: 'Nộp báo cáo', column: 'done', updatedAt: at(10) },
        { id: 2, title: 'Sửa bug', column: 'done', updatedAt: at(16) },
        { id: 3, title: 'Hôm qua', column: 'done', updatedAt: at(10) - 864e5 },
        { id: 4, title: 'Chưa xong', column: 'backlog', updatedAt: at(12) },
      ],
      habits: [
        { name: 'Đọc', days: ['2026-11-21'] },
        { name: 'Chạy', days: [] },
      ],
      entries: [
        { type: 'expense', amount: 45000, note: 'Ăn trưa', at: at(12) },
        { type: 'expense', amount: 120000, note: 'Sách', at: at(15) },
        { type: 'income', amount: 500000, at: at(9) },
      ],
      notes: [{ day: '2026-11-21', updatedAt: 1, text: '# 21/11\n\nMột ngày dài. Nhưng vui.', mood: 4 }],
    });
    expect(paper.headline).toBe('Sửa bug');
    expect(paper.done).toEqual(['Sửa bug', 'Nộp báo cáo']);
    expect(paper.habits).toEqual({ done: 1, total: 2, names: ['Đọc'] });
    expect(paper.money).toEqual({ total: 165000, count: 2, biggest: { amount: 120000, note: 'Sách' } });
    expect(paper.quote).toBe('Một ngày dài.');
    expect(paper.mood).toBe(4);
  });

  it('has no headline on a quiet day', () => {
    expect(dayPaper({ now: NOW }).headline).toBeNull();
  });
});

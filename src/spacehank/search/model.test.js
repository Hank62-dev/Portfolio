import { describe, expect, it } from 'vitest';
import { lifeDocs, looksLikeQuestion, searchEverything } from './model';

const NOW = new Date(2026, 10, 7, 10, 0);
const data = {
  notes: [
    { id: 'n1', text: '# Kế hoạch ra mắt\nplan the launch of the podcast', createdAt: 1, updatedAt: 1 },
    { id: 'n2', day: '2026-11-06', text: '# Friday\n\n#journal\n\nWalked by the river', createdAt: 2, updatedAt: 2 },
  ],
  cards: [{ id: 'c1', title: 'Fix the checkout flow', column: 'doing', due: '2026-11-08', labels: ['bug'] }],
  entries: [
    { id: 'e1', type: 'expense', amount: 45000, category: 'food', note: 'Phở bò', at: new Date(2026, 10, 6, 12).getTime() },
    { id: 'e2', type: 'expense', amount: 100000, category: 'food', note: 'Cơm tối', at: new Date(2026, 9, 20, 12).getTime() },
  ],
  memos: [{ id: 'm1', title: 'Ideas', transcript: 'Thử làm một podcast về học tiếng Anh', at: 5 }],
  habits: [{ id: 'h1', name: 'Đọc sách', days: ['2026-11-07', '2026-11-06'] }],
  courses: [{ id: 'k1', name: 'Toán rời rạc', exams: [{ id: 'x', title: 'Midterm', at: new Date(2026, 10, 12).getTime() }], deadlines: [] }],
};

describe('searching everything', () => {
  it('finds every kind of thing, whatever the accents', () => {
    const kinds = (q) => searchEverything(data, q).map((r) => r.kind);
    expect(kinds('pho')).toEqual(['spending']);
    expect(kinds('doc sach')).toEqual(['habit']);
    expect(kinds('toan roi rac')).toEqual(['study']);
    expect(kinds('checkout')).toEqual(['task']);
    expect(kinds('midterm')).toEqual(['study']);
  });

  it('finds the same word in notes and in voice memos', () => {
    const found = searchEverything(data, 'podcast');
    expect(found.map((r) => r.kind).sort()).toEqual(['memo', 'note']);
    expect(found.find((r) => r.kind === 'note')).toMatchObject({ tab: 'notes', open: 'n1' });
  });

  it('sends a diary page to the diary, and says nothing for nothing', () => {
    expect(searchEverything(data, 'river')[0]).toMatchObject({ kind: 'note', tab: 'diary' });
    expect(searchEverything(data, '')).toEqual([]);
    expect(searchEverything(data, 'zzzz')).toEqual([]);
  });

  it('keeps to the limit', () => {
    expect(searchEverything({ cards: Array.from({ length: 20 }, (_, i) => ({ id: `${i}`, title: 'same thing', column: 'backlog' })) }, 'same', 5)).toHaveLength(5);
  });
});

describe('knowing a question', () => {
  it('needs a few words, and a question mark or a question word', () => {
    expect(looksLikeQuestion('how much did I spend on food last month')).toBe(true);
    expect(looksLikeQuestion('tháng này mình tiêu bao nhiêu cho ăn uống?')).toBe(true);
    expect(looksLikeQuestion('podcast')).toBe(false);
    expect(looksLikeQuestion('go to wallet')).toBe(false);
  });
});

describe('the facts handed to the AI', () => {
  it('summarises tasks, spending, habits and study, then the notes that match', () => {
    const docs = lifeDocs(data, 'podcast launch', NOW);
    const titles = docs.map((d) => d.title);
    expect(titles).toEqual(expect.arrayContaining(['Open tasks', 'Spending', 'Habits', 'Study deadlines']));
    expect(docs.find((d) => d.title === 'Spending').text).toContain('2026-11');
    expect(docs.some((d) => d.text.includes('plan the launch'))).toBe(true);
    expect(docs.length).toBeLessThanOrEqual(8);
  });

  it('keeps the demo data out, and every piece under the size the server accepts', () => {
    const demo = lifeDocs({ cards: [{ id: 'a', title: 'Demo', column: 'backlog', sample: true }], habits: [{ id: 'b', name: 'Demo', days: [], sample: true }] }, 'anything at all', NOW);
    expect(demo).toEqual([]);
    const huge = lifeDocs({ cards: Array.from({ length: 400 }, (_, i) => ({ id: `${i}`, title: `a long task title number ${i}`, column: 'backlog' })) }, 'task list', NOW);
    expect(huge[0].text.length).toBeLessThanOrEqual(1700);
  });
});

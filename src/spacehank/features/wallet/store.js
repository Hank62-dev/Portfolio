import { createCollection } from '../../core/collections';

// entries: { id, type: 'expense' | 'income', amount (VND), category, note, at (ms) }
export const entries = createCollection('expenses', { order: (a, b) => b.at - a.at });
// budgets: { id: '<category>', category, amount } , one monthly limit per category
export const budgets = createCollection('budgets', { order: (a, b) => a.category.localeCompare(b.category) });

/** A month of believable entries to try the charts with. */
export const sampleEntries = (now = new Date()) => {
  const at = (day, h = 12) => new Date(now.getFullYear(), now.getMonth(), Math.min(day, 28), h).getTime();
  const e = (day, type, category, amount, note) => ({ id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now(), type, category, amount, note, at: at(day), sample: true });
  return [
    e(1, 'income', 'income', 6000000, 'Allowance'),
    e(1, 'expense', 'home', 1500000, 'Room'),
    e(2, 'expense', 'food', 45000, 'Ăn trưa'),
    e(3, 'expense', 'transport', 38000, 'Grab đi học'),
    e(4, 'expense', 'food', 30000, 'Cà phê'),
    e(5, 'expense', 'study', 120000, 'Sách'),
    e(7, 'expense', 'fun', 260000, 'Netflix'),
    e(8, 'expense', 'food', 55000, 'Phở'),
    e(10, 'expense', 'shopping', 300000, 'Áo'),
    e(12, 'expense', 'food', 42000, 'Cơm tối'),
    e(14, 'expense', 'health', 90000, 'Thuốc'),
    e(15, 'expense', 'transport', 120000, 'Xăng'),
  ];
};

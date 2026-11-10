import { createCollection } from '../../core/collections';

export const missions = createCollection('tasks', { order: (a, b) => a.order - b.order });

/** A few cards so the board can be tried straight away. */
export const sampleCards = () => {
  const card = (title, column, order, extra = {}) => ({
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    title,
    notes: '',
    column,
    order,
    due: '',
    labels: [],
    checklist: [],
    agent: '',
    sample: true,
    ...extra,
  });
  const day = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  return [
    card('Write the case study for the portfolio', 'backlog', 0, { labels: ['writing'], due: day(5) }),
    card('Compare vector stores for the knowledge base', 'backlog', 1, { labels: ['research'] }),
    card('Tidy the spacing scale', 'doing', 0, { labels: ['design'], checklist: [{ id: 'a', text: 'List every value', done: true }, { id: 'b', text: 'Merge near-duplicates', done: true }, { id: 'c', text: 'Check three widths', done: false }] }),
    card('Fix the checkout flow', 'doing', 1, { labels: ['bug'], due: day(-1) }),
    card('Set up the deploy checks', 'done', 0, { labels: ['ops'] }),
  ];
};

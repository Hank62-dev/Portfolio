import { createCollection } from '../../core/collections';

// inbox: { id, text, source: 'typed' | 'voice' | 'receipt' | 'share', kind, due, amount, category, day? }
// Whatever was captured in a hurry, waiting to be filed as a task, a spending line, a note or a diary line.
export const inbox = createCollection('inbox', { order: (a, b) => b.createdAt - a.createdAt });

import { createCollection } from '../collections';

// memo: { id, title, transcript, duration (s), blob, mime, peaks: number[] (0..1), at }
export const memos = createCollection('memos', { order: (a, b) => b.at - a.at });

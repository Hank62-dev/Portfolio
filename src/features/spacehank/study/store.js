import { createCollection } from '../collections';
import { newFlashcard } from './model';

// courses: { id, name, code, hue, exams: [{ id, title, at }], deadlines: [{ id, title, at, done }] }
export const courses = createCollection('courses', { order: (a, b) => a.createdAt - b.createdAt });
// flashcards: see newFlashcard in ./model
export const flashcards = createCollection('cards', { order: (a, b) => a.due - b.due });

const stamp = () => ({ createdAt: Date.now(), updatedAt: Date.now() });

/** A course with an exam, two deadlines and a handful of cards, so every part of the hub has something in it. */
export const sampleStudy = (now = Date.now()) => {
  const day = 86400000;
  const course = { id: crypto.randomUUID(), ...stamp(), name: 'Database Systems', code: 'DBI202', hue: 265, sample: true, exams: [{ id: crypto.randomUUID(), title: 'Final exam', at: now + 9 * day }], deadlines: [{ id: crypto.randomUUID(), title: 'Lab 3: normalisation', at: now + 2 * day, done: false }, { id: crypto.randomUUID(), title: 'Project proposal', at: now + 5 * day, done: false }] };
  const card = (front, back) => ({ id: crypto.randomUUID(), ...stamp(), ...newFlashcard(front, back, course.id, now), sample: true });
  return {
    course,
    cards: [
      card('What does 1NF require?', 'Every column holds a single, atomic value, and rows are unique.'),
      card('What is a primary key?', 'A column (or set) that identifies each row uniquely and is never null.'),
      card('Why add an index?', 'To find rows faster; the price is slower writes and more storage.'),
      card('What does ACID stand for?', 'Atomicity, Consistency, Isolation, Durability.'),
      card('Difference between INNER and LEFT JOIN?', 'INNER keeps only matching rows; LEFT also keeps unmatched rows from the left table.'),
    ],
  };
};

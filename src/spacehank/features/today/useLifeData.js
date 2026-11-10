import { useEffect, useMemo } from 'react';
import { courses } from '../study/store';
import { habits } from '../habits/store';
import { inbox } from '../inbox/store';
import { memos } from '../memos/store';
import { missions } from '../missions/store';
import { calendar } from '../calendar/store';
import { loadNotes, notesStore } from '../notes/library';
import { useStore } from '../../core/store';
import { entries } from '../wallet/store';

/** Reads every kept collection into memory (each does nothing if it is already loaded). */
export const loadLife = () => Promise.all([missions.load(), habits.load(), entries.load(), courses.load(), inbox.load(), memos.load(), loadNotes()]);

/** Everything the Today screen, the search and the review read from, as it is right now (no subscription). */
export const lifeSnapshot = () => ({
  cards: missions.store.get().items,
  habits: habits.store.get().items,
  entries: entries.store.get().items,
  courses: courses.store.get().items,
  inbox: inbox.store.get().items,
  memos: memos.store.get().items,
  notes: notesStore.get().notes,
  events: calendar.get().events, // whatever Google events were last loaded (none until the Calendar has been opened)
});

/** The same, kept up to date: the screen redraws when any of it changes. */
export const useLifeData = () => {
  useEffect(() => {
    void loadLife();
  }, []);
  const cards = useStore(missions.store, (s) => s.items);
  const habitList = useStore(habits.store, (s) => s.items);
  const money = useStore(entries.store, (s) => s.items);
  const courseList = useStore(courses.store, (s) => s.items);
  const inboxList = useStore(inbox.store, (s) => s.items);
  const memoList = useStore(memos.store, (s) => s.items);
  const notes = useStore(notesStore, (s) => s.notes);
  return useMemo(() => ({ cards, habits: habitList, entries: money, courses: courseList, inbox: inboxList, memos: memoList, notes }), [cards, habitList, money, courseList, inboxList, memoList, notes]);
};

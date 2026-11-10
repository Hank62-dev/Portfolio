import { habits, sampleHabits } from '../../features/habits/store';
import { seedDemoLog } from '../../features/focus/log';
import { storage } from '../../core/storage';
import { courses, flashcards, sampleStudy } from '../../features/study/store';

// The first time someone opens the demo, the few tabs a guest may use get a little made-up data so there is something to try:
// two habits, a course with three cards, and a fortnight of focus sessions. Everything else in the workspace is the owner's own
// and stays private (see GUEST_TABS in ./mode). A marker in localStorage says it was done; "Reset demo" clears the demo database.
const MARK = 'hank62.demo.seeded.v2';
const EXTRA_KEYS = ['hank62.demo.docs', 'hank62.demo.ai', 'spacehank.constellation', 'hank62.demo.focus.log', 'hank62.demo.seeded.v1', 'hank62.demo.diary.v1'];

const seeded = () => {
  try {
    return Boolean(localStorage.getItem(MARK));
  } catch {
    return false;
  }
};

/** Fills the demo database once. Safe to call every time; it does nothing when the demo has been set up already. */
let inflight = null;
export const seedDemo = () => (inflight ??= setUp());

const setUp = async () => {
  if (seeded()) return;
  const study = sampleStudy();
  await courses.put(study.course);
  await flashcards.putMany(study.cards.slice(0, 3));
  await habits.putMany(sampleHabits().slice(0, 2));
  seedDemoLog();
  try {
    localStorage.setItem(MARK, '1');
  } catch {
    /* without storage the demo is simply set up again next time */
  }
};

/** Empties the demo database and the notes kept beside it, so the next load starts from the made-up data again. */
export const resetDemo = async () => {
  await Promise.all(Object.values(storage).map((table) => table.clear()));
  try {
    for (const key of [MARK, ...EXTRA_KEYS]) localStorage.removeItem(key);
    sessionStorage.removeItem('hank62.demo.ai');
  } catch {
    /* nothing to clear */
  }
};

// Study Hub as plain functions: when a flashcard comes back (spaced repetition) and how far away a date is.

const DAY = 86400000;
const MINUTE = 60000;

/** A fresh card, due right away. `deck` is a course id, or '' for the general deck. */
export const newFlashcard = (front, back, deck = '', now = Date.now()) => ({
  front: String(front).trim().slice(0, 400),
  back: String(back).trim().slice(0, 1200),
  deck,
  ease: 2.5,
  interval: 0, // days
  reps: 0,
  due: now,
  lastReviewed: 0,
});

export const GRADES = [
  { id: 0, label: 'Again', hint: 'I did not know it' },
  { id: 1, label: 'Hard', hint: 'I got it, but it was hard' },
  { id: 2, label: 'Good', hint: 'I knew it' },
  { id: 3, label: 'Easy', hint: 'No effort' },
];

/**
 * After a review, when does the card come back? A simplified SM-2: a forgotten card returns in ten minutes and
 * loses ease; a remembered one returns after a longer and longer gap (1 day, 3 days, then interval × ease).
 */
export const review = (card, grade, now = Date.now()) => {
  let { ease, interval, reps } = card;
  if (grade === 0) {
    return { ...card, ease: Math.max(1.3, ease - 0.2), interval: 0, reps: 0, due: now + 10 * MINUTE, lastReviewed: now };
  }
  if (grade === 1) {
    ease = Math.max(1.3, ease - 0.15);
    interval = Math.max(1, Math.round(Math.max(interval, 1) * 1.2));
  } else if (grade === 2) {
    interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * ease);
  } else {
    ease += 0.15;
    interval = reps === 0 ? 3 : Math.round(Math.max(interval, 1) * ease * 1.3);
  }
  return { ...card, ease: +ease.toFixed(2), interval, reps: reps + 1, due: now + interval * DAY, lastReviewed: now };
};

/** The cards that are due, most overdue first, optionally for one deck. */
export const dueCards = (cards, now = Date.now(), deck = null) =>
  cards.filter((c) => c.due <= now && (deck === null || c.deck === deck)).sort((a, b) => a.due - b.due);

/** How the next review of a card looks for each answer, for the buttons ("10 min", "1 day"…). */
export const nextLabels = (card, now = Date.now()) =>
  GRADES.map(({ id }) => {
    const next = review(card, id, now);
    const minutes = Math.round((next.due - now) / MINUTE);
    return minutes < 60 ? `${minutes} min` : `${next.interval} day${next.interval > 1 ? 's' : ''}`;
  });

const dayStart = (t) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** Days from today to a moment, with a phrase for it. */
export const countdown = (at, now = Date.now()) => {
  const days = Math.round((dayStart(at) - dayStart(now)) / DAY);
  const label = days === 0 ? 'today' : days === 1 ? 'tomorrow' : days === -1 ? 'yesterday' : days > 0 ? `in ${days} days` : `${-days} days ago`;
  return { days, label, tone: days < 0 ? 'past' : days <= 2 ? 'soon' : 'later' };
};

/** Exams and open deadlines of every course, soonest first: [{ kind, title, at, course }]. */
export const upcoming = (courses, now = Date.now()) =>
  courses
    .flatMap((course) => [
      ...(course.exams ?? []).map((e) => ({ kind: 'exam', id: e.id, title: e.title, at: e.at, course })),
      ...(course.deadlines ?? []).filter((d) => !d.done).map((d) => ({ kind: 'deadline', id: d.id, title: d.title, at: d.at, course })),
    ])
    .filter((item) => dayStart(item.at) >= dayStart(now) - DAY)
    .sort((a, b) => a.at - b.at);

/** A Pomodoro as seconds left, formatted mm:ss. */
export const clock = (seconds) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`;

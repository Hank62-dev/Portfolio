import { categoryOf, formatVnd } from '../wallet/model.js';

// What is worth a nudge, worked out from the data the workspace already keeps. Pure: give it the moment and the data, get
// back the notifications that apply now. Each has a `key` that names the occasion (this event, this day, this month), so
// asking again every minute is harmless: the centre shows each occasion once. The same file runs in the browser and on the
// server (which sends the push), so it imports with explicit extensions, reads the clock in a named time zone (the server
// lives in UTC, the person does not) and takes the translator `t` as an argument: the browser passes its own, and the server
// passes one per language of the devices it writes to.

/** The date, month and hour on the wall in `zone` (this device's own zone when none is named). */
const wall = (date, zone) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit' })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, month: `${parts.year}-${parts.month}`, hour: Number(parts.hour) };
};
const clock = (date, zone) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: zone });

/** No translation: the English text, with `{0}`, `{1}`… filled in. */
export const plainT = (text, ...args) => (args.length ? text.replace(/\{(\d+)\}/g, (whole, i) => (args[i] === undefined ? whole : args[i])) : text);

export const SOON = 15; // minutes before an event it is announced
export const MORNING = 8; // reminders about the day wait until this hour
export const EVENING = 20; // habits are nudged from this hour
export const NIGHT = 21; // and the diary from this one

export const reminders = ({ now = new Date(), zone, t = plainT, events = [], cards = [], tasks = [], habits = [], entries = [], budgets = [], notes = null } = {}) => {
  const out = [];
  const { day: today, month, hour } = wall(now, zone);

  for (const event of events) {
    if (event.allDay) continue;
    const start = new Date(event.start);
    const minutes = (start - now) / 60000;
    if (minutes > -1 && minutes <= SOON) {
      const left = Math.max(1, Math.round(minutes));
      out.push({ key: `event:${event.start}:${event.title}`, kind: 'calendar', title: t('{0} starts in {1} min', event.title, left), body: [clock(start, zone), event.location].filter(Boolean).join(' · '), tab: 'hank' });
    }
  }

  if (hour >= MORNING) {
    const due = cards.filter((card) => card.due <= now.getTime()).length;
    if (due) out.push({ key: `cards:${today}`, kind: 'study', title: due === 1 ? t('1 flashcard due') : t('{0} flashcards due', due), body: t('A short review keeps them fresh.'), tab: 'study' });

    for (const task of tasks) {
      if (task.column === 'done' || !task.due) continue;
      if (task.due === today) out.push({ key: `task:${task.id}:${task.due}:today`, kind: 'tasks', title: t('“{0}” is due today', task.title), body: t('On the Mission Board.'), tab: 'missions' });
      else if (task.due < today) out.push({ key: `task:${task.id}:${task.due}:late`, kind: 'tasks', title: t('“{0}” is overdue', task.title), body: t('It was due {0}.', task.due), tab: 'missions', tone: 'error' });
    }
  }

  if (hour >= EVENING && habits.length) {
    const waiting = habits.filter((habit) => !habit.days.includes(today));
    if (waiting.length) {
      const names = waiting.slice(0, 3).map((habit) => habit.name).join(', ');
      out.push({ key: `habits:${today}`, kind: 'habits', title: waiting.length === 1 ? t('1 habit still to do today') : t('{0} habits still to do today', waiting.length), body: waiting.length > 3 ? t('{0} and more.', names) : names, tab: 'habits' });
    }
  }

  const spent = new Map();
  for (const entry of entries) {
    if (entry.type === 'expense' && wall(new Date(entry.at), zone).month === month) spent.set(entry.category, (spent.get(entry.category) ?? 0) + entry.amount);
  }
  for (const budget of budgets) {
    const used = spent.get(budget.category) ?? 0;
    if (!budget.amount || used < budget.amount * 0.8) continue;
    const full = used >= budget.amount;
    const name = t(categoryOf(budget.category).label);
    out.push({
      key: `budget:${budget.category}:${month}:${full ? 100 : 80}`,
      kind: 'wallet',
      title: full ? t('{0} budget is used up', name) : t('{0} budget is 80% used', name),
      body: t('{0} of {1} this month.', formatVnd(used), formatVnd(budget.amount)),
      tab: 'wallet',
      tone: full ? 'error' : 'info',
    });
  }

  if (notes && hour >= NIGHT && !notes.some((note) => note.day === today)) {
    out.push({ key: `diary:${today}`, kind: 'diary', title: t('Write today’s page?'), body: t('A few lines is enough.'), tab: 'diary' });
  }

  return out;
};

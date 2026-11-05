import { BookHeart, CalendarClock, GraduationCap, Kanban, Server, Sprout, Timer, Wallet } from 'lucide-react';

/** What a notification can be about. `tab` is where tapping one goes when it does not name a place of its own. */
export const KINDS = [
  { id: 'focus', label: 'Focus timer', hint: 'A session or a break has ended', icon: Timer, tab: 'study' },
  { id: 'study', label: 'Study', hint: 'Flashcards waiting to be reviewed', icon: GraduationCap, tab: 'study' },
  { id: 'calendar', label: 'Calendar', hint: 'An event about to start', icon: CalendarClock, tab: 'hank' },
  { id: 'tasks', label: 'Tasks', hint: 'Due today or overdue on the Mission Board', icon: Kanban, tab: 'missions' },
  { id: 'habits', label: 'Habits', hint: 'Plants still waiting for water this evening', icon: Sprout, tab: 'habits' },
  { id: 'wallet', label: 'Wallet', hint: 'A budget close to its limit', icon: Wallet, tab: 'wallet' },
  { id: 'diary', label: 'Diary', hint: 'A gentle nudge to write the day’s page', icon: BookHeart, tab: 'diary' },
  { id: 'system', label: 'Agents & system', hint: 'An agent finished, the server dropped, an update is ready', icon: Server, tab: 'hank' },
];

export const KIND_IDS = KINDS.map((kind) => kind.id);
export const kindOf = (id) => KINDS.find((kind) => kind.id === id) ?? KINDS[KINDS.length - 1];

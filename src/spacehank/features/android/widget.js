import { isNativeApp } from '../../../shared/lib/platform';
import { plainT } from '../notifications/rules';
import { Hank62 } from './bridge';

// What the home-screen widget shows (android/.../TodayWidget.java draws it): today's timed events still to come, tasks that
// are overdue or due today, and habits not yet done. Pure; the app hands the result to the phone whenever it changes.

const ROWS = 5;

const localDay = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const clock = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export const todayWidget = ({ now = new Date(), t = plainT, lang = 'en', events = [], tasks = [], habits = [] } = {}) => {
  const today = localDay(now);
  const rows = [];

  for (const event of [...events].filter((e) => !e.allDay && new Date(e.start) >= now && localDay(new Date(e.start)) === today).sort((a, b) => new Date(a.start) - new Date(b.start))) {
    rows.push({ text: `${clock(new Date(event.start))} · ${event.title}`, tab: 'hank' });
  }
  const open = tasks.filter((task) => task.column !== 'done' && task.due && task.due <= today);
  for (const task of open.filter((task) => task.due < today)) rows.push({ text: `! ${task.title}`, tab: 'missions', late: true });
  for (const task of open.filter((task) => task.due === today)) rows.push({ text: `□ ${task.title}`, tab: 'missions' });
  for (const habit of habits.filter((habit) => !habit.days.includes(today))) rows.push({ text: `○ ${habit.name}`, tab: 'habits' });

  return {
    day: today,
    title: t('Today'),
    subtitle: now.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    rows: rows.slice(0, ROWS),
    count: rows.length,
    empty: t('Nothing due today. Enjoy it.'),
    stale: t('Open Hank62 to bring today up to date.'),
  };
};

let last = '';

/** Hands the widget its data, when it has changed. */
export const pushWidget = async (data) => {
  if (!isNativeApp()) return;
  const json = JSON.stringify(data);
  if (json === last) return;
  last = json;
  try {
    await Hank62.setWidget({ data: json });
  } catch {
    last = ''; // an older APK without the widget: nothing to do
  }
};

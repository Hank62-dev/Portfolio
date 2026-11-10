import { isDemo } from '../demo/mode';
import { createStore } from '../store';
import { addSession, parseLog, sampleLog } from './stats';

// The history of finished focus sessions, kept on this device (a few lines a day, so localStorage is plenty).
// The demo has a log of its own, like it has a database of its own.

export const LOG_KEY = 'hank62.focus.log';
export const DEMO_LOG_KEY = 'hank62.demo.focus.log';
const key = () => (isDemo() ? DEMO_LOG_KEY : LOG_KEY);

const read = () => {
  try {
    return parseLog(localStorage.getItem(key()));
  } catch {
    return [];
  }
};
const write = (log) => {
  try {
    localStorage.setItem(key(), JSON.stringify(log));
  } catch {
    /* private mode: the history just will not outlive this visit */
  }
};

export const focusLog = createStore({ log: read() });

/** A focus session ran to the end: put it in the history. */
export const recordSession = (minutes) => {
  const log = addSession(focusLog.get().log, minutes);
  write(log);
  focusLog.set({ log });
};

/** The first time the demo opens, it gets a fortnight of made-up sessions so the charts have something to show. */
export const seedDemoLog = () => {
  if (!isDemo() || focusLog.get().log.length) return;
  const log = sampleLog();
  write(log);
  focusLog.set({ log });
};

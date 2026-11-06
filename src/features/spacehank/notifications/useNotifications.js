import { tr } from '../lang';
import { useEffect, useRef } from 'react';
import { useUpdate } from '../../../lib/appUpdate';
import { calendarBetween } from '../api/owner';
import { habits } from '../habits/store';
import { demoSchedule } from '../model/demo';
import { isWorking } from '../model/agents';
import { missions } from '../missions/store';
import { loadNotes, notesStore } from '../notes/library';
import { flashcards } from '../study/store';
import { budgets, entries } from '../wallet/store';
import { notify } from './center';
import { reminders } from './rules';

const EVERY = 30 * 1000; // how often the reminders are looked at
const CALENDAR_EVERY = 10 * 60 * 1000;
const OFFLINE_AFTER = 20 * 1000; // a dropped connection that comes straight back is not worth a notification

/**
 * Feeds the notification centre: reminders from the data the workspace keeps (events, flashcards, tasks, habits, budgets,
 * the diary), and what happens to the system itself (an agent finishing, the server dropping, a new version). Also lets a
 * tapped phone notification take the open app to the right tab.
 */
export function useNotifications({ guest, connected, agents, onTab }) {
  // reminders: look every half minute, and again when the app comes back to the front
  useEffect(() => {
    void Promise.allSettled([flashcards.load(), missions.load(), habits.load(), entries.load(), budgets.load(), loadNotes()]);
    let calendar = [];
    let stopped = false;

    const fetchCalendar = () => {
      if (guest) {
        calendar = demoSchedule();
        return;
      }
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      calendarBetween(start, end)
        .then((data) => {
          if (!stopped) calendar = data.events ?? [];
        })
        .catch(() => {});
    };

    const tick = () => {
      const notes = notesStore.get();
      for (const item of reminders({
        t: tr,
        now: new Date(),
        events: calendar,
        cards: flashcards.store.get().items,
        tasks: missions.store.get().items,
        habits: habits.store.get().items,
        entries: entries.store.get().items,
        budgets: budgets.store.get().items,
        notes: notes.loaded ? notes.notes : null,
      })) {
        notify(item);
      }
    };

    fetchCalendar();
    const first = window.setTimeout(tick, 4000); // after the stores have had a moment to load
    const loop = window.setInterval(tick, EVERY);
    const refetch = window.setInterval(fetchCalendar, CALENDAR_EVERY);
    const wake = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', wake);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(loop);
      window.clearInterval(refetch);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [guest]);

  // the server: dropping for a while, and coming back
  const everOnline = useRef(false);
  const wasDown = useRef(false);
  useEffect(() => {
    if (guest) return undefined;
    if (connected) {
      everOnline.current = true;
      if (wasDown.current) {
        wasDown.current = false;
        notify({ key: `online:${Date.now()}`, kind: 'system', title: tr('Back online'), body: tr('The realtime server is connected again.'), tone: 'success', announce: false });
      }
      return undefined;
    }
    if (!everOnline.current) return undefined;
    const timer = window.setTimeout(() => {
      wasDown.current = true;
      notify({ key: `offline:${Date.now()}`, kind: 'system', title: tr('The server went offline'), body: tr('Tasks cannot be sent until it is back.'), tone: 'error', announce: false });
    }, OFFLINE_AFTER);
    return () => window.clearTimeout(timer);
  }, [connected, guest]);

  // an agent that was working and has stopped
  const working = useRef(new Map());
  useEffect(() => {
    if (guest || !connected) {
      working.current = new Map();
      return;
    }
    for (const agent of agents) {
      const was = working.current.get(agent.id);
      const now = isWorking(agent);
      if (was && !now && agent.status === 'completed') {
        notify({ key: `agent:${agent.id}:${Math.floor(Date.now() / 60000)}`, kind: 'system', title: tr('{0} finished', agent.name), body: was.task, tab: 'space' });
      }
      working.current.set(agent.id, now ? { task: agent.task } : null);
    }
  }, [agents, connected, guest]);

  // a new version of the app is waiting
  const update = useUpdate();
  useEffect(() => {
    if (update.ready && !guest) notify({ key: `update:${Date.now()}`, kind: 'system', title: tr('A new version is ready'), body: tr('Tap the update pill to switch to it.'), tone: 'info' });
  }, [update.ready, guest]);

  // a tapped phone notification, with the app already open, asks it to go to a tab; a push from the server lands in the list
  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type === 'hank62-open-tab' && event.data.tab) onTab(event.data.tab);
      // the server sent a reminder while the app was open: it goes in the list like any other (the same key never doubles)
      if (event.data?.type === 'hank62-push' && event.data.payload?.title) {
        const { key, kind, title, body, tab, tone } = event.data.payload;
        notify({ key, kind: kind || 'system', title, body, tab, tone });
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [onTab]);
}

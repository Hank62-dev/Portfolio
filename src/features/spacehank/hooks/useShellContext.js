import { useMemo } from 'react';
import { askNotes, djPick } from '../api/owner';
import { dayKey, streak, toggleDay } from '../habits/model';
import { habits } from '../habits/store';
import { newCard } from '../missions/model';
import { missions } from '../missions/store';
import { spacehankConfig } from '../config';
import { forecastUrl, parseForecast, summarize } from '../model/weather';
import { library } from '../music/library';
import { next, playList, player, previous, togglePlay } from '../music/player';
import { createNote, notesStore } from '../notes/library';
import { searchNotes, textToHtml, titleOf } from '../notes/notes';
import { formatVnd, categoryOf, parseEntry } from '../wallet/model';
import { entries } from '../wallet/store';

/** Plays something that fits `mood` from the library, or everything shuffled when no mood is given. Returns what to say. */
export const playMood = async (mood) => {
  const songs = library.get().tracks;
  if (!songs.length) throw new Error('The music library is empty. Add songs in Hank Music first.');
  if (!mood) {
    await playList(songs.map((t) => t.id), { shuffle: true });
    return 'Playing your library, shuffled';
  }
  const pick = await djPick({ mood, tracks: songs.map((t) => ({ id: t.id, title: t.title, artist: t.artist, genre: t.genre })) });
  if (!pick.ids.length) throw new Error('Nothing in your library fits that. Try other words.');
  await playList(pick.ids);
  return pick.note || `Playing a mix for ${mood}`;
};

/** Pause, resume, next or previous. Returns what to say. */
export const musicMove = async (move) => {
  const { playing, trackId } = player.get();
  if (move === 'next') await next();
  else if (move === 'previous') await previous();
  else if (!trackId) throw new Error('Nothing is playing yet.');
  else if ((move === 'pause') === playing) await togglePlay();
  const title = library.get().tracks.find((t) => t.id === player.get().trackId)?.title;
  return move === 'pause' ? 'Paused' : title ? `Now: ${title}` : 'Done';
};

/** The object the shell talks to the app through (see shell/commands.js). Rebuilt only when what it reads changes. */
export function useShellContext({ tabs, agents, onTab, onNewTask }) {
  return useMemo(
    () => ({
      tabs,
      agents,
      go: onTab,
      task: (agentId, text) => Boolean(onNewTask(text, agentId)),
      play: playMood,
      music: musicMove,
      note: (text) => createNote(text, { html: textToHtml(text) }),
      card: async (title) => {
        await missions.load();
        const cards = missions.store.get().items;
        await missions.create(newCard(title, 'backlog', cards.filter((c) => c.column === 'backlog').length));
      },
      spend: (text) => {
        const entry = parseEntry(text);
        if (entry.amount <= 0) throw new Error('I could not find an amount. Try: spend ăn trưa 45k');
        void entries.create({ ...entry, at: Date.now() });
        return `${entry.type === 'income' ? 'Income' : 'Spent'} ${formatVnd(entry.amount)} · ${categoryOf(entry.category).label}${entry.note ? ` · ${entry.note}` : ''}`;
      },
      habits: () => habits.store.get().items.map((h) => ({ name: h.name, done: h.days.includes(dayKey()), streak: streak(h.days) })),
      toggleHabit: (name) => {
        const word = name.trim().toLowerCase();
        const habit = habits.store.get().items.find((h) => h.name.toLowerCase().includes(word));
        if (!word || !habit) throw new Error(`No habit matches "${name}". Try: habits`);
        const days = toggleDay(habit.days, dayKey());
        void habits.update(habit.id, { days });
        return days.includes(dayKey()) ? `Watered ${habit.name}` : `Unticked ${habit.name}`;
      },
      search: (query) => searchNotes(notesStore.get().notes, query, 8).map((r) => ({ title: titleOf(r.note.text) })),
      ask: async (question) => {
        const found = searchNotes(notesStore.get().notes, question, 6);
        if (!found.length) return 'None of your notes mention that.';
        const { answer } = await askNotes({ question, notes: found.map(({ note }) => ({ title: titleOf(note.text), text: note.text })) });
        return answer;
      },
      weather: async () => {
        const response = await fetch(forecastUrl(spacehankConfig.home));
        const forecast = parseForecast(await response.json());
        if (!forecast) throw new Error('The weather could not be loaded.');
        return `${spacehankConfig.home.name}: ${summarize(forecast, 'en')}`;
      },
      now: () => new Date(),
    }),
    [tabs, agents, onTab, onNewTask]
  );
}

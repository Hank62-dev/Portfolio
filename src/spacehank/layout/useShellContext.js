import { useMemo } from 'react';
import { askNotes, djPick } from '../core/api/owner';
import { dayKey, streak, toggleDay } from '../features/habits/model';
import { habits } from '../features/habits/store';
import { newCard } from '../features/missions/model';
import { missions } from '../features/missions/store';
import { spacehankConfig } from '../core/config';
import { forecastUrl, parseForecast, summarize } from '../features/today/weather';
import { library } from '../features/music/library';
import { next, playList, player, previous, togglePlay } from '../features/music/player';
import { createNote, notesStore } from '../features/notes/library';
import { readable } from '../features/diary/lock';
import { searchNotes, textToHtml, titleOf } from '../features/notes/notes';
import { formatVnd, categoryOf, parseEntry } from '../features/wallet/model';
import { entries } from '../features/wallet/store';
import { tr } from '../core/i18n/lang';

/** Plays something that fits `mood` from the library, or everything shuffled when no mood is given. Returns what to say. */
export const playMood = async (mood) => {
  const songs = library.get().tracks;
  if (!songs.length) throw new Error(tr('The music library is empty. Add songs in Hank Music first.'));
  if (!mood) {
    await playList(songs.map((t) => t.id), { shuffle: true });
    return tr('Playing your library, shuffled');
  }
  const pick = await djPick({ mood, tracks: songs.map((t) => ({ id: t.id, title: t.title, artist: t.artist, genre: t.genre })) });
  if (!pick.ids.length) throw new Error(tr('Nothing in your library fits that. Try other words.'));
  await playList(pick.ids);
  return pick.note || tr('Playing a mix for {0}', mood);
};

/** Pause, resume, next or previous. Returns what to say. */
export const musicMove = async (move) => {
  const { playing, trackId } = player.get();
  if (move === 'next') await next();
  else if (move === 'previous') await previous();
  else if (!trackId) throw new Error(tr('Nothing is playing yet.'));
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
        if (entry.amount <= 0) throw new Error(tr('I could not find an amount. Try: spend ăn trưa 45k'));
        void entries.create({ ...entry, at: Date.now() });
        return `${entry.type === 'income' ? 'Income' : 'Spent'} ${formatVnd(entry.amount)} · ${categoryOf(entry.category).label}${entry.note ? ` · ${entry.note}` : ''}`;
      },
      habits: () => habits.store.get().items.map((h) => ({ name: h.name, done: h.days.includes(dayKey()), streak: streak(h.days) })),
      toggleHabit: (name) => {
        const word = name.trim().toLowerCase();
        const habit = habits.store.get().items.find((h) => h.name.toLowerCase().includes(word));
        if (!word || !habit) throw new Error(tr('No habit matches "{0}". Try: habits', name));
        const days = toggleDay(habit.days, dayKey());
        void habits.update(habit.id, { days });
        return days.includes(dayKey()) ? `Watered ${habit.name}` : `Unticked ${habit.name}`;
      },
      search: (query) => searchNotes(readable(notesStore.get().notes), query, 8).map((r) => ({ title: titleOf(r.note.text) })),
      ask: async (question) => {
        const found = searchNotes(readable(notesStore.get().notes), question, 6);
        if (!found.length) return tr('None of your notes mention that.');
        const { answer } = await askNotes({ question, notes: found.map(({ note }) => ({ title: titleOf(note.text), text: note.text })) });
        return answer;
      },
      weather: async () => {
        const response = await fetch(forecastUrl(spacehankConfig.home));
        const forecast = parseForecast(await response.json());
        if (!forecast) throw new Error(tr('The weather could not be loaded.'));
        return `${spacehankConfig.home.name}: ${summarize(forecast, 'en')}`;
      },
      now: () => new Date(),
    }),
    [tabs, agents, onTab, onNewTask]
  );
}

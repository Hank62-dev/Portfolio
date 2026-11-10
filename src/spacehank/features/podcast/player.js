import { bindSystemKeys, pause as pauseMusic, player as music } from '../music/player';
import { createStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';
import { RATES, listenId, listenRecord, startAt } from './model';
import { listens } from './store';

// The podcast player: one audio element for the whole app, so an episode keeps playing when you go to another tab. It is
// separate from the music player on purpose (its own queue-less, resume-where-you-left-off, speed-changing way of
// playing), and the two never play at once: starting one stops the other.

const RATE_KEY = 'hank-podcast-rate';
const SAVE_EVERY = 10; // seconds of listening between two saves of where it has got to

const savedRate = () => {
  try {
    const rate = Number(localStorage.getItem(RATE_KEY));
    return RATES.includes(rate) ? rate : 1;
  } catch {
    return 1;
  }
};

export const podcast = createStore({
  show: null, // { id, title, image }
  episode: null, // { guid, title, audio, image, duration }
  playing: false,
  loading: false,
  time: 0,
  duration: 0,
  rate: savedRate(),
  error: '',
  front: false, // the episode, not the music, is what was played last: the bar at the bottom is the podcast's
  sleepAt: 0, // when the sleep timer stops the episode (ms), or 0
  sleepMinutes: 0,
});

let audio = null;
let startFrom = 0;
let lastSaved = 0;

/** Remembers where the episode has got to (and that it is finished, once it is). */
const save = (done = false) => {
  const { show, episode, time, duration } = podcast.get();
  if (!show || !episode) return;
  lastSaved = time;
  void listens.load().then(() => {
    const record = listenRecord({ show, episode, time, duration, done });
    const known = listens.store.get().items.find((entry) => entry.id === record.id);
    return listens.put({ createdAt: Date.now(), ...known, ...record, updatedAt: Date.now() });
  });
};

const publishPosition = () => {
  if (!audio || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  if (!duration) return;
  try {
    navigator.mediaSession.setPositionState({ duration, playbackRate: audio.playbackRate || 1, position: Math.min(audio.currentTime, duration) });
  } catch {
    /* a position the browser thinks is out of range */
  }
};

/** Points the system's media keys (lock screen, headset, notification card) at the episode, and tells it what is playing. */
const claimKeys = () => {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const { show, episode } = podcast.get();
  if (episode) {
    const art = episode.image || show?.image;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: episode.title,
      artist: show?.title || tr('Podcast'),
      album: show?.title || 'Hank62',
      artwork: art ? ['96x96', '256x256', '512x512'].map((sizes) => ({ src: art, sizes })) : [{ src: '/icons/logo-512.png', sizes: '512x512', type: 'image/png' }],
    });
  }
  const handlers = {
    play: () => void toggle(true),
    pause: () => toggle(false),
    stop: () => toggle(false),
    seekto: (details) => seekTo(details.seekTime),
    seekbackward: (details) => skip(-(details.seekOffset || 15)),
    seekforward: (details) => skip(details.seekOffset || 30),
    previoustrack: () => skip(-15),
    nexttrack: () => skip(30),
  };
  for (const [action, handler] of Object.entries(handlers)) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      /* this browser does not support that action */
    }
  }
};

const element = () => {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'metadata';
  audio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(audio.duration)) podcast.set({ duration: audio.duration });
    if (startFrom > 0 && startFrom < (audio.duration || Infinity) - 5) audio.currentTime = startFrom;
    startFrom = 0;
  });
  audio.addEventListener('timeupdate', () => {
    podcast.set({ time: audio.currentTime, ...(Number.isFinite(audio.duration) ? { duration: audio.duration } : {}) });
    publishPosition();
    if (Math.abs(audio.currentTime - lastSaved) >= SAVE_EVERY) save();
  });
  audio.addEventListener('playing', () => {
    podcast.set({ playing: true, loading: false, error: '', front: true });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  });
  audio.addEventListener('pause', () => {
    if (audio.ended) return;
    podcast.set({ playing: false });
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    save();
  });
  audio.addEventListener('waiting', () => podcast.set({ loading: true }));
  audio.addEventListener('canplay', () => podcast.set({ loading: false }));
  audio.addEventListener('ended', () => {
    podcast.set({ playing: false });
    save(true);
  });
  audio.addEventListener('error', () => podcast.get().episode && podcast.set({ playing: false, loading: false, error: tr('This episode could not be played. Its host may have moved it, or does not allow it here.') }));
  return audio;
};

// the two players never play at once: when music starts, the episode stops and the music gets the media keys back
music.subscribe(() => {
  if (!music.get().playing) return;
  bindSystemKeys();
  if (audio && podcast.get().playing) audio.pause();
  if (podcast.get().front) podcast.set({ front: false });
});

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && podcast.get().playing && save());
  window.addEventListener('pagehide', () => podcast.get().episode && save());
}

/** Plays an episode of a show, carrying on from where it was left. `show` is { id, title, image, feedUrl? }. */
export const playEpisode = async (show, episode) => {
  const el = element();
  const current = podcast.get().episode;
  if (current && (current.guid !== episode.guid || podcast.get().show?.id !== show.id)) save();
  pauseMusic();
  await listens.load();
  const entry = listens.store.get().items.find((item) => item.id === listenId(show.id, episode.guid));
  startFrom = startAt(entry);
  lastSaved = startFrom;
  podcast.set({ show: { id: show.id, title: show.title, image: show.image, feedUrl: show.feedUrl || '' }, episode: { guid: episode.guid, title: episode.title, audio: episode.audio, image: episode.image || '', duration: episode.duration || 0 }, playing: false, loading: true, time: startFrom, duration: episode.duration || 0, error: '' });
  el.src = episode.audio;
  el.playbackRate = podcast.get().rate;
  claimKeys();
  try {
    await el.play();
  } catch (error) {
    // a browser that wants a tap first, or an address it cannot play
    if (error?.name !== 'AbortError') podcast.set({ loading: false, playing: false, error: error?.name === 'NotAllowedError' ? '' : tr('This episode could not be played. Its host may have moved it, or does not allow it here.') });
  }
};

/** Plays or pauses the episode that is loaded. `want` forces one or the other. */
export const toggle = async (want) => {
  if (!audio || !podcast.get().episode) return;
  const play = want ?? audio.paused;
  if (play) {
    pauseMusic();
    claimKeys();
    await audio.play().catch(() => {});
  } else {
    audio.pause();
  }
};

export const seekTo = (seconds) => {
  if (!audio) return;
  const limit = Number.isFinite(audio.duration) ? audio.duration : podcast.get().duration || Infinity;
  audio.currentTime = Math.max(0, Math.min(limit, seconds));
  podcast.set({ time: audio.currentTime });
};

export const skip = (seconds) => audio && seekTo(audio.currentTime + seconds);

export const setRate = (rate) => {
  if (!RATES.includes(rate)) return;
  if (audio) audio.playbackRate = rate;
  podcast.set({ rate });
  try {
    localStorage.setItem(RATE_KEY, String(rate));
  } catch {
    /* the speed lasts until the page closes */
  }
};

/** Marks an episode heard (or not heard again), without playing it. `show` is { id, title, image }. */
export const setHeard = async (show, episode, done) => {
  await listens.load();
  const length = episode.duration || 0;
  const record = listenRecord({ show, episode, time: done ? length : 0, duration: length, done });
  const known = listens.store.get().items.find((entry) => entry.id === record.id);
  await listens.put({ createdAt: Date.now(), ...known, ...record, done, position: done ? record.position : 0, updatedAt: Date.now() });
};

let sleepTimer = 0;
/** Stops the episode after `minutes` (0 turns the timer off). */
export const setSleep = (minutes) => {
  clearTimeout(sleepTimer);
  if (!minutes) return podcast.set({ sleepAt: 0, sleepMinutes: 0 });
  podcast.set({ sleepAt: Date.now() + minutes * 60000, sleepMinutes: minutes });
  sleepTimer = setTimeout(() => {
    podcast.set({ sleepAt: 0, sleepMinutes: 0 });
    toggle(false);
  }, minutes * 60000);
};

/** Puts the episode away: remembers where it got to, stops it, and gives the bar and the media keys back to the music. */
export const close = () => {
  if (!podcast.get().episode) return;
  save();
  setSleep(0);
  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  podcast.set({ show: null, episode: null, playing: false, loading: false, time: 0, duration: 0, error: '', front: false });
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  }
  bindSystemKeys();
};

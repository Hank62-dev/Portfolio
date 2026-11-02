import { createStore } from '../store';
import { countPlay, coverUrl, getBlob, library } from './library';
import { REPEAT, advance, createQueue, enqueue, playNext, prune, retreat } from './queue';

// One audio element for the whole workspace, so music keeps playing as you move between tabs.

const PREFS = 'hank62.music.prefs';
const loadPrefs = () => {
  try {
    return { volume: 0.8, shuffle: false, repeat: 'off', ...JSON.parse(localStorage.getItem(PREFS) ?? '{}') };
  } catch {
    return { volume: 0.8, shuffle: false, repeat: 'off' };
  }
};
const savePrefs = ({ volume, shuffle, repeat }) => {
  try {
    localStorage.setItem(PREFS, JSON.stringify({ volume, shuffle, repeat }));
  } catch {
    /* private mode: preferences just will not persist */
  }
};

export const player = createStore({
  queue: { order: [], index: -1 },
  trackId: null,
  playing: false,
  loading: false,
  time: 0,
  duration: 0,
  sleepAt: 0,
  error: '',
  ...loadPrefs(),
});

let audio = null;
let context = null;
let analyser = null;
let objectUrl = '';
let sleepTimer = 0;
let token = 0; // guards against a slow blob read finishing after the user already chose something else

const trackById = (id) => library.get().tracks.find((t) => t.id === id);

const ensureAudio = () => {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'auto';
  audio.volume = player.get().volume;
  audio.addEventListener('timeupdate', () => {
    player.set({ time: audio.currentTime });
    publishPosition();
  });
  audio.addEventListener('durationchange', () => player.set({ duration: Number.isFinite(audio.duration) ? audio.duration : 0 }));
  audio.addEventListener('play', () => {
    player.set({ playing: true });
    publishState('playing');
  });
  audio.addEventListener('pause', () => {
    player.set({ playing: false });
    publishState('paused');
  });
  audio.addEventListener('ended', () => goNext({ auto: true }));
  audio.addEventListener('error', () => {
    player.set({ playing: false, loading: false, error: 'This file could not be played.' });
  });
  return audio;
};

// On a phone or tablet the sound must stay on the browser's native audio path: routed through Web Audio (for the
// visualizer) it is silenced when the screen locks or the app goes to the background, mostly on iPhone.
const touchDevice = () => typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(max-width: 767px)').matches);

/** The analyser for the visualizer. It is created on first use, which must follow a click (autoplay rules). Not on touch devices. */
export const getAnalyser = () => {
  if (analyser || !audio || touchDevice()) return analyser;
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    context = new Context();
    const source = context.createMediaElementSource(audio);
    analyser = context.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyser.connect(context.destination);
  } catch {
    analyser = null;
  }
  return analyser;
};

const resumeContext = () => {
  if (context && context.state === 'suspended') void context.resume();
};

/** What the lock screen and the notification shade show: the song, its cover, and where it is. */
const publishToSystem = async (track) => {
  if (!('mediaSession' in navigator)) return;
  const art = track.hasCover ? await coverUrl(track.id) : '';
  if (player.get().trackId !== track.id) return; // the song changed while the cover was loading
  const sizes = ['96x96', '192x192', '256x256', '384x384', '512x512'];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artist || 'Hank Music',
    album: track.album || 'Hank62',
    artwork: art ? sizes.map((size) => ({ src: art, sizes: size })) : [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
  });
};

let lastPosition = 0;
const publishPosition = () => {
  if (!audio || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  const now = Date.now();
  if (now - lastPosition < 900) return;
  lastPosition = now;
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  if (!duration) return;
  try {
    navigator.mediaSession.setPositionState({ duration, playbackRate: audio.playbackRate || 1, position: Math.min(audio.currentTime, duration) });
  } catch {
    /* some browsers refuse a position they think is out of range */
  }
};

const publishState = (state) => {
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = state;
};

/** Loads the track at the queue's index and plays it. Skips over tracks whose file has gone missing. */
const startCurrent = async (autoplay = true) => {
  const { queue } = player.get();
  const id = queue.order[queue.index];
  const track = id && trackById(id);
  const mine = ++token;
  if (!track) {
    player.set({ trackId: null, playing: false, time: 0, duration: 0 });
    return;
  }
  player.set({ trackId: id, loading: true, error: '', time: 0, duration: track.duration || 0 });
  const blob = await getBlob(id);
  if (mine !== token) return;
  if (!blob) {
    player.set({ loading: false, error: `"${track.title}" is missing from this device.` });
    return;
  }
  const element = ensureAudio();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(blob);
  element.src = objectUrl;
  getAnalyser();
  resumeContext();
  player.set({ loading: false });
  void publishToSystem(track);
  if (autoplay) {
    try {
      await element.play();
      void countPlay(id);
    } catch {
      player.set({ playing: false, error: 'The browser blocked playback. Press play.' });
    }
  }
};

/** Plays `id` with `ids` (what the visitor was looking at) as the queue. */
export const playTrack = (id, ids) => {
  const { shuffle } = player.get();
  player.set({ queue: createQueue(ids?.length ? ids : [id], { startId: id, shuffle }) });
  return startCurrent();
};

/** Replaces the queue with `ids`, in the given order (used by Hank DJ and playlists). */
export const playList = (ids, { shuffle = false } = {}) => {
  const valid = ids.filter((id) => trackById(id));
  if (!valid.length) return Promise.resolve();
  player.set({ queue: createQueue(valid, { startId: valid[0], shuffle }), shuffle });
  savePrefs(player.get());
  return startCurrent();
};

export const togglePlay = async () => {
  const { trackId, queue } = player.get();
  if (!trackId) {
    if (queue.order.length) await startCurrent();
    return;
  }
  const element = ensureAudio();
  resumeContext();
  if (element.paused) {
    try {
      await element.play();
    } catch {
      player.set({ error: 'The browser blocked playback. Press play.' });
    }
  } else element.pause();
};

export const resume = async () => {
  if (!player.get().playing) await togglePlay();
};
export const pause = () => {
  if (player.get().playing) audio?.pause();
};

const goNext = ({ auto = false } = {}) => {
  const { queue, repeat } = player.get();
  const step = advance(queue, repeat, { auto });
  if (step.ended) {
    player.set({ playing: false, time: 0 });
    return Promise.resolve();
  }
  if (auto && repeat === 'one') {
    ensureAudio().currentTime = 0;
    return ensureAudio().play().catch(() => {});
  }
  player.set({ queue: step.queue });
  return startCurrent();
};

export const next = () => goNext();

export const previous = () => {
  if (audio && audio.currentTime > 3) {
    audio.currentTime = 0;
    return Promise.resolve();
  }
  player.set({ queue: retreat(player.get().queue) });
  return startCurrent();
};

export const seek = (seconds) => {
  if (audio && Number.isFinite(seconds)) audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
};

export const setVolume = (volume) => {
  const v = Math.max(0, Math.min(1, volume));
  if (audio) audio.volume = v;
  player.set({ volume: v });
  savePrefs(player.get());
};

export const toggleShuffle = () => {
  const { shuffle, queue } = player.get();
  const current = queue.order[queue.index];
  const sorted = library.get().tracks.map((t) => t.id).filter((id) => queue.order.includes(id));
  const rebuilt = createQueue(shuffle ? (sorted.length ? sorted : queue.order) : queue.order, { startId: current, shuffle: !shuffle });
  player.set({ shuffle: !shuffle, queue: queue.order.length ? rebuilt : queue });
  savePrefs(player.get());
};

export const cycleRepeat = () => {
  player.set({ repeat: REPEAT[(REPEAT.indexOf(player.get().repeat) + 1) % REPEAT.length] });
  savePrefs(player.get());
};

export const queueNext = (id) => player.set({ queue: playNext(player.get().queue, id) });
export const queueLast = (id) => player.set({ queue: enqueue(player.get().queue, id) });

/** Stops playback after `minutes` (0 cancels). */
export const setSleepTimer = (minutes) => {
  window.clearTimeout(sleepTimer);
  if (!minutes) {
    player.set({ sleepAt: 0 });
    return;
  }
  player.set({ sleepAt: Date.now() + minutes * 60000 });
  sleepTimer = window.setTimeout(() => {
    audio?.pause();
    player.set({ sleepAt: 0 });
  }, minutes * 60000);
};

export const stop = () => {
  publishState('none');
  token += 1;
  audio?.pause();
  if (audio) audio.removeAttribute('src');
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = '';
  player.set({ queue: { order: [], index: -1 }, trackId: null, playing: false, time: 0, duration: 0, loading: false });
};

// Keep the queue honest when tracks are deleted, and let the headset / lock-screen keys drive the player.
library.subscribe(() => {
  const { queue, trackId } = player.get();
  if (!queue.order.length) return;
  const stillThere = (id) => library.get().tracks.some((t) => t.id === id);
  if (queue.order.every(stillThere)) return;
  if (trackId && !stillThere(trackId)) stop();
  else player.set({ queue: prune(queue, stillThere) });
});

if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
  const handlers = {
    play: () => resume(),
    pause: () => pause(),
    stop: () => stop(),
    nexttrack: () => next(),
    previoustrack: () => previous(),
    seekto: (details) => seek(details.seekTime),
    seekbackward: (details) => seek((audio?.currentTime ?? 0) - (details.seekOffset || 10)),
    seekforward: (details) => seek((audio?.currentTime ?? 0) + (details.seekOffset || 10)),
  };
  for (const [action, handler] of Object.entries(handlers)) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      /* this browser does not support that action */
    }
  }
}

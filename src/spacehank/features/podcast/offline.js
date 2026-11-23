import { isNativeApp } from '../../../shared/lib/platform';
import { createStore } from '../../core/store';
import { appInfo, Hank62 } from '../android/bridge';
import { listenId } from './model';

// Episodes kept on the phone, to listen with no network (the Android app only: a browser cannot download most podcast
// hosts' files). The app's own code downloads them (Hank62Plugin.downloadEpisode) into its storage and answers
// /_hank62_offline_/<id> from the file, so the player plays and seeks it like any address.
//
// What is kept is listed here too, with what the Library needs to show and play it offline (the feed itself needs the
// server): { [key]: { id, key, show: { id, title, image }, episode: { guid, title, image, duration, audio }, size, at } }.
// It is this phone's own list, not synced: another device has its own files.

const KEY = 'hank62.podcast.offline';
const SHELL = 6; // the first APK that can keep episodes

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
};
const write = (items) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* full or private: the files are still there, listed again on the next start */
  }
};

/** items: what is kept; progress: { [key]: 0..1 } of the downloads under way; error: { [key]: message } of the last that failed. */
export const offline = createStore({ items: read(), progress: {}, error: {} });

/** A file name for an episode: the listen id's letters, and a hash so two ids never share one. Pure. */
export const fileId = (key) => {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
  return `${key.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)}-${hash.toString(36)}`;
};

/** 0 to 1: how far a download is (0 while its size is not known). Pure. */
export const share = (received, total) => (total > 0 ? Math.min(1, Math.max(0, received / total)) : 0);

/** Whether this is the Android app, new enough to keep episodes. */
export const canKeep = () => isNativeApp() && appInfo.get().shell >= SHELL;

/** The kept copy of an episode, or null. */
export const keptOf = (showId, guid) => offline.get().items[listenId(showId, guid)] ?? null;

/** The address to play an episode from: the kept file when there is one, else the podcast's own. */
export const sourceOf = (showId, episode) => {
  const kept = keptOf(showId, episode.guid);
  return kept && isNativeApp() ? `${window.location.origin}/_hank62_offline_/${kept.id}` : episode.audio;
};

const setPart = (part, key, value) => {
  const next = { ...offline.get()[part] };
  if (value === undefined) delete next[key];
  else next[key] = value;
  offline.set({ [part]: next });
};

let listening = null;
const listen = () => {
  listening ??= Hank62.addListener('episodeProgress', ({ id, received, total }) => {
    const key = Object.keys(offline.get().progress).find((k) => fileId(k) === id);
    if (key) setPart('progress', key, share(received, total));
  }).catch(() => null);
  return listening;
};

/** Keeps an episode on the phone. `show` is { id, title, image }. Resolves when it is kept; a cancel is not an error. */
export const keep = async (show, episode) => {
  const key = listenId(show.id, episode.guid);
  if (offline.get().items[key] || key in offline.get().progress) return;
  setPart('error', key, undefined);
  setPart('progress', key, 0);
  await listen();
  const id = fileId(key);
  try {
    const { size } = await Hank62.downloadEpisode({ id, url: episode.audio });
    const record = {
      id,
      key,
      show: { id: show.id, title: show.title ?? '', image: show.image ?? '' },
      episode: { guid: episode.guid, title: episode.title ?? '', image: episode.image ?? '', duration: episode.duration ?? 0, audio: episode.audio },
      size,
      at: Date.now(),
    };
    const items = { ...offline.get().items, [key]: record };
    offline.set({ items });
    write(items);
  } catch (error) {
    if (error?.code !== 'CANCELED') setPart('error', key, error?.message || 'failed');
  } finally {
    setPart('progress', key, undefined);
  }
};

/** Stops a download that is under way. */
export const stopKeeping = (showId, guid) => void Hank62.cancelEpisode({ id: fileId(listenId(showId, guid)) }).catch(() => {});

/** Takes the kept copy off the phone. */
export const forget = async (showId, guid) => {
  const key = listenId(showId, guid);
  const kept = offline.get().items[key];
  if (!kept) return;
  await Hank62.deleteEpisode({ id: kept.id }).catch(() => {});
  const items = { ...offline.get().items };
  delete items[key];
  offline.set({ items });
  write(items);
};

/** The list as the phone has it: a record whose file is gone (the app's storage was cleared) is dropped. */
export const reconcile = async () => {
  if (!canKeep()) return;
  try {
    const { items: files } = await Hank62.listEpisodes();
    const there = new Set((files ?? []).map((file) => file.id));
    const items = Object.fromEntries(Object.entries(offline.get().items).filter(([, record]) => there.has(record.id)));
    if (Object.keys(items).length !== Object.keys(offline.get().items).length) {
      offline.set({ items });
      write(items);
    }
  } catch {
    /* an older APK */
  }
};

/** What is kept, newest first. Pure. */
export const keptList = (items) => Object.values(items).sort((a, b) => b.at - a.at);

/** '48 MB'. Pure. */
export const sizeLabel = (bytes) => (bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`);

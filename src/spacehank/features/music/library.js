import { cropBars } from './coverCrop';
import { createStore } from '../../core/store';
import { requestPersistence, storage } from '../../core/storage';
import { tr } from '../../core/i18n/lang';

const AUDIO_EXT = /\.(mp3|m4a|aac|flac|ogg|oga|opus|wav|webm)$/i;

export const isAudioFile = (file) => file.type.startsWith('audio/') || AUDIO_EXT.test(file.name);
export const isLyricsFile = (file) => /\.lrc$/i.test(file.name);

const baseName = (name) => name.replace(/\.[^.]+$/, '');

/**
 * A readable title from a file name that has no tags: songs saved from a video site are called things like
 * "Artist - Song _ Official Lyric Video #music". Hashtags and the video-site trailers are dropped.
 */
export const tidyText = (text) => {
  const base = String(text).replace(/\s*#[^\s#]+/gu, '').trim();
  const parts = base.split(/\s+[_|]\s+|\s+I\s+(?=official)/i).map((part) => part.trim()).filter(Boolean);
  const keep = parts.filter((part, i) => i === 0 || !/(official|lyric|video|\bmv\b|audio|visuali[sz]er|the album|\bcover\b|speed ?up|remix version)/i.test(part));
  return keep.join(' - ') || base || text;
};
export const tidyName = (name) => tidyText(baseName(name));

/** "Artist - Song" in a file name with no tags becomes { artist, title }; any other name is just a title. */
export const parseName = (name) => {
  const tidy = tidyName(name);
  const at = tidy.indexOf(' - ');
  return at > 0 && at < tidy.length - 3 ? { artist: tidy.slice(0, at).trim(), title: tidy.slice(at + 3).trim() } : { artist: '', title: tidy };
};

export const signature = (file) => `${file.name}|${file.size}|${file.lastModified}`;

// The library as a store: tracks and playlists in memory (the records are small), files fetched on demand.
export const library = createStore({ loaded: false, tracks: [], playlists: [], error: '' });

const byAdded = (a, b) => b.addedAt - a.addedAt;
const covers = new Map(); // track id -> object URL

// Songs that ship with the app (see assets/music) are copied in on start. One the owner deletes is remembered here, so it stays gone.
const REMOVED = 'hank62.music.removed';
export const readRemoved = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(REMOVED) ?? '[]'));
  } catch {
    return new Set();
  }
};
const rememberRemoved = (sigs) => {
  try {
    localStorage.setItem(REMOVED, JSON.stringify([...new Set([...readRemoved(), ...sigs.filter(Boolean)])]));
  } catch {
    /* without storage a deleted bundled song simply comes back on the next start */
  }
};

/** Loads the library from this device. Safe to call more than once. */
export const loadLibrary = async () => {
  if (library.get().loaded) return;
  try {
    const [tracks, playlists] = await Promise.all([storage.tracks.all(), storage.playlists.all()]);
    library.set({ loaded: true, tracks: tracks.sort(byAdded), playlists: playlists.sort((a, b) => a.createdAt - b.createdAt), error: '' });
  } catch {
    library.set({ loaded: true, error: tr('This browser would not open its private storage, so the library cannot be kept.') });
  }
};

// A title tag copied from a video site ("… | Official Lyric Video #music") is worse than a tidy file name.
const NOISY_TITLE = /(official|lyric video|#[^\s#]|\s[|_]\s)/i;

/** Reads tags and the cover from one audio file. Never throws: an unreadable file still gets a name. */
const readTags = async (file) => {
  const parsed = parseName(file.name);
  const fallback = { title: parsed.title, artist: parsed.artist, album: '', genre: '', year: 0, duration: 0, cover: null };
  try {
    const { parseBlob } = await import('music-metadata');
    const { common, format } = await parseBlob(file, { skipPostHeaders: true });
    const picture = common.picture?.[0];
    const goodTitle = common.title && !NOISY_TITLE.test(common.title);
    return {
      title: goodTitle ? common.title : fallback.title,
      // when the file's own title was unusable the name "Artist - Song" says who made it
      artist: common.artist || common.albumartist || (goodTitle ? '' : fallback.artist),
      album: NOISY_TITLE.test(common.album ?? '') ? tidyText(common.album) : common.album || '',
      genre: common.genre?.[0] || '',
      year: common.year || 0,
      duration: format.duration || 0,
      cover: picture ? new Blob([picture.data], { type: picture.format || 'image/jpeg' }) : null,
    };
  } catch {
    return fallback;
  }
};

/**
 * Adds dropped files. Audio goes into the library (tags and cover read in the browser), `.lrc` files attach
 * lyrics to the track with the same file name. Returns { added, skipped, failed, lyrics }.
 */
export const importFiles = async (files, onProgress = () => {}) => {
  const list = [...files];
  const audio = list.filter(isAudioFile);
  const lyricFiles = list.filter(isLyricsFile);
  const known = new Set(library.get().tracks.map((t) => t.sig));
  const result = { added: 0, skipped: 0, failed: 0, lyrics: 0 };
  void requestPersistence();

  let done = 0;
  for (const file of audio) {
    onProgress({ done, total: audio.length, name: file.name });
    done += 1;
    if (known.has(signature(file))) {
      result.skipped += 1;
      continue;
    }
    try {
      const tags = await readTags(file);
      const id = crypto.randomUUID();
      const { cover, ...meta } = tags;
      const record = {
        id,
        sig: signature(file),
        fileBase: baseName(file.name),
        ...meta,
        size: file.size,
        mime: file.type || 'audio/mpeg',
        addedAt: Date.now() + done, // keeps a batch in the order it was dropped
        favorite: false,
        plays: 0,
        lyrics: '',
        hasCover: Boolean(cover),
      };
      await storage.blobs.put({ id, file });
      if (cover) await storage.covers.put({ id, file: cover });
      await storage.tracks.put(record);
      known.add(record.sig);
      library.set((s) => ({ tracks: [record, ...s.tracks].sort(byAdded) }));
      result.added += 1;
    } catch {
      result.failed += 1;
    }
  }
  onProgress({ done, total: audio.length, name: '' });

  for (const file of lyricFiles) {
    const base = baseName(file.name).toLowerCase();
    const track = library.get().tracks.find((t) => t.fileBase.toLowerCase() === base || t.title.toLowerCase() === base);
    if (track) {
      await setLyrics(track.id, await file.text());
      result.lyrics += 1;
    }
  }
  return result;
};

const update = async (id, patch) => {
  const current = library.get().tracks.find((t) => t.id === id);
  if (!current) return;
  const next = { ...current, ...patch };
  await storage.tracks.put(next);
  library.set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? next : t)) }));
};

export const toggleFavorite = (id) => update(id, { favorite: !library.get().tracks.find((t) => t.id === id)?.favorite });
export const setLyrics = (id, lyrics) => update(id, { lyrics: String(lyrics ?? ''), instrumental: false, lyricsSource: 'file' });
/** Lyrics found online (see lyricsFinder.js): LRC text when timed, plain text otherwise, '' for an instrumental. */
export const attachOnlineLyrics = (id, found) => update(id, { lyrics: found.lyrics, instrumental: Boolean(found.instrumental), lyricsSource: 'lrclib', lyricsCheckedAt: Date.now() });
/** A search that found nothing is remembered, so the same song is not asked about again and again. */
export const markLyricsChecked = (id) => update(id, { lyricsCheckedAt: Date.now() });
export const countPlay = (id) => update(id, { plays: (library.get().tracks.find((t) => t.id === id)?.plays ?? 0) + 1, playedAt: Date.now() });

export const removeTracks = async (ids) => {
  const gone = new Set(ids);
  rememberRemoved(library.get().tracks.filter((t) => gone.has(t.id)).map((t) => t.sig));
  for (const id of gone) {
    await Promise.all([storage.tracks.remove(id), storage.blobs.remove(id), storage.covers.remove(id)]);
    const url = covers.get(id);
    if (url) URL.revokeObjectURL(url);
    covers.delete(id);
  }
  const playlists = library.get().playlists.map((p) => ({ ...p, trackIds: p.trackIds.filter((id) => !gone.has(id)) }));
  await Promise.all(playlists.map((p) => storage.playlists.put(p)));
  library.set((s) => ({ tracks: s.tracks.filter((t) => !gone.has(t.id)), playlists }));
};

/**
 * Adds a few original, synthesised songs (with covers and one set of lyrics) so the player can be tried
 * without any files. They are marked `sample` so they can be removed in one go.
 */
export const addSamples = async () => {
  const { SAMPLE_LYRICS, SAMPLE_TRACKS, drawCover, encodeWav, renderTrack } = await import('./sample');
  const known = new Set(library.get().tracks.map((t) => t.sig));
  let added = 0;
  for (const [index, spec] of SAMPLE_TRACKS.entries()) {
    const sig = `sample|${spec.title}`;
    if (known.has(sig)) continue;
    const id = crypto.randomUUID();
    const samples = renderTrack({ seconds: 24, bpm: spec.bpm, root: spec.root, minor: spec.minor });
    const file = new File([encodeWav(samples)], `${spec.title}.wav`, { type: 'audio/wav' });
    const cover = await drawCover(spec);
    const record = {
      id,
      sig,
      sample: true,
      fileBase: spec.title,
      title: spec.title,
      artist: spec.artist,
      album: spec.album,
      genre: spec.genre,
      year: spec.year,
      duration: samples.length / 22050,
      size: file.size,
      mime: 'audio/wav',
      addedAt: Date.now() - index, // the first sample sits on top
      favorite: index === 0,
      plays: 0,
      lyrics: index === 0 ? SAMPLE_LYRICS : '',
      hasCover: Boolean(cover),
    };
    await storage.blobs.put({ id, file });
    if (cover) await storage.covers.put({ id, file: cover });
    await storage.tracks.put(record);
    library.set((s) => ({ tracks: [record, ...s.tracks].sort(byAdded) }));
    added += 1;
  }
  return added;
};

export const removeSamples = () => removeTracks(library.get().tracks.filter((t) => t.sample).map((t) => t.id));

export const getBlob = async (id) => (await storage.blobs.get(id))?.file ?? null;

/** An object URL for a track's cover, or '' when it has none. Cached until the track is removed. */
export const coverUrl = async (id) => {
  if (covers.has(id)) return covers.get(id);
  const row = await storage.covers.get(id);
  const url = row ? URL.createObjectURL(await cropBars(row.file)) : ''; // the plain bars around a thumbnail are cut off
  covers.set(id, url);
  return url;
};

const savePlaylist = async (playlist) => {
  await storage.playlists.put(playlist);
  library.set((s) => ({
    playlists: s.playlists.some((p) => p.id === playlist.id) ? s.playlists.map((p) => (p.id === playlist.id ? playlist : p)) : [...s.playlists, playlist],
  }));
};

export const createPlaylist = async (name, trackIds = []) => {
  const playlist = { id: crypto.randomUUID(), name: name.trim().slice(0, 60) || 'Untitled', trackIds, createdAt: Date.now() };
  await savePlaylist(playlist);
  return playlist;
};

export const addToPlaylist = async (playlistId, trackId) => {
  const playlist = library.get().playlists.find((p) => p.id === playlistId);
  if (playlist && !playlist.trackIds.includes(trackId)) await savePlaylist({ ...playlist, trackIds: [...playlist.trackIds, trackId] });
};

export const removeFromPlaylist = async (playlistId, trackId) => {
  const playlist = library.get().playlists.find((p) => p.id === playlistId);
  if (playlist) await savePlaylist({ ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId) });
};

export const deletePlaylist = async (playlistId) => {
  await storage.playlists.remove(playlistId);
  library.set((s) => ({ playlists: s.playlists.filter((p) => p.id !== playlistId) }));
};

/** Groups for the Albums / Artists views: [{ key, title, subtitle, trackIds, coverId }]. */
export const groupTracks = (tracks, by) => {
  const groups = new Map();
  for (const track of tracks) {
    const key = (by === 'album' ? track.album : track.artist) || '';
    if (!groups.has(key)) groups.set(key, { key, title: key, subtitle: '', trackIds: [], coverId: null });
    const group = groups.get(key);
    group.trackIds.push(track.id);
    if (!group.coverId && track.hasCover) group.coverId = track.id;
    if (by === 'album' && !group.subtitle) group.subtitle = track.artist;
  }
  return [...groups.values()].sort((a, b) => (a.key === '' ? 1 : b.key === '' ? -1 : a.key.localeCompare(b.key)));
};

export const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

import { tr } from '../lang';
// Finds lyrics for a song on LRCLIB (https://lrclib.net/docs): a free, open lyrics service that needs no key and allows calls
// straight from the browser. Only the title, the artist and the length of the song are sent, never the audio.
//
// The service asks clients to say who they are (the browser cannot set User-Agent, so `Lrclib-Client` is the header it offers),
// to go one request at a time with a short pause, and to wait as long as `Retry-After` says after a 429.

export const LRCLIB = 'https://lrclib.net/api';
export const CLIENT = 'Hank62 Music v1.0 (https://hank62dev.vercel.app)';

const MAX_WAIT_MS = 20_000; // a longer Retry-After than this is not worth holding the song up for
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The failure kinds the screen words differently: nothing to reach, or the service is busy / broken. */
export class LyricsError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind; // 'offline' | 'busy'
  }
}

/** "Yêu Một Người Có Lẽ (cover, ft. Hziaa)" -> "Yêu Một Người Có Lẽ": brackets and a trailing "- Topic" say nothing about the song. */
export const cleanTitle = (title) =>
  String(title ?? '')
    .replace(/[([{（【][^)\]}）】]*[)\]}）】]/gu, ' ')
    .replace(/\s+-\s+(topic|official.*|lyrics?.*)$/iu, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Artist names in a tag: "TRiCK - Topic", "Low G & JustaTee", "Lou Hoàng, Miu Lê ft. X" -> ["trick", "low g", "justatee", …]. */
export const artistNames = (artist) =>
  String(artist ?? '')
    .replace(/\s+-\s+topic$/iu, '')
    .replace(/vevo$/iu, '')
    .split(/\s*[,&;]\s*|\s+(?:and|và|x|ft\.?|feat\.?|featuring)\s+/iu) // an \"x\" is a separator only between two names: \"X Japan\" stays whole
    .map((name) => norm(name))
    .filter(Boolean);

/** Lower case, accents kept (they tell Vietnamese words apart), punctuation and spacing flattened. */
export const norm = (text) =>
  String(text ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** How well a LRCLIB record fits the song, 0 (not at all) to about 100. Below `ENOUGH` it is not used. */
export const score = (record, wanted) => {
  const title = norm(cleanTitle(record.trackName ?? record.name));
  const want = norm(wanted.title);
  if (!title || !want) return 0;
  let points = 0;
  if (title === want) points += 50;
  else if (title.includes(want) || want.includes(title)) points += 25;
  else return 0;

  if (wanted.duration > 0 && record.duration > 0) {
    const gap = Math.abs(record.duration - wanted.duration);
    if (gap <= 2) points += 30;
    else if (gap <= 5) points += 15;
    else return 0; // a different cut of the song: its timestamps would not line up
  }

  const names = artistNames(record.artistName);
  if (wanted.artists.length && names.some((name) => wanted.artists.some((a) => a.includes(name) || name.includes(a)))) points += 15;
  if (record.syncedLyrics) points += 10;
  else if (record.plainLyrics) points += 3;
  return points;
};
export const ENOUGH = 45;

const textOf = (record) => {
  if (record.instrumental) return { lyrics: '', synced: false, instrumental: true };
  const synced = String(record.syncedLyrics ?? '').trim();
  if (synced) return { lyrics: synced, synced: true, instrumental: false };
  const plain = String(record.plainLyrics ?? '').trim();
  return plain ? { lyrics: plain, synced: false, instrumental: false } : null;
};

/**
 * Asks LRCLIB for a song's lyrics. `track` is a library track ({ title, artist, album, duration }).
 * Resolves { lyrics, synced, instrumental, from: { id, title, artist } } or null when nothing fits; rejects with a LyricsError.
 * `lyrics` is LRC text when the words are timed (synced), plain text otherwise, and '' for an instrumental.
 */
export const findLyrics = async (track, { fetchImpl = fetch, sleep = wait, signal } = {}) => {
  const title = cleanTitle(track?.title);
  if (!title) return null;
  const duration = Math.round(Number(track.duration) || 0);
  const wanted = { title, duration, artists: artistNames(track.artist) };
  const headers = { 'Lrclib-Client': CLIENT };

  const call = async (path, params) => {
    for (let attempt = 0; ; attempt += 1) {
      let response;
      try {
        response = await fetchImpl(`${LRCLIB}${path}?${new URLSearchParams(params)}`, { headers, signal });
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
        throw new LyricsError('offline', tr('The lyrics service cannot be reached.'));
      }
      if (response.status === 404) return null;
      if (response.status === 429 && attempt === 0) {
        const seconds = Number(response.headers?.get?.('Retry-After')) || 2;
        if (seconds * 1000 > MAX_WAIT_MS) throw new LyricsError('busy', tr('The lyrics service is busy right now.'));
        await sleep(seconds * 1000 + Math.random() * seconds * 300); // a little jitter, as the service asks
        continue;
      }
      if (!response.ok) throw new LyricsError('busy', tr('The lyrics service is busy right now.'));
      try {
        return await response.json();
      } catch {
        throw new LyricsError('busy', tr('The lyrics service sent something unreadable.'));
      }
    }
  };
  const result = (record) => {
    const found = textOf(record);
    return found && { ...found, from: { id: record.id, title: record.trackName ?? record.name, artist: record.artistName } };
  };

  // 1. the exact signature (the service itself insists on a length within 2 seconds)
  if (wanted.artists.length && duration >= 1 && duration <= 3600) {
    const record = await call('/get', {
      track_name: title,
      artist_name: String(track.artist).replace(/\s+-\s+topic$/iu, ''),
      ...(track.album ? { album_name: track.album } : {}),
      duration: String(duration),
    });
    const found = record && result(record);
    if (found) return found;
    await sleep(300);
  }

  // 2. a search by name, with the artist first and then without it, keeping only records that fit
  const queries = [...new Set([wanted.artists[0] ? `${title} ${wanted.artists[0]}` : '', title].filter(Boolean))];
  for (const q of queries) {
    const records = await call('/search', { q });
    const best = (Array.isArray(records) ? records : [])
      .map((record) => ({ record, points: score(record, wanted) }))
      .filter(({ points, record }) => points >= ENOUGH && (record.instrumental || record.syncedLyrics || record.plainLyrics))
      .sort((a, b) => b.points - a.points)[0];
    if (best) return result(best.record);
    await sleep(300);
  }
  return null;
};

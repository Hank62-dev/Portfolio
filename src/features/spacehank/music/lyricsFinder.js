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

/** "Yêu Một Người Có Lẽ (cover, ft. Hziaa)" -> "Yêu Một Người Có Lẽ": brackets, quotes, a track number and tails like "- Topic", "| Official MV" say nothing about the song. */
export const cleanTitle = (title) =>
  String(title ?? '')
    .replace(/[([{（【][^)\]}）】]*[)\]}）】]/gu, ' ')
    .replace(/\s+[|｜].*$/u, '')
    .replace(/^\s*\d{1,3}\s*[.)-]\s+/u, '')
    .replace(/\s+-\s+(topic|official.*|lyrics?.*)$/iu, '')
    .replace(/\s+(official\s+)?(m\/?v|music\s+video|lyrics?\s+video|audio|visualizer)\s*$/iu, '')
    .replace(/["“”„«»]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Artist names in a tag: "TRiCK - Topic", "Low G & JustaTee", "Lou Hoàng, Miu Lê ft. X" -> ["trick", "low g", "justatee", …]. */
export const artistNames = (artist) =>
  String(artist ?? '')
    .replace(/\s+-\s+topic$/iu, '')
    .replace(/vevo$/iu, '')
    .split(/\s*[,&;/]\s*|\s+(?:and|và|x|ft\.?|feat\.?|featuring)\s+/iu) // an \"x\" is a separator only between two names: \"X Japan\" stays whole
    .map((name) => norm(name))
    .filter(Boolean);

/** Lower case, accents kept (they tell Vietnamese words apart), punctuation and spacing flattened. */
export const norm = (text) =>
  String(text ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** The same without accents ("Em Đừng Khóc" -> "em dung khoc"): how a title is typed in a hurry, and what the search understands. */
export const fold = (text) =>
  norm(text)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .normalize('NFC');

const accented = (text) => norm(text) !== fold(text);

/** Whether a piece of a name is only the artists: every name in it is one of `artists` (and there is at least one). */
const isArtists = (piece, artists) => {
  const names = artistNames(piece).map(fold);
  const known = artists.map(fold);
  return names.length > 0 && names.every((name) => known.some((a) => a === name || a.includes(name) || name.includes(a)));
};

const pieces = (text) =>
  cleanTitle(text)
    .split(/\s+[-–—]\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);

/**
 * What the song may be called, best guess first, from a track's tags. Files from video sites put the name in odd places:
 * '"SỚM MUỘN THÌ" - Nhâm Phương Nam x …' (in quotes), "Em Đừng Khóc - Chillies (Official Music Video)" in the album with
 * the artist as the title, "GHÉ QUA - Dick x PC x Tofu" in the album with the singers as the title. The parts that are only
 * artists are dropped (and returned as `artists`, so they count when a record is scored).
 */
export const titleCandidates = (track) => {
  const rawTitle = String(track?.title ?? '');
  const artists = artistNames(track?.artist);
  const extra = [];
  const out = [];
  const add = (name) => {
    const clean = cleanTitle(name);
    if (clean && !out.some((have) => fold(have) === fold(clean))) out.push(clean);
  };
  const keep = (text, known) => {
    const parts = pieces(text);
    const songs = parts.filter((part) => !isArtists(part, known));
    for (const part of parts) if (!songs.includes(part)) extra.push(...artistNames(part));
    return parts.length > 1 ? songs : parts;
  };

  const quoted = rawTitle.match(/["“]([^"”]{2,80})["”]/u)?.[1];
  const titleParts = keep(rawTitle, artists);
  const titleIsArtists = !quoted && (isArtists(cleanTitle(rawTitle), artists));
  // the album says "Song - Singers" and the title is those singers: the title is the artists, the song is in the album
  const albumParts = pieces(track?.album);
  const albumNamesTitle = albumParts.length > 1 && albumParts.some((part) => fold(part) === fold(cleanTitle(rawTitle)));
  const fromAlbum = albumParts.length > 1 ? keep(track.album, [...artists, ...artistNames(cleanTitle(rawTitle))]) : [];

  if (quoted) {
    add(quoted);
    extra.push(...artistNames(rawTitle.replace(/["“][^"”]*["”]/u, '').replace(/^\s*[-–—]\s*/u, '')));
  }
  if (titleIsArtists || albumNamesTitle) {
    fromAlbum.forEach(add);
    if (albumNamesTitle) extra.push(...artistNames(cleanTitle(rawTitle)));
  }
  if (!quoted) titleParts.forEach(add);
  if (!titleIsArtists && !albumNamesTitle && fromAlbum.length && !out.length) fromAlbum.forEach(add);
  if (!out.length) add(rawTitle);
  const allArtists = [...new Set([...artists, ...extra.filter(Boolean)])];
  const titles = out.filter((name) => !isArtists(name, allArtists));
  return { titles: titles.length ? titles : out.slice(0, 1), artists: allArtists };
};

const titleFit = (record, want) => {
  let best = 0;
  for (const part of [cleanTitle(record.trackName ?? record.name), ...pieces(record.trackName ?? record.name)]) {
    const title = norm(part);
    const wanted = norm(want);
    if (!title || !wanted) continue;
    const loose = !accented(part) || !accented(want); // one side was typed without accents: compare without them
    let points = 0;
    if (title === wanted) points = 50;
    else if (loose && fold(title) === fold(wanted)) points = 40;
    else if (title.includes(wanted) || wanted.includes(title)) points = 25;
    else if (loose && (fold(title).includes(fold(wanted)) || fold(wanted).includes(fold(title)))) points = 20;
    best = Math.max(best, points);
  }
  return best;
};

/**
 * How well a LRCLIB record fits the song, 0 (not at all) to about 100; below `ENOUGH` it is not used. `wanted` is
 * { title, duration, artists, cover }. A record of another length is still taken when the artist matches (or the song is a
 * cover), but only for its words: its timestamps would not line up, so `loose` comes back true and the words are shown untimed.
 */
export const fit = (record, wanted) => {
  const points0 = titleFit(record, wanted.title);
  if (!points0) return { points: 0, loose: false };
  let points = points0;
  let loose = false;
  const names = artistNames(record.artistName).map(fold);
  const artist = wanted.artists.length > 0 && names.some((name) => wanted.artists.some((a) => fold(a).includes(name) || name.includes(fold(a))));
  if (artist) points += 15;
  if (wanted.duration > 0 && record.duration > 0) {
    const gap = Math.abs(record.duration - wanted.duration);
    if (gap <= 2) points += 30;
    else if (gap <= 5) points += 15;
    else if (artist || wanted.cover) loose = true; // another cut of the same song: the words, without their timing
    else return { points: 0, loose: false };
  }
  if (record.syncedLyrics && !loose) points += 10;
  else if (record.plainLyrics || record.syncedLyrics) points += 3;
  return { points, loose };
};
export const score = (record, wanted) => fit(record, wanted).points;
export const ENOUGH = 45;

const untimed = (lrc) =>
  String(lrc ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\[[^\]]*\]/g, '').trim())
    .filter(Boolean)
    .join('\n');

const textOf = (record, loose = false) => {
  if (record.instrumental) return { lyrics: '', synced: false, instrumental: true };
  const synced = String(record.syncedLyrics ?? '').trim();
  if (synced && !loose) return { lyrics: synced, synced: true, instrumental: false };
  const plain = String(record.plainLyrics ?? '').trim() || untimed(synced);
  return plain ? { lyrics: plain, synced: false, instrumental: false } : null;
};

/**
 * Asks LRCLIB for a song's lyrics. `track` is a library track ({ title, artist, album, duration }).
 * Resolves { lyrics, synced, instrumental, from: { id, title, artist } } or null when nothing fits; rejects with a LyricsError.
 * `lyrics` is LRC text when the words are timed (synced), plain text otherwise, and '' for an instrumental.
 */
export const findLyrics = async (track, { fetchImpl = fetch, sleep = wait, signal } = {}) => {
  const { titles, artists } = titleCandidates(track);
  const title = titles[0];
  if (!title || !cleanTitle(track?.title)) return null;
  const duration = Math.round(Number(track.duration) || 0);
  const cover = /\bcover\b/iu.test(`${track.title ?? ''} ${track.album ?? ''}`);
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
  const result = (record, loose = false) => {
    const found = textOf(record, loose);
    return found && { ...found, from: { id: record.id, title: record.trackName ?? record.name, artist: record.artistName } };
  };

  // 1. the exact signature (the service itself insists on a length within 2 seconds)
  const artistTag = String(track.artist ?? '').replace(/\s+-\s+topic$/iu, '');
  if (artistTag && duration >= 1 && duration <= 3600) {
    const record = await call('/get', { track_name: title, artist_name: artistTag, ...(track.album ? { album_name: track.album } : {}), duration: String(duration) });
    const found = record && result(record);
    if (found) return found;
    await sleep(300);
  }

  // 2. a search by name. The search does not understand accents ("em đừng khóc" finds nothing, "em dung khoc" finds the
  //    song), so the name goes without them first, with the artist and then alone; the name as written comes last.
  const queries = [];
  for (const name of titles.slice(0, 2)) {
    if (artists[0]) queries.push(`${fold(name)} ${fold(artists[0])}`);
    queries.push(fold(name));
  }
  if (accented(title)) queries.push(norm(title));
  let best = null;
  for (const q of [...new Set(queries)].slice(0, 5)) {
    const records = await call('/search', { q });
    for (const record of Array.isArray(records) ? records : []) {
      if (!(record.instrumental || record.syncedLyrics || record.plainLyrics)) continue;
      for (const name of titles) {
        const { points, loose } = fit(record, { title: name, duration, artists, cover });
        if (points >= ENOUGH && (!best || points > best.points)) best = { record, points, loose };
      }
    }
    if (best && best.points >= 80) break; // right title, length and artist: no need to look further
    await sleep(300);
  }
  return best ? result(best.record, best.loose) : null;
};

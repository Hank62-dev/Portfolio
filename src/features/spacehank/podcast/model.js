import { locale, tr } from '../lang';

// Podcasts as plain data and plain functions: the ids a show and an episode are kept under, how far an episode has got,
// and what to show for it. Nothing here touches the browser, so all of it is tested.

/** A short, stable text for any text (cyrb53), so a feed address or an episode's id can be a record id. */
export const hashId = (text) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (const ch of String(text)) {
    const code = ch.codePointAt(0);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

export const showId = (feedUrl) => `show-${hashId(feedUrl)}`;
/** The id an episode's listening record is kept under: it follows the show and the episode's own guid. */
export const listenId = (show, guid) => `${show}:${hashId(guid)}`;

/** '754' seconds as '12:34', and an hour or more as '1:02:03'. */
export const clock = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

/** How long an episode is, as people say it: "45 min", "1 h 5 min". */
export const lengthWords = (seconds) => {
  const minutes = Math.round((Number(seconds) || 0) / 60);
  if (minutes < 1) return '';
  if (minutes < 60) return tr('{0} min', minutes);
  return minutes % 60 ? tr('{0} h {1} min', Math.floor(minutes / 60), minutes % 60) : tr('{0} h', Math.floor(minutes / 60));
};

/** An episode counts as heard once it is nearly over: the last twenty seconds are usually only credits. */
export const isFinished = (position, duration) => duration > 0 && (position >= duration - 20 || position / duration >= 0.97);

export const RATES = [0.8, 1, 1.25, 1.5, 1.75, 2];
/** The speed after this one, going round. A speed that is not on the list goes to the one above it. */
export const nextRate = (rate) => RATES.find((value) => value > rate + 0.001) ?? RATES[0];
export const rateLabel = (rate) => `${Number(rate.toFixed(2))}×`;

/** The day an episode came out, in the language of the page. */
export const publishedLabel = (ms, now = Date.now()) => {
  if (!ms) return '';
  const days = Math.floor((now - ms) / 86400000);
  if (days <= 0) return tr('Today');
  if (days === 1) return tr('Yesterday');
  if (days < 7) return tr('{0} days ago', days);
  const date = new Date(ms);
  return date.toLocaleDateString(locale(), { day: 'numeric', month: 'short', ...(date.getFullYear() === new Date(now).getFullYear() ? {} : { year: 'numeric' }) });
};

/** What was left half-heard, most recent first: the "continue listening" row. */
export const unfinished = (listens, limit = 6) =>
  listens
    .filter((entry) => !entry.done && entry.position >= 15 && entry.audio)
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);

/** The listening record of an episode, or a blank one. */
export const progressOf = (listens, show, guid) => listens.find((entry) => entry.id === listenId(show, guid)) ?? null;

/** 0 to 1: how much of an episode has been heard. */
export const fraction = (entry) => (entry?.done ? 1 : entry?.duration > 0 ? Math.min(1, (entry.position || 0) / entry.duration) : 0);

/** The listening record kept for an episode: enough to carry on from where it was left without asking the feed again. */
export const listenRecord = ({ show, episode, time, duration, done = false, at = Date.now() }) => {
  const length = duration > 0 ? duration : episode.duration || 0;
  return {
    id: listenId(show.id, episode.guid),
    show: show.id,
    guid: episode.guid,
    title: episode.title,
    showTitle: show.title,
    image: episode.image || show.image || '',
    audio: episode.audio,
    duration: length,
    position: Math.max(0, Math.floor(time)),
    done: done || isFinished(time, length),
    at,
  };
};

/** Where to carry on from: a little before where it was left, or the start for something new or already finished. */
export const startAt = (entry) => (entry && !entry.done && entry.position > 5 ? Math.max(0, entry.position - 3) : 0);

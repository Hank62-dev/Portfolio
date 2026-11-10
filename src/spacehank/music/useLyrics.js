import { useCallback, useEffect, useState } from 'react';
import { findLyrics } from './lyricsFinder';
import { attachOnlineLyrics, markLyricsChecked } from './library';

// A song that was searched and found nothing is searched again after a week, in case someone has added it to LRCLIB since.
const RECHECK_MS = 7 * 24 * 60 * 60 * 1000;
// the finder learned to read names from video sites and to search without accents on this day: every song it missed before gets another try
const FINDER_SINCE = Date.UTC(2026, 10, 9, 12);
const PAUSE_MS = 350; // the service asks for a short pause between requests
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One request at a time, with a pause after each, however many screens ask.
let chain = Promise.resolve();
const queued = (job) => {
  const run = chain.then(job);
  chain = run.then(() => pause(PAUSE_MS), () => pause(PAUSE_MS));
  return run;
};
const asking = new Set(); // track ids with a request on its way
const failed = new Set(); // track ids the service could not answer this visit: not retried by themselves

const hasLyrics = (track) => Boolean(String(track?.lyrics ?? '').trim());

/** Whether this song should be looked up without anyone asking: it has no lyrics, was not searched lately, and we are online. */
export const wantsLookup = (track, now = Date.now()) =>
  Boolean(track) &&
  !track.sample && // the built-in synthesised songs are not on any lyrics site
  !hasLyrics(track) &&
  !track.instrumental &&
  (now - (track.lyricsCheckedAt ?? 0) > RECHECK_MS || (track.lyricsCheckedAt ?? 0) < FINDER_SINCE) &&
  !asking.has(track.id) &&
  !failed.has(track.id) &&
  (typeof navigator === 'undefined' || navigator.onLine !== false);

/** Searches LRCLIB and keeps what it finds. Resolves 'found', 'instrumental' or 'none'; rejects with a LyricsError. */
export const lookupLyrics = async (track) => {
  const found = await queued(() => findLyrics(track));
  if (!found) {
    if (!hasLyrics(track)) await markLyricsChecked(track.id);
    return 'none';
  }
  await attachOnlineLyrics(track.id, found);
  return found.instrumental ? 'instrumental' : 'found';
};

/**
 * The lyrics of one song, found by themselves the first time the song is shown. Returns { status, find }:
 * status is 'idle' | 'loading' | 'none' | 'offline' | 'error'; find() searches again (and replaces what is there if it finds better).
 */
export function useLyrics(track) {
  const id = track?.id ?? '';
  const [state, setState] = useState({ id: '', status: 'idle' });

  const find = useCallback(async () => {
    if (!track || asking.has(track.id)) return;
    asking.add(track.id);
    failed.delete(track.id);
    setState({ id: track.id, status: 'loading' });
    try {
      const result = await lookupLyrics(track);
      setState({ id: track.id, status: result === 'none' ? 'none' : 'idle' });
    } catch (error) {
      failed.add(track.id);
      setState({ id: track.id, status: error?.kind === 'offline' ? 'offline' : 'error' });
    } finally {
      asking.delete(track.id);
    }
  }, [track]);

  useEffect(() => {
    if (wantsLookup(track)) void find();
  }, [track, find]);

  // a status belongs to the song it was found for; another song starts clean
  const status = state.id === id ? state.status : asking.has(id) ? 'loading' : 'idle';
  return { status, find };
}

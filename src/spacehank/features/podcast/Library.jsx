import { useEffect, useState } from 'react';
import { Check, Headphones, LoaderCircle, Play, Plus, Search, Sparkles } from 'lucide-react';
import { Button, Skeleton } from '../../../shared/ui';
import { Cover } from './Controls';
import { knownFeed, loadFeed } from './feeds';
import { playEpisode, podcast, setHeard } from './player';
import { clock, fraction, freshCount, latestAcross, lengthWords, progressOf, showId, unfinished } from './model';
import { listens, shows } from './store';
import { openShow } from './ui';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';
import { Eyebrow, Episode, EpisodeSkeletons } from './parts';

// The podcasts followed, with their newest episodes (the Library page of the Podcasts tab).

/** Reads the feeds of the shows that are followed (a few at a time), for "new episodes" and the badges on the covers. */
export function useFollowedFeeds(followed) {
  const key = followed.map((item) => item.feedUrl).join('\n');
  const [feeds, setFeeds] = useState(() => Object.fromEntries(followed.map((item) => [item.id, knownFeed(item.feedUrl)]).filter(([, data]) => data)));
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let live = true;
    const queue = key ? key.split('\n') : [];
    if (!queue.length) return undefined;
    setLoading(true);
    let left = queue.length;
    const worker = async () => {
      while (queue.length && live) {
        const url = queue.shift();
        try {
          const data = await loadFeed(url);
          if (live) setFeeds((now) => ({ ...now, [showId(url)]: data }));
        } catch {
          /* one feed that cannot be read does not stop the others */
        }
        left -= 1;
        if (!left && live) setLoading(false);
      }
    };
    for (let i = 0; i < 3; i += 1) void worker();
    return () => {
      live = false;
    };
  }, [key]);
  return { feeds, loading };
}

/** What is followed, what is new across it, and what was left half-heard. */
export function Library({ onFind }) {
  const { loaded, items: followed } = useStore(shows.store);
  const { items: heard } = useStore(listens.store);
  const loadedGuid = useStore(podcast, (s) => (s.episode ? `${s.show?.id}:${s.episode.guid}` : ''));
  const resume = unfinished(heard).filter((entry) => `${entry.show}:${entry.guid}` !== loadedGuid);
  const { feeds, loading } = useFollowedFeeds(followed);
  const latest = latestAcross(
    followed.filter((item) => feeds[item.id]).map((item) => ({ show: { id: item.id, feedUrl: item.feedUrl, title: item.title, image: item.image }, episodes: feeds[item.id].episodes })),
    heard
  ).filter(({ show, episode }) => `${show.id}:${episode.guid}` !== loadedGuid);

  return (
    <div className="flex flex-col gap-7">
      {resume.length > 0 && (
        <section aria-label={tr('Continue listening')}>
          <Eyebrow>{tr('Continue listening')}</Eyebrow>
          <ul className="no-scrollbar -mx-gutter flex snap-x gap-3 overflow-x-auto px-gutter pb-1">
            {resume.map((entry) => {
              const show = { id: entry.show, title: entry.showTitle, image: entry.image };
              const episode = { guid: entry.guid, title: entry.title, audio: entry.audio, image: entry.image, duration: entry.duration };
              return (
                <li key={entry.id} className="group relative w-[min(78vw,20rem)] shrink-0 snap-start">
                  <button type="button" onClick={() => playEpisode(show, episode)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-ink-1 p-3 pr-10 text-left transition-colors hover:border-line-strong">
                    <span className="relative shrink-0">
                      <Cover src={entry.image} size={56} />
                      <span className="absolute inset-0 grid place-items-center rounded-xl bg-ink-0/45 text-bone opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
                        <Play size={18} fill="currentColor" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-fine leading-snug font-medium text-bone">{entry.title}</span>
                      <small className="mt-0.5 block truncate font-mono text-[0.68rem] text-signal">{tr('{0} left', lengthWords(Math.max(0, entry.duration - entry.position)) || clock(Math.max(0, entry.duration - entry.position)))}</small>
                      <i className="mt-1.5 block h-1 overflow-hidden rounded-full bg-wash/10">
                        <b className="block h-full rounded-full bg-signal" style={{ width: `${Math.round(fraction(entry) * 100)}%` }} />
                      </i>
                    </span>
                  </button>
                  <button type="button" onClick={() => setHeard(show, episode, true)} aria-label={tr('Mark as heard')} title={tr('Mark as heard')} className="absolute top-2 right-2 grid size-7 place-items-center rounded-full text-bone-faint hover:bg-wash/10 hover:text-bone">
                    <Check size={14} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {followed.length > 0 && (latest.length > 0 || loading) && (
        <section aria-label={tr('New episodes')}>
          <Eyebrow action={loading && latest.length > 0 ? <LoaderCircle size={13} className="animate-spin text-bone-faint" aria-label={tr('Loading…')} /> : null}>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={12} aria-hidden="true" /> {tr('New episodes')}
            </span>
          </Eyebrow>
          {latest.length === 0 ? (
            <EpisodeSkeletons count={3} />
          ) : (
            <ul className="flex flex-col gap-2.5">
              {latest.map(({ show, episode }) => (
                <Episode key={`${show.id}:${episode.guid}`} show={show} episode={episode} record={progressOf(heard, show.id, episode.guid)} cover />
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-label={tr('Following')}>
        <Eyebrow
          action={
            followed.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={onFind}>
                <Plus size={14} aria-hidden="true" /> {tr('Find a podcast')}
              </Button>
            ) : null
          }
        >
          {tr('Following')}
        </Eyebrow>
        {!loaded ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : followed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line-strong px-6 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-signal-soft text-signal">
              <Headphones size={22} aria-hidden="true" />
            </span>
            <h3 className="font-display text-lead text-bone">{tr('No podcasts yet')}</h3>
            <p className="max-w-sm text-fine text-bone-dim">{tr('Find a podcast you like and follow it: its episodes show up here, and the app remembers where you stopped.')}</p>
            <Button size="sm" onClick={onFind}>
              <Search size={14} aria-hidden="true" /> {tr('Find a podcast')}
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
            {followed.map((item) => {
              const fresh = feeds[item.id] ? freshCount(item.id, feeds[item.id].episodes, heard) : 0;
              return (
                <li key={item.id}>
                  <button type="button" onClick={() => openShow(item)} className="group flex w-full flex-col gap-2 text-left">
                    <span className="relative block">
                      <Cover src={item.image} size="100%" className="aspect-square !h-auto w-full rounded-2xl shadow-lg transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.02]" />
                      {fresh > 0 && <span className="absolute top-2 right-2 rounded-full bg-signal px-2 py-0.5 font-mono text-[0.64rem] font-semibold text-ink-0 shadow">{tr('{0} new', fresh)}</span>}
                    </span>
                    <span className="line-clamp-2 text-fine leading-snug font-medium text-bone">{item.title}</span>
                    {item.author && <span className="-mt-1.5 truncate font-mono text-[0.66rem] text-bone-faint">{item.author}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

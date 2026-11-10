import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, Headphones, LoaderCircle, Pause, Play, Plus, RotateCcw, Search, Sparkles, Undo2, X } from 'lucide-react';
import { Button, Skeleton } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { podcastSearch } from '../api/owner';
import { PageHead, Segmented } from '../components/Page';
import { Cover, PlayButton, RateButton, Seek, SkipButton, SleepButton } from '../podcast/Controls';
import { knownFeed, loadFeed } from '../podcast/feeds';
import { close, playEpisode, podcast, setHeard, skip, toggle } from '../podcast/player';
import { clock, filterEpisodes, fraction, freshCount, latestAcross, lengthWords, progressOf, publishedLabel, showId, unfinished } from '../podcast/model';
import { listens, shows } from '../podcast/store';
import { openShow, podcastUi } from '../podcast/ui';
import { useStore } from '../store';
import { tr } from '../lang';
import { useDebounce } from '../../../shared/hooks/useDebounce';

// Podcasts: follow shows found in the directory, see what is new across them, listen, and carry on where you left off.
// The feed is read by the server (a browser cannot read most of them); the audio is played straight from the podcast's
// own host. The player lives in podcast/player.js, so an episode keeps playing (with a bar at the bottom) on other tabs.

const Eyebrow = ({ children, action }) => (
  <div className="mb-2.5 flex items-center justify-between gap-3">
    <h2 className="font-mono text-[0.66rem] tracking-[0.14em] text-bone-faint uppercase">{children}</h2>
    {action}
  </div>
);

const Alert = ({ children }) => (
  <p className="rounded-2xl border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-fine text-danger" role="alert">
    {children}
  </p>
);

/** Which episode is loaded in the player, as one text: so a row re-renders only when its own state changes. */
const usePlayState = (show, guid) => useStore(podcast, (s) => (s.episode?.guid === guid && s.show?.id === show ? (s.playing ? 'playing' : s.loading ? 'loading' : 'paused') : ''));

/** A play button with a ring around it that fills as the episode is heard. */
function PlayRing({ state, share, label, onClick, size = 44 }) {
  const icon = Math.round(size * 0.4);
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={clsx('relative grid shrink-0 place-items-center rounded-full transition-transform active:scale-90', state ? 'bg-bone text-ink-0' : 'bg-wash/10 text-bone hover:bg-wash/20')} style={{ width: size, height: size }}>
      {share > 0 && share < 1 && (
        <svg viewBox="0 0 100 100" className="absolute -inset-1 -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--color-signal)" strokeWidth="5" strokeLinecap="round" pathLength="100" strokeDasharray={`${share * 100} 100`} />
        </svg>
      )}
      {state === 'loading' ? <LoaderCircle size={icon} className="animate-spin" aria-hidden="true" /> : state === 'playing' ? <Pause size={icon} fill="currentColor" aria-hidden="true" /> : <Play size={icon} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
    </button>
  );
}

/** The big player at the top of the tab. It tells the bar at the bottom whether it is on screen. */
function NowPlaying() {
  const show = useStore(podcast, (s) => s.show);
  const episode = useStore(podcast, (s) => s.episode);
  const error = useStore(podcast, (s) => s.error);
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const watch = new IntersectionObserver(([entry]) => podcastUi.set({ cardVisible: entry.isIntersecting }), { threshold: 0.35 });
    watch.observe(node);
    return () => {
      watch.disconnect();
      podcastUi.set({ cardVisible: false });
    };
  }, [episode?.guid]);

  if (!episode) return null;
  const goToShow = () => {
    const known = shows.store.get().items.find((item) => item.id === show?.id);
    if (known || show?.feedUrl) openShow(known ?? show);
  };
  return (
    <section ref={ref} className="ink-panel relative flex flex-col gap-4 overflow-hidden rounded-3xl p-4 sm:p-5" aria-label={tr('Now playing')}>
      {(episode.image || show?.image) && <img src={episode.image || show.image} alt="" aria-hidden="true" referrerPolicy="no-referrer" className="pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-20 blur-3xl" />}
      <button type="button" onClick={close} aria-label={tr('Stop and close the episode')} title={tr('Stop and close the episode')} className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-bone-faint hover:bg-wash/10 hover:text-bone">
        <X size={16} aria-hidden="true" />
      </button>
      <div className="flex items-center gap-4 pr-8">
        <Cover src={episode.image || show?.image} size={88} className="rounded-2xl shadow-xl max-sm:!size-[72px]" />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={goToShow} className="max-w-full truncate font-mono text-[0.7rem] tracking-[0.12em] text-bone-faint uppercase hover:text-signal">
            {show?.title}
          </button>
          <h2 className="mt-0.5 line-clamp-2 font-display text-lead leading-snug text-bone">{episode.title}</h2>
        </div>
      </div>
      <Seek />
      <div className="flex items-center justify-between gap-2 sm:justify-center sm:gap-4">
        <SleepButton />
        <SkipButton seconds={-15} />
        <PlayButton />
        <SkipButton seconds={30} />
        <RateButton />
      </div>
      {error && <Alert>{error}</Alert>}
    </section>
  );
}

/** One episode: play it, see how far you got, read its notes, mark it heard. `cover` shows the show too (the library's rows). */
function Episode({ show, episode, record, cover = false }) {
  const state = usePlayState(show.id, episode.guid);
  const [open, setOpen] = useState(false);
  const share = fraction(record);
  const done = Boolean(record?.done);
  const left = record && !done && record.duration ? Math.max(0, record.duration - record.position) : 0;
  const play = () => (state ? toggle() : playEpisode(show, episode));
  const fromStart = async () => {
    await setHeard(show, episode, false);
    playEpisode(show, episode);
  };
  return (
    <li className={clsx('rounded-2xl border p-3 transition-colors sm:p-3.5', state ? 'border-signal/45 bg-signal-soft' : 'border-line bg-ink-1')} data-episode={episode.title}>
      <div className="flex items-center gap-3">
        {cover && <Cover src={episode.image || show.image} size={52} className="rounded-xl" />}
        <div className="min-w-0 flex-1">
          {cover && <span className="block truncate font-mono text-[0.66rem] tracking-[0.1em] text-bone-faint uppercase">{show.title}</span>}
          <span className={clsx('line-clamp-2 text-fine leading-snug font-medium', done ? 'text-bone-dim' : 'text-bone')}>{episode.title}</span>
          <small className="mt-1 flex flex-wrap items-center gap-x-1.5 font-mono text-[0.68rem] text-bone-faint">
            {publishedLabel(episode.published)}
            {episode.duration > 0 && <span>· {lengthWords(episode.duration) || clock(episode.duration)}</span>}
            {done && (
              <span className="inline-flex items-center gap-1 text-ok">
                · <Check size={11} aria-hidden="true" /> {tr('Heard')}
              </span>
            )}
            {left > 60 && <span className="text-signal">· {tr('{0} left', lengthWords(left))}</span>}
          </small>
        </div>
        {(episode.description || !cover) && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? tr('Hide the details') : tr('Show the details')} title={open ? tr('Hide the details') : tr('Show the details')} className="grid size-9 shrink-0 place-items-center rounded-full text-bone-faint hover:bg-wash/10 hover:text-bone">
            <ChevronDown size={17} className={clsx('transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
          </button>
        )}
        <PlayRing state={state} share={share} label={state === 'playing' ? tr('Pause') : tr('Play {0}', episode.title)} onClick={play} />
      </div>
      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
          {episode.description && <p className="max-w-[75ch] text-fine leading-relaxed whitespace-pre-line text-bone-dim">{episode.description}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setHeard(show, episode, !done)}>
              {done ? <Undo2 size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} {done ? tr('Mark as not heard') : tr('Mark as heard')}
            </Button>
            {(share > 0 || done) && (
              <Button variant="ghost" size="sm" onClick={fromStart}>
                <RotateCcw size={14} aria-hidden="true" /> {tr('Play from the start')}
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

const EpisodeSkeletons = ({ count = 4 }) => (
  <ul className="flex flex-col gap-2.5" aria-hidden="true">
    {Array.from({ length: count }, (_, i) => (
      <li key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-ink-1 p-3.5">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4 rounded" />
          <Skeleton className="h-2.5 w-1/3 rounded" />
        </div>
        <Skeleton className="size-11 rounded-full" />
      </li>
    ))}
  </ul>
);

const PAGE = 20;

/** A show: its details, follow or leave, play the newest, and its episodes (filtered, searched, a page at a time). */
function ShowPage({ entry }) {
  const { items: followed } = useStore(shows.store);
  const { items: heard } = useStore(listens.store);
  const cached = knownFeed(entry.feedUrl);
  const [state, setState] = useState({ loading: !cached, error: '', data: cached });
  const [only, setOnly] = useState('all');
  const [term, setTerm] = useState('');
  const search = useDebounce(term);
  const [count, setCount] = useState(PAGE);
  const [more, setMore] = useState(false);
  const id = showId(entry.feedUrl);
  const following = followed.some((item) => item.id === id);

  useEffect(() => {
    let live = true;
    window.scrollTo?.({ top: 0 });
    loadFeed(entry.feedUrl).then(
      (data) => live && setState({ loading: false, error: '', data }),
      (error) => live && setState((now) => ({ loading: false, error: error.message, data: now.data }))
    );
    return () => {
      live = false;
    };
  }, [entry.feedUrl]);

  const details = { ...entry, ...(state.data?.show ?? {}), id };
  const show = { id, feedUrl: entry.feedUrl, title: details.title, image: details.image };
  const follow = () => shows.put({ id, feedUrl: entry.feedUrl, title: details.title, author: details.author, image: details.image, createdAt: Date.now(), updatedAt: Date.now() });
  const episodes = useMemo(() => state.data?.episodes ?? [], [state.data]);
  const list = useMemo(() => filterEpisodes(episodes, heard, id, { only, term: search }), [episodes, heard, id, only, search]);
  const unheard = episodes.filter((episode) => !progressOf(heard, id, episode.guid)?.done).length;

  // the one button that matters most: carry on with what was left half-heard, else the newest not heard yet
  const half = episodes.find((episode) => {
    const record = progressOf(heard, id, episode.guid);
    return record && !record.done && record.position >= 15;
  });
  const nextUp = half ?? episodes.find((episode) => !progressOf(heard, id, episode.guid)?.done);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button variant="ghost" size="sm" onClick={() => openShow(null)}>
          <ChevronLeft size={14} aria-hidden="true" /> {tr('Podcasts')}
        </Button>
      </div>
      <header className="flex items-start gap-4 sm:gap-5">
        <Cover src={details.image} size={128} className="rounded-2xl shadow-xl max-sm:!size-24" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-h3 leading-tight text-bone">{details.title}</h2>
          {details.author && <p className="mt-1 text-fine text-bone-dim">{details.author}</p>}
          {episodes.length > 0 && <p className="mt-1 font-mono text-[0.7rem] text-bone-faint">{tr('{0} episodes · {1} not heard', episodes.length, unheard)}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {nextUp && (
              <Button size="sm" onClick={() => playEpisode(show, nextUp)}>
                <Play size={14} fill="currentColor" aria-hidden="true" /> {half ? tr('Continue listening') : tr('Play the newest')}
              </Button>
            )}
            {following ? (
              <Button variant="secondary" size="sm" onClick={() => shows.remove(id)} title={tr('Stop following')}>
                <Check size={14} aria-hidden="true" /> {tr('Following')}
              </Button>
            ) : (
              <Button variant={nextUp ? 'secondary' : 'primary'} size="sm" onClick={follow}>
                <Plus size={14} aria-hidden="true" /> {tr('Follow')}
              </Button>
            )}
          </div>
        </div>
      </header>
      {details.description && (
        <div className="max-w-[70ch]">
          <p className={clsx('text-fine leading-relaxed text-bone-dim', !more && 'line-clamp-3')}>{details.description}</p>
          {details.description.length > 180 && (
            <button type="button" onClick={() => setMore(!more)} className="mt-1 font-mono text-[0.72rem] text-signal hover:underline">
              {more ? tr('Show less') : tr('Read more')}
            </button>
          )}
        </div>
      )}
      {state.error && <Alert>{state.error}</Alert>}
      {state.loading && <EpisodeSkeletons />}
      {state.data && episodes.length === 0 && <p className="text-fine text-bone-dim">{tr('This podcast has no episodes that can be played here.')}</p>}
      {episodes.length > 0 && (
        <section aria-label={tr('Episodes')} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label={tr('Episodes')}
              value={only}
              onChange={(value) => {
                setOnly(value);
                setCount(PAGE);
              }}
              options={[
                { id: 'all', label: tr('All ({0})', episodes.length) },
                { id: 'new', label: tr('Not heard ({0})', unheard) },
              ]}
              round
            />
            {episodes.length > 8 && (
              <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-line bg-ink-1 px-3 focus-within:border-signal/60 sm:max-w-xs">
                <Search size={14} className="shrink-0 text-bone-faint" aria-hidden="true" />
                <input
                  value={term}
                  onChange={(event) => {
                    setTerm(event.target.value);
                    setCount(PAGE);
                  }}
                  aria-label={tr('Search the episodes')}
                  placeholder={tr('Search the episodes')}
                  className="min-w-0 flex-1 bg-transparent text-fine text-bone placeholder:text-bone-faint focus-visible:outline-none"
                />
                {term && (
                  <button type="button" onClick={() => setTerm('')} aria-label={tr('Clear')} className="text-bone-faint hover:text-bone">
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </label>
            )}
          </div>
          {list.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-fine text-bone-dim">{search ? tr('No episode has that in its title.') : tr('You have heard every episode.')}</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {list.slice(0, count).map((episode) => (
                <Episode key={episode.guid} show={show} episode={episode} record={progressOf(heard, id, episode.guid)} />
              ))}
            </ul>
          )}
          {list.length > count && (
            <Button variant="ghost" size="sm" className="self-center" onClick={() => setCount(count + PAGE)}>
              {tr('Show {0} more', Math.min(PAGE, list.length - count))}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}

/** Looking for a podcast by name: the results come as you type. */
function Find() {
  const { items: followed } = useStore(shows.store);
  const term = useStore(podcastUi, (s) => s.term);
  const search = useDebounce(term);
  const [state, setState] = useState({ busy: false, error: '', results: null });
  const asked = useRef(0);
  const input = useRef(null);

  useEffect(() => input.current?.focus(), []);

  useEffect(() => {
    const words = search.trim();
    const ask = ++asked.current;
    if (words.length < 2) {
      setState({ busy: false, error: '', results: null });
      return;
    }
    setState((now) => ({ ...now, busy: true, error: '' }));
    podcastSearch(words).then(
      (data) => ask === asked.current && setState({ busy: false, error: '', results: data.results }),
      (error) => ask === asked.current && setState({ busy: false, error: error.message, results: null })
    );
  }, [search]);
  const waiting = state.busy || (term.trim().length >= 2 && term !== search);

  const setTerm = (value) => podcastUi.set({ term: value });
  const followToggle = (result) => {
    const id = showId(result.feedUrl);
    if (followed.some((item) => item.id === id)) return shows.remove(id);
    return shows.put({ id, feedUrl: result.feedUrl, title: result.title, author: result.author, image: result.image, createdAt: Date.now(), updatedAt: Date.now() });
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={(event) => event.preventDefault()} className="flex items-center gap-2 rounded-2xl border border-line bg-ink-1 p-1.5 pl-4 focus-within:border-signal/60" role="search">
        {waiting ? <LoaderCircle size={16} className="shrink-0 animate-spin text-signal" aria-hidden="true" /> : <Search size={16} className="shrink-0 text-bone-faint" aria-hidden="true" />}
        <input ref={input} type="search" value={term} onChange={(event) => setTerm(event.target.value)} aria-label={tr('Search podcasts')} placeholder={tr('A podcast’s name, like “The Daily” or “Huberman Lab”')} className="h-10 min-w-0 flex-1 bg-transparent text-body text-bone placeholder:text-bone-faint focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden" />
        {term && (
          <button type="button" onClick={() => (setTerm(''), input.current?.focus())} aria-label={tr('Clear')} className="grid size-9 place-items-center rounded-full text-bone-faint hover:bg-wash/10 hover:text-bone">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </form>
      {state.error && <Alert>{state.error}</Alert>}
      {!state.results && !waiting && term.trim().length < 2 && <p className="text-fine text-bone-dim">{tr('Type at least two letters: the results show up as you type.')}</p>}
      {waiting && !state.results && (
        <ul className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-ink-1 p-3">
              <Skeleton className="size-14 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2 rounded" />
                <Skeleton className="h-2.5 w-1/3 rounded" />
              </div>
            </li>
          ))}
        </ul>
      )}
      {state.results && state.results.length === 0 && <p className="text-fine text-bone-dim">{tr('No podcast matches that. Try other words.')}</p>}
      {state.results?.length > 0 && (
        <ul className={clsx('flex flex-col gap-2 transition-opacity', waiting && 'opacity-60')} aria-label={tr('Results')}>
          {state.results.map((result) => {
            const following = followed.some((item) => item.id === showId(result.feedUrl));
            return (
              <li key={result.feedUrl} className="flex items-center gap-2 rounded-2xl border border-line bg-ink-1 p-2 pr-3 transition-colors hover:border-line-strong">
                <button type="button" onClick={() => openShow(result)} className="flex min-w-0 flex-1 items-center gap-3 p-1 text-left">
                  <Cover src={result.image} size={56} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-fine font-medium text-bone">{result.title}</span>
                    <small className="block truncate font-mono text-[0.7rem] text-bone-faint">{[result.author, result.genre].filter(Boolean).join(' · ')}</small>
                  </span>
                </button>
                <Button variant={following ? 'secondary' : 'ghost'} size="sm" onClick={() => followToggle(result)} aria-pressed={following}>
                  {following ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />} <span className="max-sm:hidden">{following ? tr('Following') : tr('Follow')}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Reads the feeds of the shows that are followed (a few at a time), for "new episodes" and the badges on the covers. */
function useFollowedFeeds(followed) {
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
function Library({ onFind }) {
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

/** Space plays or pauses, the arrows go back 15 and forward 30 seconds, while nothing is being typed. */
function useKeys() {
  useEffect(() => {
    const onKey = (event) => {
      if (!podcast.get().episode || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target.closest?.('input, textarea, select, button, [contenteditable="true"], [role="dialog"]')) return;
      if (event.key === ' ') toggle();
      else if (event.key === 'ArrowLeft') skip(-15);
      else if (event.key === 'ArrowRight') skip(30);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export default function PodcastView() {
  const tab = useStore(podcastUi, (s) => s.tab);
  const open = useStore(podcastUi, (s) => s.open); // the show being looked at
  useKeys();

  useEffect(() => {
    void shows.load();
    void listens.load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow={tr('Listen')} title={tr('Pod')} accent="casts." description={tr('Follow the shows you like, listen at your own speed, and carry on exactly where you stopped, on any device.')} />
      <NowPlaying />
      {open ? (
        <ShowPage key={open.feedUrl} entry={open} />
      ) : (
        <>
          <Segmented label={tr('Podcasts')} value={tab} onChange={(value) => podcastUi.set({ tab: value })} options={[{ id: 'library', label: tr('My podcasts') }, { id: 'find', label: tr('Find') }]} round />
          {tab === 'library' ? <Library onFind={() => podcastUi.set({ tab: 'find' })} /> : <Find />}
        </>
      )}
    </div>
  );
}

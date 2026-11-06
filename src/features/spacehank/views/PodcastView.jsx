import { useEffect, useState } from 'react';
import { Check, ChevronLeft, Headphones, LoaderCircle, Pause, Play, Plus, RotateCcw, RotateCw, Search } from 'lucide-react';
import { Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { podcastFeed, podcastSearch } from '../api/owner';
import { PageHead, Segmented } from '../components/Page';
import { podcast, playEpisode, seekTo, setRate, skip, toggle } from '../podcast/player';
import { clock, fraction, lengthWords, nextRate, progressOf, publishedLabel, rateLabel, showId, unfinished } from '../podcast/model';
import { listens, shows } from '../podcast/store';
import { useStore } from '../store';
import { tr } from '../lang';

// Podcasts: follow shows found in the directory, read their episodes, listen, and carry on where you left off. The feed is
// read by the server (a browser cannot read most of them); the audio is played straight from the podcast's own host.

function Cover({ src, size = 56, className }) {
  return (
    <span className={clsx('grid shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-3 text-bone-faint', className)} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" /> : <Headphones size={typeof size === 'number' ? Math.round(size / 2.6) : 40} aria-hidden="true" />}
    </span>
  );
}

const Round = ({ label, onClick, children, big, ...rest }) => (
  <button type="button" aria-label={label} title={label} onClick={onClick} className={clsx('grid shrink-0 place-items-center rounded-full transition-transform active:scale-90', big ? 'size-14 bg-bone text-ink-0 hover:scale-105' : 'size-11 bg-wash/10 text-bone hover:bg-wash/20')} {...rest}>
    {children}
  </button>
);

/** The episode that is loaded: where it has got to, and the controls. Shown while there is one. */
function NowPlaying() {
  const { show, episode, playing, loading, time, duration, rate, error } = useStore(podcast);
  if (!episode) return null;
  const length = duration || episode.duration || 0;
  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-line bg-[radial-gradient(80%_120%_at_0%_0%,hsl(var(--app-hue)_46%_64%/0.16),transparent_60%),var(--color-ink-1)] p-4 sm:p-5" aria-label={tr('Now playing')}>
      <div className="flex items-center gap-3.5">
        <Cover src={episode.image || show?.image} size={72} className="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[0.7rem] tracking-[0.12em] text-bone-faint uppercase">{show?.title}</p>
          <h2 className="line-clamp-2 text-body leading-snug font-medium text-bone">{episode.title}</h2>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <input type="range" min={0} max={Math.max(1, Math.floor(length))} step={1} value={Math.min(Math.floor(time), Math.max(1, Math.floor(length)))} onChange={(event) => seekTo(Number(event.target.value))} aria-label={tr('Position in the episode')} className="h-1.5 w-full cursor-pointer accent-[var(--color-signal)]" data-no-sheet-drag />
        <div className="flex justify-between font-mono text-[0.72rem] text-bone-faint tabular-nums">
          <span>{clock(time)}</span>
          <span>{length ? `-${clock(Math.max(0, length - time))}` : ''}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3">
        <button type="button" onClick={() => setRate(nextRate(rate))} aria-label={tr('Speed {0}', rateLabel(rate))} title={tr('Speed')} className="grid h-11 min-w-14 place-items-center rounded-full bg-wash/10 px-3 font-mono text-fine text-bone tabular-nums hover:bg-wash/20">
          {rateLabel(rate)}
        </button>
        <Round label={tr('Back 15 seconds')} onClick={() => skip(-15)}>
          <span className="relative grid place-items-center">
            <RotateCcw size={22} aria-hidden="true" />
            <b className="absolute text-[0.55rem] leading-none">15</b>
          </span>
        </Round>
        <Round big label={playing ? tr('Pause') : tr('Play')} onClick={() => toggle()}>
          {loading ? <LoaderCircle size={24} className="animate-spin" aria-hidden="true" /> : playing ? <Pause size={24} fill="currentColor" aria-hidden="true" /> : <Play size={24} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
        </Round>
        <Round label={tr('Forward 30 seconds')} onClick={() => skip(30)}>
          <span className="relative grid place-items-center">
            <RotateCw size={22} aria-hidden="true" />
            <b className="absolute text-[0.55rem] leading-none">30</b>
          </span>
        </Round>
        <span className="min-w-14" aria-hidden="true" />
      </div>
      {error && (
        <p className="rounded-2xl border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-fine text-danger" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

/** One episode: play it, see how far you got. */
function Episode({ show, episode, record }) {
  const now = useStore(podcast, (s) => (s.episode?.guid === episode.guid && s.show?.id === show.id ? (s.playing ? 'playing' : s.loading ? 'loading' : 'paused') : ''));
  const [open, setOpen] = useState(false);
  const share = fraction(record);
  const left = record && !record.done && record.duration ? Math.max(0, record.duration - record.position) : 0;
  return (
    <li className="rounded-2xl border border-line bg-ink-1 p-3.5" data-episode={episode.title}>
      <div className="flex items-start gap-3">
        <Round
          big={false}
          label={now === 'playing' ? tr('Pause') : tr('Play {0}', episode.title)}
          onClick={() => (now ? toggle() : playEpisode(show, episode))}
        >
          {now === 'loading' ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : now === 'playing' ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
        </Round>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-w-0 flex-1 text-left">
          <span className={clsx('line-clamp-2 text-fine leading-snug font-medium', record?.done ? 'text-bone-dim' : 'text-bone')}>{episode.title}</span>
          <small className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[0.68rem] text-bone-faint">
            {publishedLabel(episode.published)}
            {episode.duration > 0 && <span>· {lengthWords(episode.duration)}</span>}
            {record?.done && (
              <span className="inline-flex items-center gap-1 text-ok">
                <Check size={11} aria-hidden="true" /> {tr('Heard')}
              </span>
            )}
            {left > 60 && <span className="text-signal">· {tr('{0} left', lengthWords(left))}</span>}
          </small>
        </button>
      </div>
      {share > 0 && !record?.done && <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-wash/10" aria-hidden="true"><i className="block h-full rounded-full bg-signal" style={{ width: `${Math.round(share * 100)}%` }} /></div>}
      {open && episode.description && <p className="mt-3 text-fine leading-relaxed whitespace-pre-line text-bone-dim">{episode.description}</p>}
    </li>
  );
}

const EPISODES_AT_FIRST = 20;

/** A show: its details, follow or leave, and its episodes. */
function ShowPage({ entry, onBack }) {
  const { items: followed } = useStore(shows.store);
  const { items: heard } = useStore(listens.store);
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [all, setAll] = useState(false);
  const id = showId(entry.feedUrl);
  const following = followed.some((item) => item.id === id);

  useEffect(() => {
    let live = true;
    setState({ loading: true, error: '', data: null });
    podcastFeed(entry.feedUrl).then(
      (data) => live && setState({ loading: false, error: '', data }),
      (error) => live && setState({ loading: false, error: error.message, data: null })
    );
    return () => {
      live = false;
    };
  }, [entry.feedUrl]);

  const details = { ...entry, ...(state.data?.show ?? {}), id };
  const follow = () => shows.put({ id, feedUrl: entry.feedUrl, title: details.title, author: details.author, image: details.image, createdAt: Date.now(), updatedAt: Date.now() });
  const episodes = state.data?.episodes ?? [];
  const visible = all ? episodes : episodes.slice(0, EPISODES_AT_FIRST);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft size={14} aria-hidden="true" /> {tr('Podcasts')}
        </Button>
      </div>
      <header className="flex items-start gap-4">
        <Cover src={details.image} size={96} className="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-h3 leading-tight text-bone">{details.title}</h2>
          {details.author && <p className="mt-1 text-fine text-bone-dim">{details.author}</p>}
          <div className="mt-3">
            {following ? (
              <Button variant="secondary" size="sm" onClick={() => shows.remove(id)}>
                <Check size={14} aria-hidden="true" /> {tr('Following')}
              </Button>
            ) : (
              <Button size="sm" onClick={follow}>
                <Plus size={14} aria-hidden="true" /> {tr('Follow')}
              </Button>
            )}
          </div>
        </div>
      </header>
      {details.description && <p className="max-w-[70ch] text-fine leading-relaxed text-bone-dim">{details.description}</p>}
      {state.loading && (
        <p className="flex items-center gap-2 font-mono text-fine text-bone-dim" role="status">
          <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> {tr('Loading the episodes…')}
        </p>
      )}
      {state.error && (
        <p className="rounded-2xl border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-fine text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state.data && episodes.length === 0 && <p className="text-fine text-bone-dim">{tr('This podcast has no episodes that can be played here.')}</p>}
      {episodes.length > 0 && (
        <>
          <ul className="flex flex-col gap-2.5" aria-label={tr('Episodes')}>
            {visible.map((episode) => (
              <Episode key={episode.guid} show={details} episode={episode} record={progressOf(heard, id, episode.guid)} />
            ))}
          </ul>
          {!all && episodes.length > EPISODES_AT_FIRST && (
            <Button variant="ghost" size="sm" className="self-center" onClick={() => setAll(true)}>
              {tr('Show all {0} episodes', episodes.length)}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/** Looking for a podcast by name. */
function Find({ onOpen }) {
  const { items: followed } = useStore(shows.store);
  const [term, setTerm] = useState('');
  const [state, setState] = useState({ busy: false, error: '', results: null });
  const search = async (event) => {
    event.preventDefault();
    if (term.trim().length < 2) return;
    setState({ busy: true, error: '', results: null });
    try {
      setState({ busy: false, error: '', results: (await podcastSearch(term.trim())).results });
    } catch (error) {
      setState({ busy: false, error: error.message, results: null });
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={search} className="flex items-center gap-2 rounded-2xl border border-line bg-ink-1 p-1.5 pl-4 focus-within:border-signal/60">
        <Search size={16} className="shrink-0 text-bone-faint" aria-hidden="true" />
        <input value={term} onChange={(event) => setTerm(event.target.value)} aria-label={tr('Search podcasts')} placeholder={tr('A podcast’s name, like “The Daily” or “Huberman Lab”')} className="h-10 min-w-0 flex-1 bg-transparent text-body text-bone placeholder:text-bone-faint focus-visible:outline-none" />
        <Button type="submit" size="sm" loading={state.busy} disabled={term.trim().length < 2}>
          {tr('Search')}
        </Button>
      </form>
      {state.error && (
        <p className="rounded-2xl border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-fine text-danger" role="alert">
          {state.error}
        </p>
      )}
      {state.results && state.results.length === 0 && <p className="text-fine text-bone-dim">{tr('No podcast matches that. Try other words.')}</p>}
      {state.results?.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={tr('Results')}>
          {state.results.map((result) => (
            <li key={result.feedUrl}>
              <button type="button" onClick={() => onOpen(result)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-ink-1 p-3 text-left transition-colors hover:border-line-strong">
                <Cover src={result.image} size={56} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-fine font-medium text-bone">{result.title}</span>
                  <small className="block truncate font-mono text-[0.7rem] text-bone-faint">{[result.author, result.genre].filter(Boolean).join(' · ')}</small>
                </span>
                {followed.some((item) => item.id === showId(result.feedUrl)) && <Check size={16} className="shrink-0 text-ok" aria-label={tr('Following')} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** What is followed, and what was left half-heard. */
function Library({ onOpen, onFind }) {
  const { loaded, items: followed } = useStore(shows.store);
  const { items: heard } = useStore(listens.store);
  const resume = unfinished(heard);
  return (
    <div className="flex flex-col gap-6">
      {resume.length > 0 && (
        <section aria-label={tr('Continue listening')}>
          <h2 className="mb-2 font-mono text-[0.66rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Continue listening')}</h2>
          <ul className="flex flex-col gap-2">
            {resume.map((entry) => (
              <li key={entry.id}>
                <button type="button" onClick={() => playEpisode({ id: entry.show, title: entry.showTitle, image: entry.image }, { guid: entry.guid, title: entry.title, audio: entry.audio, image: entry.image, duration: entry.duration })} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-ink-1 p-3 text-left transition-colors hover:border-line-strong">
                  <Cover src={entry.image} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-fine font-medium text-bone">{entry.title}</span>
                    <small className="block truncate font-mono text-[0.7rem] text-bone-faint">{entry.showTitle} · {tr('{0} left', lengthWords(Math.max(0, entry.duration - entry.position)) || clock(Math.max(0, entry.duration - entry.position)))}</small>
                    <i className="mt-1.5 block h-1 overflow-hidden rounded-full bg-wash/10"><b className="block h-full rounded-full bg-signal" style={{ width: `${Math.round(fraction(entry) * 100)}%` }} /></i>
                  </span>
                  <Play size={16} fill="currentColor" className="shrink-0 text-bone" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-label={tr('Following')}>
        <h2 className="mb-2 font-mono text-[0.66rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Following')}</h2>
        {loaded && followed.length === 0 ? (
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
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {followed.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onOpen(item)} className="group flex w-full flex-col gap-2 text-left">
                  <Cover src={item.image} size="100%" className="aspect-square !h-auto w-full rounded-2xl transition-transform group-hover:scale-[1.02]" />
                  <span className="line-clamp-2 text-fine leading-snug font-medium text-bone">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function PodcastView() {
  const [tab, setTab] = useState('library');
  const [open, setOpen] = useState(null); // the show being looked at

  useEffect(() => {
    void shows.load();
    void listens.load();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow={tr('Listen')} title={tr('Pod')} accent="casts." description={tr('Follow the shows you like, listen at your own speed, and carry on exactly where you stopped, on any device.')} />
      <NowPlaying />
      {open ? (
        <ShowPage entry={open} onBack={() => setOpen(null)} />
      ) : (
        <>
          <Segmented label={tr('Podcasts')} value={tab} onChange={setTab} options={[{ id: 'library', label: tr('My podcasts') }, { id: 'find', label: tr('Find') }]} round />
          {tab === 'library' ? <Library onOpen={setOpen} onFind={() => setTab('find')} /> : <Find onOpen={setOpen} />}
        </>
      )}
    </div>
  );
}

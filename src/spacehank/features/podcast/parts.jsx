import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, LoaderCircle, Pause, Play, RotateCcw, Undo2, X } from 'lucide-react';
import { Button, Skeleton } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { Cover, PlayButton, RateButton, Seek, SkipButton, SleepButton } from './Controls';
import { close, playEpisode, podcast, setHeard, toggle } from './player';
import { clock, fraction, lengthWords, publishedLabel } from './model';
import { shows } from './store';
import { openShow, podcastUi } from './ui';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';

// Pieces of the Podcasts tab used on more than one of its pages: headings, alerts, the play ring, the bar of what is playing, an episode row.

// Podcasts: follow shows found in the directory, see what is new across them, listen, and carry on where you left off.
// The feed is read by the server (a browser cannot read most of them); the audio is played straight from the podcast's
// own host. The player lives in podcast/player.js, so an episode keeps playing (with a bar at the bottom) on other tabs.
export 
const Eyebrow = ({ children, action }) => (
  <div className="mb-2.5 flex items-center justify-between gap-3">
    <h2 className="font-mono text-[0.66rem] tracking-[0.14em] text-bone-faint uppercase">{children}</h2>
    {action}
  </div>
);

export const Alert = ({ children }) => (
  <p className="rounded-2xl border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-fine text-danger" role="alert">
    {children}
  </p>
);

/** Which episode is loaded in the player, as one text: so a row re-renders only when its own state changes. */
export const usePlayState = (show, guid) => useStore(podcast, (s) => (s.episode?.guid === guid && s.show?.id === show ? (s.playing ? 'playing' : s.loading ? 'loading' : 'paused') : ''));

/** A play button with a ring around it that fills as the episode is heard. */
export function PlayRing({ state, share, label, onClick, size = 44 }) {
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
export function NowPlaying() {
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
export function Episode({ show, episode, record, cover = false }) {
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

export const EpisodeSkeletons = ({ count = 4 }) => (
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

export const PAGE = 20;

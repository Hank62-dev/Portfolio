import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSheetDrag } from '../../../shared/ui/useSheetDrag';
import { useHistoryLayer } from '../../core/hooks/useHistoryLayer';
import { ChevronDown, ChevronLeft, ChevronRight, Heart, ListMusic, MoonStar, MoreHorizontal, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Trash2 } from 'lucide-react';
import { Menu } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import Cover, { useCoverTint } from './Cover';
import { deletePlaylist, formatTime, toggleFavorite } from './library';
import Lyrics from './Lyrics';
import { Orbit, SheetRow, Slider } from './parts';
import { cycleRepeat, next, playList, player, playTrack, previous, seek, setSleepTimer, toggleShuffle, togglePlay } from './player';
import { hidePlayer } from './morph';
import { canMorph } from '../../core/motion/transition';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';

// The pieces of the phone's music screen (MusicPhone): the record, headings, rows of tracks and collections, a collection's page, and what is playing.

export const GOLD = '232 178 74';

export const GROOVES =
  'conic-gradient(from 25deg, transparent 0 26%, rgb(255 255 255 / 0.1) 32%, transparent 38% 74%, rgb(255 255 255 / 0.07) 80%, transparent 86%), repeating-radial-gradient(circle at center, #0b0b0d 0 2px, #18181d 2px 3px)';

export const Layer = ({ children }) => createPortal(children, document.querySelector('.app-shell') ?? document.body);

/** A record: the cover as its label inside the grooves. It turns while `spinning`; `progress` (0 to 1) draws a ring of gold around it. */
export function Vinyl({ track, spinning, progress = null, tonearm = false, tint = GOLD, className, shared }) {
  return (
    <div className={clsx('relative aspect-square', className)} data-vinyl={shared ? '' : undefined}>
      {progress !== null && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="48.6" fill="none" stroke="rgb(255 255 255 / 0.09)" strokeWidth="0.9" />
          <circle cx="50" cy="50" r="48.6" fill="none" stroke="var(--color-signal)" strokeWidth="1.5" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(0.01, progress * 100)} 100`} style={{ transition: 'stroke-dasharray 0.4s linear', filter: 'drop-shadow(0 0 2px var(--color-signal))' }} />
        </svg>
      )}
      <div className={clsx('disc-spin absolute inset-[4.5%] rounded-full', spinning && 'on')} style={{ background: GROOVES, boxShadow: `0 30px 70px -22px rgb(${tint} / 0.65), 0 0 0 1px rgb(255 255 255 / 0.07)` }}>
        <span className="absolute top-1/2 left-1/2 aspect-square w-[60%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-ink-3 ring-[5px] ring-shade/50">
          <Cover track={track} className="size-full" rounded="rounded-none" />
        </span>
        <i className="absolute top-1/2 left-1/2 size-[4%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-0 ring-2 ring-wash/25" aria-hidden="true" />
      </div>
      {tonearm && (
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute -top-[9%] -right-[14%] w-[52%] origin-[78%_16%] transition-transform duration-[900ms] ease-out-expo" style={{ transform: `rotate(${spinning ? 21 : -6}deg)` }} aria-hidden="true">
          <circle cx="78" cy="16" r="10" fill="#1d1d22" stroke="#4a4a52" strokeWidth="1.5" />
          <circle cx="78" cy="16" r="3.5" fill="var(--color-signal)" />
          <path d="M78 16 L34 70 L27 79" fill="none" stroke="#d8d0bf" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="17" y="76" width="15" height="8" rx="2.4" transform="rotate(-38 24 80)" fill="#ece6da" />
        </svg>
      )}
    </div>
  );
}

/** A section's heading: a small gold label over a title with one word in italics. */
export const Heading = ({ eyebrow, children, action }) => (
  <div className="flex items-end justify-between gap-3 px-5">
    <div>
      <span className="block font-mono text-[0.6rem] tracking-[0.24em] text-signal uppercase">{eyebrow}</span>
      <h2 className="mt-1.5 font-display text-[1.55rem] leading-none text-bone">{children}</h2>
    </div>
    {action}
  </div>
);

/** One song as a row: a round cover that turns when it is the one playing, then the title, artist and length. */
export function TrackRow({ track, ids }) {
  const current = useStore(player, (s) => s.trackId === track.id);
  const playing = useStore(player, (s) => s.trackId === track.id && s.playing);
  return (
    <li className="flex items-center px-3" data-track={track.title}>
      <button type="button" onClick={() => (current ? togglePlay() : playTrack(track.id, ids))} aria-label={`${current && playing ? tr('Pause') : tr('Play')} ${track.title}`} className="flex min-w-0 flex-1 items-center gap-3.5 rounded-2xl px-2 py-1.5 text-left active:bg-wash/6">
        <span className="relative shrink-0">
          <Cover track={track} className={clsx('size-[3.2rem] ring-1 ring-wash/12 [animation:disc_14s_linear_infinite]', !(current && playing) && '[animation-play-state:paused]')} rounded="rounded-full" />
          <i className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-0 ring-1 ring-wash/25" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <b className={clsx('block truncate font-display text-[1.08rem] font-normal', current ? 'text-signal' : 'text-bone')}>{track.title}</b>
          <small className="mt-1 flex items-center gap-2 font-mono text-[0.68rem] text-bone-faint">
            {current && playing && (
              <span className="eq eq-on" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            )}
            <span className="truncate">{track.artist || tr('Unknown artist')}</span>
          </small>
        </span>
        <span className="shrink-0 font-mono text-[0.68rem] text-bone-faint tabular-nums">{formatTime(track.duration)}</span>
      </button>
      <button type="button" aria-label={track.favorite ? tr('Remove {0} from favorites', track.title) : tr('Add {0} to favorites', track.title)} aria-pressed={track.favorite} onClick={() => toggleFavorite(track.id)} className={clsx('grid size-11 shrink-0 place-items-center rounded-full active:scale-90', track.favorite ? 'text-signal' : 'text-bone-faint')}>
        <Heart size={18} fill={track.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    </li>
  );
}

/** An album, artist or playlist as a row: its sleeve, the name, and what it holds. */
export function CollectionRow({ item, onOpen }) {
  return (
    <li className="px-3">
      <button type="button" onClick={() => onOpen(item.open)} aria-label={tr('Open {0}', item.title)} className="flex w-full items-center gap-3.5 rounded-2xl px-2 py-1.5 text-left active:bg-wash/6">
        <Orbit tracks={item.tracks} liked={item.liked} className="size-[3.2rem] shrink-0 rounded-xl! ring-1 ring-wash/12" />
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate font-display text-[1.08rem] font-normal text-bone">{item.title}</b>
          <small className="mt-1 block font-mono text-[0.68rem] text-bone-faint">{item.sub}</small>
        </span>
        <ChevronRight size={16} className="shrink-0 text-bone-faint" aria-hidden="true" />
      </button>
    </li>
  );
}

/** The page of an album, artist or playlist: the sleeve with its record sliding out, play and shuffle, then the songs. */
export function CollectionPage({ data, playlists, onClose, onDeleted }) {
  const leave = useHistoryLayer(true, onClose);
  const drag = useSheetDrag(leave); // pull the page down to put it away
  const tint = useCoverTint(data.tracks[0]);
  const accent = data.tracks[0]?.hasCover ? tint : GOLD;
  const ids = data.tracks.map((t) => t.id);
  const nowId = useStore(player, (s) => s.trackId);
  const playing = useStore(player, (s) => s.playing);
  const repeat = useStore(player, (s) => s.repeat);
  const spinning = playing && ids.includes(nowId);
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  return (
    <Layer>
      <div className="fixed inset-0 z-[25] animate-sheet-up overflow-y-auto overscroll-contain bg-ink-0 pb-48" style={{ ...drag.style, backgroundImage: `radial-gradient(90% 40% at 50% 0%, rgb(${accent} / 0.5), transparent 75%), radial-gradient(80% 36% at 100% 100%, rgb(${accent} / 0.16), transparent 70%)` }} {...drag.bind} data-collection-page>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-2">
          <button type="button" aria-label={tr('Back')} onClick={leave} className="grid size-10 place-items-center rounded-full border border-wash/12 bg-shade/35 text-bone backdrop-blur active:scale-90">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          {data.playlist && (
            <Menu
              align="end"
              trigger={
                <button type="button" aria-label={tr('More')} className="grid size-10 place-items-center rounded-full border border-wash/12 bg-shade/35 text-bone backdrop-blur active:scale-90">
                  <MoreHorizontal size={20} aria-hidden="true" />
                </button>
              }
              items={[{ id: 'del', label: tr('Delete this playlist'), icon: Trash2, onSelect: () => { void deletePlaylist(data.playlist.id); onDeleted(); } }]}
            />
          )}
        </div>

        {/* the sleeve, and the record half out of it */}
        <div className="relative mx-auto mt-3 h-[13rem] w-[min(19.5rem,86vw)]">
          <div className={clsx('disc-spin absolute top-1/2 right-0 aspect-square h-[88%] -translate-y-1/2 rounded-full', spinning && 'on')} style={{ background: GROOVES, boxShadow: `0 20px 50px -18px rgb(${accent} / 0.6), 0 0 0 1px rgb(255 255 255 / 0.07)` }}>
            <span className="absolute top-1/2 left-1/2 aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-signal to-[#7a4b12] ring-4 ring-shade/40" />
            <i className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-0" aria-hidden="true" />
          </div>
          <Orbit tracks={data.tracks} liked={data.liked} className="absolute top-0 left-0 z-10 h-full w-auto rounded-xl! shadow-[18px_0_44px_-14px_rgb(var(--shadow-rgb)/0.85)]" />
        </div>

        <div className="px-5 pt-6">
          <span className="font-mono text-[0.62rem] tracking-[0.24em] text-signal uppercase">{data.sub ?? tr('Library')}</span>
          <h1 className="mt-1.5 font-display text-[2.2rem] leading-[1.02] text-bone">{data.title}</h1>
          <p className="mt-1.5 font-mono text-[0.72rem] text-bone-faint">{data.tracks.length} {tr('songs')}</p>
          <div className="mt-5 flex items-center gap-3">
            <button type="button" aria-label={tr('Shuffle play')} disabled={!ids.length} onClick={() => void playList(ids, { shuffle: true })} className="grid size-12 place-items-center rounded-full border border-wash/15 text-bone-dim active:scale-90 disabled:opacity-40">
              <Shuffle size={18} aria-hidden="true" />
            </button>
            {/* off, then the whole list again and again, then one song again and again */}
            <button type="button" aria-label={tr('Repeat: {0}', repeat)} aria-pressed={repeat !== 'off'} onClick={cycleRepeat} className={clsx('grid size-12 place-items-center rounded-full border active:scale-90', repeat === 'off' ? 'border-wash/15 text-bone-dim' : 'border-signal/50 bg-signal-soft text-signal')} data-repeat-list>
              <RepeatIcon size={18} aria-hidden="true" />
            </button>
            <button type="button" aria-label={tr('Play all')} disabled={!ids.length} onClick={() => void playList(ids)} className="ml-auto grid size-[3.7rem] place-items-center rounded-full bg-gradient-to-br from-signal to-[#b9791f] text-ink-0 shadow-[0_14px_30px_-10px_var(--color-signal)] ring-4 ring-signal/20 active:scale-95 disabled:opacity-40">
              <Play size={25} fill="currentColor" className="translate-x-px" aria-hidden="true" />
            </button>
          </div>
        </div>
        <ul className="mt-4 px-2" aria-label={tr('Songs')}>
          {data.tracks.length ? (
            data.tracks.map((track, i) => <SheetRow key={track.id} track={track} index={i} ids={ids} playlists={playlists} inPlaylist={Boolean(data.playlist)} onRemoveFromPlaylist={() => {}} />)
          ) : (
            <li className="px-4 py-8 text-center font-mono text-fine text-bone-faint">{tr('Nothing here yet.')}</li>
          )}
        </ul>
      </div>
    </Layer>
  );
}

/** The full-screen player: a turntable (the record turns, the tonearm lowers, a ring of gold shows the progress). */
export function NowPlaying({ tracks, byId }) {
  const { trackId, playing, loading, time, duration, shuffle, repeat, sleepAt, queue, error } = useStore(player);
  const current = tracks.find((t) => t.id === trackId) ?? null;
  const tint = useCoverTint(current);
  const accent = current?.hasCover ? tint : GOLD;
  const leave = useHistoryLayer(true, hidePlayer);
  const [morphs] = useState(canMorph);
  const drag = useSheetDrag(leave); // pull the player down to put it away
  const upNext = queue.order.slice(queue.index + 1, queue.index + 6).map((id) => byId.get(id)).filter(Boolean);
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  return (
    <Layer>
      <div className={clsx('fixed inset-0 z-[60] overflow-x-hidden overflow-y-auto overscroll-contain px-6 pt-[calc(1rem+env(safe-area-inset-top))] pb-10', !morphs && 'animate-sheet-up')} style={{ ...drag.style, background: `radial-gradient(120% 55% at 50% 0%, rgb(${accent} / 0.55), transparent 75%), radial-gradient(90% 40% at 100% 100%, rgb(${accent} / 0.18), transparent 70%), var(--color-ink-0)` }} {...drag.bind} data-now-playing-page>
        <div className="flex items-center justify-between">
          <button type="button" aria-label={tr('Close the player')} onClick={leave} className="grid size-10 place-items-center rounded-full border border-wash/12 bg-wash/8 text-bone active:scale-90">
            <ChevronDown size={22} aria-hidden="true" />
          </button>
          <span className="font-mono text-[0.62rem] tracking-[0.24em] text-bone-dim uppercase">{tr('Now playing')}</span>
          <Menu
            align="end"
            trigger={
              <button type="button" aria-label={tr('Sleep timer')} className={clsx('grid size-10 place-items-center rounded-full border border-wash/12 bg-wash/8 active:scale-90', sleepAt ? 'text-signal' : 'text-bone')}>
                <MoonStar size={18} aria-hidden="true" />
              </button>
            }
            items={[...[15, 30, 60].map((m) => ({ id: `s${m}`, label: tr('Stop after {0} min', m), onSelect: () => setSleepTimer(m) })), { id: 'off', label: tr('No sleep timer'), onSelect: () => setSleepTimer(0) }]}
          />
        </div>

        <Vinyl track={current} spinning={playing} progress={duration > 0 ? time / duration : 0} tonearm tint={accent} shared className="mx-auto mt-8 w-[min(19.5rem,80vw)]" />

        <div className="mx-auto mt-8 flex w-full max-w-[22rem] items-center gap-3">
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="truncate font-display text-[1.85rem] text-bone" data-now-title>
              {current?.title ?? tr('Nothing playing')}
            </h2>
            <p className="mt-1.5 truncate font-mono text-[0.74rem] tracking-wide text-bone-dim">{current ? [current.artist, current.album].filter(Boolean).join(' · ') || tr('Unknown artist') : tr('Pick a song from the library')}</p>
          </div>
          {current && (
            <button type="button" aria-label={current.favorite ? tr('Remove from favorites') : tr('Add to favorites')} aria-pressed={current.favorite} onClick={() => toggleFavorite(current.id)} className={clsx('grid size-11 place-items-center rounded-full active:scale-90', current.favorite ? 'text-signal' : 'text-bone-dim')}>
              <Heart size={24} fill={current.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mx-auto mt-4 w-full max-w-[22rem]">
          <Slider label={tr('Seek')} value={Math.floor(time)} max={Math.max(1, Math.floor(duration))} onChange={seek} className="w-full" />
          <div className="mt-1 flex justify-between font-mono text-[0.68rem] text-bone-faint tabular-nums">
            <span>{formatTime(time)}</span>
            <span>-{formatTime(Math.max(0, duration - time))}</span>
          </div>
        </div>

        <div className="mx-auto mt-3 flex w-full max-w-[22rem] items-center justify-between">
          <button type="button" aria-label={tr('Shuffle')} aria-pressed={shuffle} onClick={toggleShuffle} className={clsx('grid size-11 place-items-center rounded-full active:scale-90', shuffle ? 'text-signal' : 'text-bone-dim')}>
            <Shuffle size={20} aria-hidden="true" />
          </button>
          <button type="button" aria-label={tr('Previous track')} onClick={previous} className="grid size-12 place-items-center rounded-full text-bone active:scale-90">
            <SkipBack size={27} fill="currentColor" aria-hidden="true" />
          </button>
          <button type="button" aria-label={playing ? tr('Pause') : tr('Play')} onClick={togglePlay} className={clsx('grid size-[4.6rem] place-items-center rounded-full bg-gradient-to-br from-signal to-[#b9791f] text-ink-0 shadow-[0_18px_38px_-12px_var(--color-signal)] ring-[6px] ring-signal/20 active:scale-95', loading && 'animate-pulse')}>
            {playing ? <Pause size={30} fill="currentColor" aria-hidden="true" /> : <Play size={30} fill="currentColor" className="translate-x-0.5" aria-hidden="true" />}
          </button>
          <button type="button" aria-label={tr('Next track')} onClick={next} className="grid size-12 place-items-center rounded-full text-bone active:scale-90">
            <SkipForward size={27} fill="currentColor" aria-hidden="true" />
          </button>
          <button type="button" aria-label={tr('Repeat: {0}', repeat)} aria-pressed={repeat !== 'off'} onClick={cycleRepeat} className={clsx('grid size-11 place-items-center rounded-full active:scale-90', repeat !== 'off' ? 'text-signal' : 'text-bone-dim')}>
            <RepeatIcon size={20} aria-hidden="true" />
          </button>
        </div>
        {error && <p className="mt-3 text-center font-mono text-fine text-danger">{error}</p>}

        {current && (
          <section className="mx-auto mt-8 w-full max-w-[22rem] rounded-[1.75rem] border border-wash/10 bg-shade/25 p-5 backdrop-blur" aria-label={tr('Lyrics')}>
            <h3 className="font-mono text-[0.62rem] tracking-[0.24em] text-signal uppercase">{tr('Lyrics')}</h3>
            <div className="mt-3">
              <Lyrics track={current} time={time} duration={duration} compact />
            </div>
          </section>
        )}

        {upNext.length > 0 && (
          <section className="mx-auto mt-7 w-full max-w-[22rem]" aria-label={tr('Next in queue')}>
            <h3 className="mb-2 flex items-center gap-2 font-mono text-[0.62rem] tracking-[0.24em] text-signal uppercase">
              <ListMusic size={13} aria-hidden="true" /> {tr('Up next')}
            </h3>
            <ul>
              {upNext.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => playTrack(t.id, queue.order)} className="flex w-full items-center gap-3 rounded-2xl px-1 py-1.5 text-left active:bg-wash/8">
                    <Cover track={t} className="size-11 ring-1 ring-wash/12" rounded="rounded-full" />
                    <span className="min-w-0 leading-tight">
                      <b className="block truncate font-display text-[1.02rem] font-normal text-bone">{t.title}</b>
                      <small className="block truncate font-mono text-[0.68rem] text-bone-faint">{t.artist || tr('Unknown artist')}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layer>
  );
}

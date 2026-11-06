import { useEffect, useRef } from 'react';
import { Heart, MoreHorizontal, Trash2 } from 'lucide-react';
import { Menu } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { useStore } from '../store';
import Cover from './Cover';
import { addToPlaylist, createPlaylist, formatTime, removeTracks, toggleFavorite } from './library';
import { player, playTrack, queueLast, queueNext, togglePlay } from './player';
import { tr } from '../lang';

// Small pieces of the music screens that the desktop room and the phone app both use.

export const MOODS = ['Focus', tr('Late night'), tr('Rainy day'), 'Upbeat', 'Calm'];

export const matches = (track, q) => !q || `${track.title} ${track.artist} ${track.album} ${track.genre}`.toLowerCase().includes(q.toLowerCase());

/** A thin range slider that fills as it goes (styles in index.css). */
export function Slider({ label, value, max, step = 1, onChange, className }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return <input type="range" aria-label={label} min={0} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={clsx('player-range', className)} style={{ '--fill': `${pct}%` }} />;
}

/** A round picture for a collection: a gradient heart, up to four covers as quarters, or one cover. */
export function Orbit({ tracks = [], liked, className }) {
  const withArt = tracks.filter((t) => t.hasCover);
  return (
    <span className={clsx('relative block aspect-square shrink-0 overflow-hidden rounded-full', className)}>
      {liked ? (
        <span className="grid size-full place-items-center bg-gradient-to-br from-signal via-[#ff8a5c] to-[#8a3bff] text-ink-0">
          <Heart size="38%" fill="currentColor" aria-hidden="true" />
        </span>
      ) : withArt.length >= 4 ? (
        <span className="grid size-full grid-cols-2">
          {withArt.slice(0, 4).map((t) => (
            <Cover key={t.id} track={t} className="size-full" rounded="rounded-none" />
          ))}
        </span>
      ) : (
        <Cover track={withArt[0] ?? tracks[0]} className="size-full" rounded="rounded-none" />
      )}
    </span>
  );
}

/** Lyrics as a soft ribbon: the line being sung is bright, and the others fade and blur away from it. */
export function Ribbon({ lines, active, className = 'max-h-[300px] md:max-h-[540px]' }) {
  const box = useRef(null);
  useEffect(() => {
    const el = box.current?.querySelector('[data-active="true"]');
    if (el && box.current) box.current.scrollTo({ top: el.offsetTop - box.current.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
  }, [active]);
  return (
    <div ref={box} className={clsx('relative overflow-y-auto py-24 [mask-image:linear-gradient(transparent,#000_28%,#000_72%,transparent)]', className)} aria-label={tr('Lyrics')} tabIndex={0}>
      {lines.map((line, i) => {
        const d = Math.abs(i - active);
        return (
          <p
            key={`${line.time}-${i}`}
            data-active={i === active}
            className="origin-left py-1.5 font-display text-h3 leading-tight text-bone transition-all duration-700"
            style={{ opacity: i === active ? 1 : Math.max(0.12, 0.5 - d * 0.14), filter: `blur(${i === active ? 0 : Math.min(3, d * 0.9)}px)`, transform: `scale(${i === active ? 1 : 0.9})` }}
          >
            {line.text || ' '}
          </p>
        );
      })}
    </div>
  );
}

export function SheetRow({ track, index, ids, playlists, inPlaylist, onRemoveFromPlaylist }) {
  const current = useStore(player, (s) => s.trackId === track.id);
  const playing = useStore(player, (s) => s.trackId === track.id && s.playing);
  const items = [
    { id: 'next', label: tr('Play next'), onSelect: () => queueNext(track.id) },
    { id: 'last', label: tr('Add to queue'), onSelect: () => queueLast(track.id) },
    ...playlists.map((p) => ({ id: `pl-${p.id}`, label: tr('Add to {0}', p.name), onSelect: () => addToPlaylist(p.id, track.id) })),
    { id: 'new', label: tr('Add to a new playlist'), onSelect: () => createPlaylist(track.album || track.title, [track.id]) },
    ...(inPlaylist ? [{ id: 'out', label: tr('Remove from this playlist'), onSelect: onRemoveFromPlaylist }] : []),
    { id: 'rm', label: tr('Delete from library'), icon: Trash2, onSelect: () => removeTracks([track.id]) },
  ];
  return (
    <li className={clsx('group flex items-center gap-3 rounded-2xl px-2.5 py-1.5 transition-colors hover:bg-wash/8', current && 'bg-wash/10')} data-sheet-track={track.title}>
      <button type="button" onClick={() => (current ? togglePlay() : playTrack(track.id, ids))} aria-label={tr('{0} {1} from the list', playing ? tr('Pause') : tr('Play'), track.title)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="w-5 shrink-0 text-center font-mono text-[0.72rem] text-bone-faint tabular-nums">{index + 1}</span>
        <Cover track={track} className="size-10" rounded="rounded-full" />
        <span className="min-w-0 leading-tight">
          <b className={clsx('block truncate text-fine font-medium', current ? 'text-signal' : 'text-bone')}>{track.title}</b>
          <small className="block truncate font-mono text-[0.72rem] text-bone-faint">{track.artist || tr('Unknown artist')}</small>
        </span>
      </button>
      <span className="font-mono text-[0.72rem] text-bone-faint tabular-nums max-sm:hidden">{formatTime(track.duration)}</span>
      <button type="button" aria-label={track.favorite ? tr('Remove {0} from favorites in the list', track.title) : tr('Add {0} to favorites in the list', track.title)} aria-pressed={track.favorite} onClick={() => toggleFavorite(track.id)} className={clsx('grid size-8 place-items-center rounded-full hover:text-signal', track.favorite ? 'text-signal' : 'text-bone-faint')}>
        <Heart size={15} fill={track.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
      <Menu align="end" trigger={<button type="button" aria-label={tr('More for {0}', track.title)} className="grid size-8 place-items-center rounded-full text-bone-faint hover:text-bone"><MoreHorizontal size={16} aria-hidden="true" /></button>} items={items} />
    </li>
  );
}


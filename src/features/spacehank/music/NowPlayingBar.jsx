import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { useStore } from '../store';
import Cover from './Cover';
import { formatTime, library } from './library';
import { cycleRepeat, next, player, previous, seek, setVolume, toggleShuffle, togglePlay } from './player';

/** The player's controls, fixed to the bottom of the workspace so music carries on across every tab. */
export default function NowPlayingBar({ onOpen }) {
  const { trackId, playing, loading, time, duration, volume, shuffle, repeat, error } = useStore(player);
  const track = useStore(library, (s) => s.tracks.find((t) => t.id === trackId));
  if (!track) return null;

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const progress = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <div
      role="region"
      aria-label="Now playing"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line-strong bg-ink-1/95 backdrop-blur"
      data-now-playing
    >
      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={Math.max(1, Math.floor(duration))}
        value={Math.floor(time)}
        onChange={(e) => seek(Number(e.target.value))}
        className="absolute inset-x-0 -top-2 h-4 w-full cursor-pointer opacity-0"
      />
      <i className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-line" aria-hidden="true" />
      <i className="pointer-events-none absolute top-0 left-0 h-0.5 bg-signal" style={{ width: `${progress}%` }} aria-hidden="true" />

      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-gutter py-2.5">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label="Open Hank Music">
          <Cover track={track} className="size-11" />
          <span className="min-w-0 leading-tight">
            <b className="block truncate text-fine font-medium text-bone" data-now-title>
              {track.title}
            </b>
            <small className="block truncate font-mono text-[0.72rem] text-bone-faint">{error || track.artist || 'Unknown artist'}</small>
          </span>
        </button>

        <div className="flex items-center gap-1">
          <Button variant="secondary" size="icon" aria-label="Shuffle" aria-pressed={shuffle} className={clsx('max-sm:hidden', shuffle && 'text-signal')} onClick={toggleShuffle}>
            <Shuffle size={15} aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="icon" aria-label="Previous track" onClick={previous}>
            <SkipBack size={15} aria-hidden="true" />
          </Button>
          <Button size="icon" aria-label={playing ? 'Pause' : 'Play'} loading={loading} onClick={togglePlay}>
            {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          </Button>
          <Button variant="secondary" size="icon" aria-label="Next track" onClick={next}>
            <SkipForward size={15} aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="icon" aria-label={`Repeat: ${repeat}`} className={clsx('max-sm:hidden', repeat !== 'off' && 'text-signal')} onClick={cycleRepeat}>
            <RepeatIcon size={15} aria-hidden="true" />
          </Button>
        </div>

        <span className="w-[5.5rem] text-right font-mono text-[0.72rem] text-bone-faint tabular-nums max-md:hidden">
          {formatTime(time)} / {formatTime(duration)}
        </span>

        <label className="flex items-center gap-2 text-bone-faint max-lg:hidden">
          {volume === 0 ? <VolumeX size={15} aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />}
          <span className="sr-only">Volume</span>
          <input type="range" min={0} max={1} step={0.02} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-24 accent-[var(--color-signal)]" />
        </label>
      </div>
    </div>
  );
}

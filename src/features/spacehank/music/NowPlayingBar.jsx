import { useEffect, useRef, useState } from 'react';
import { Heart, ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { useStore } from '../store';
import Cover from './Cover';
import { formatTime, library, toggleFavorite } from './library';
import { cycleRepeat, next, player, previous, seek, setVolume, stop, toggleShuffle, togglePlay } from './player';

const Icon = ({ label, active, onClick, children, className, ...rest }) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active}
    onClick={onClick}
    className={clsx('grid size-8 place-items-center rounded-full transition-colors hover:text-bone', active ? 'text-signal' : 'text-bone-dim', className)}
    {...rest}
  >
    {children}
  </button>
);

/** A slim range input that fills with the accent up to its value. */
function Slider({ label, value, max, step = 1, onChange, className }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <input
      type="range"
      aria-label={label}
      min={0}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={clsx('player-range', className)}
      style={{ '--fill': `${pct}%` }}
    />
  );
}

/** The player: track on the left, transport and progress in the middle, queue and volume on the right. */
export default function NowPlayingBar({ onOpen, lifted = false, rail = false }) {
  const { trackId, playing, loading, time, duration, volume, shuffle, repeat, error } = useStore(player);
  const track = useStore(library, (s) => s.tracks.find((t) => t.id === trackId));

  // on a phone, swipe the mini player to the right to put the music away
  const [slide, setSlide] = useState({ x: 0, dragging: false });
  const touch = useRef(null);
  useEffect(() => setSlide({ x: 0, dragging: false }), [trackId]);
  const onTouchStart = (e) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, locked: false };
  };
  const onTouchMove = (e) => {
    const from = touch.current;
    if (!from) return;
    const dx = e.touches[0].clientX - from.x;
    const dy = e.touches[0].clientY - from.y;
    if (!from.locked && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.4) from.locked = true;
    if (from.locked) setSlide({ x: Math.max(0, dx), dragging: true });
  };
  const onTouchEnd = () => {
    const away = touch.current?.locked && slide.x > 90;
    touch.current = null;
    if (away) {
      navigator.vibrate?.(10);
      setSlide({ x: window.innerWidth, dragging: false });
      window.setTimeout(stop, 220);
    } else setSlide({ x: 0, dragging: false });
  };

  if (!track) return null;

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  // on a phone: a glass capsule with the record turning inside a ring of progress; swipe it right to put the music away
  if (lifted) {
    const ratio = duration > 0 ? Math.min(1, time / duration) : 0;
    return (
      <div
        role="region"
        aria-label="Now playing"
        data-now-playing
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={slide.x ? { transform: `translateX(${slide.x}px)`, opacity: Math.max(0, 1 - slide.x / 280), transition: slide.dragging ? 'none' : 'transform 0.22s ease-out, opacity 0.22s ease-out' } : undefined}
        className="fixed inset-x-3 bottom-[calc(6.4rem+env(safe-area-inset-bottom))] z-30 touch-pan-y"
      >
        <div className="flex items-center gap-2.5 rounded-full border border-wash/12 bg-ink-1/80 p-1.5 pr-2 shadow-[0_20px_44px_-16px_rgb(var(--shadow-rgb)/0.95)] backdrop-blur-2xl">
          <button type="button" onClick={onOpen} aria-label="Open Hank Music" className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="relative size-[3.1rem] shrink-0">
              <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r="47" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="3" />
                <circle cx="50" cy="50" r="47" fill="none" stroke="var(--color-signal)" strokeWidth="4" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(0.01, ratio * 100)} 100`} />
              </svg>
              <Cover track={track} className={clsx('absolute inset-[9%] [animation:disc_14s_linear_infinite]', !playing && '[animation-play-state:paused]')} rounded="rounded-full" />
              <i className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-0 ring-1 ring-wash/30" aria-hidden="true" />
            </span>
            <span className="min-w-0 leading-tight">
              <b className="block truncate font-display text-[1.02rem] font-normal text-bone" data-now-title>
                {track.title}
              </b>
              <small className="block truncate font-mono text-[0.68rem] text-bone-faint">{error || track.artist || 'Unknown artist'}</small>
            </span>
          </button>
          <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay} className={clsx('grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-signal to-[#b9791f] text-ink-0 shadow-[0_10px_22px_-10px_var(--color-signal)] active:scale-90', loading && 'animate-pulse')}>
            {playing ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
          </button>
          <button type="button" aria-label="Next track" onClick={next} className="grid size-9 shrink-0 place-items-center rounded-full text-bone-dim active:scale-90">
            <SkipForward size={18} fill="currentColor" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Now playing"
      onTouchStart={lifted ? onTouchStart : undefined}
      onTouchMove={lifted ? onTouchMove : undefined}
      onTouchEnd={lifted ? onTouchEnd : undefined}
      onTouchCancel={lifted ? onTouchEnd : undefined}
      style={lifted && slide.x ? { transform: `translateX(${slide.x}px)`, opacity: Math.max(0, 1 - slide.x / 280), transition: slide.dragging ? 'none' : 'transform 0.22s ease-out, opacity 0.22s ease-out' } : undefined}
      className={clsx('fixed z-30 border-line bg-ink-0/90 backdrop-blur-xl', lifted ? 'touch-pan-y inset-x-2.5 bottom-[calc(6.4rem+env(safe-area-inset-bottom))] overflow-hidden rounded-2xl border bg-ink-1/95 shadow-[0_18px_40px_-14px_rgb(var(--shadow-rgb)/0.9)]' : clsx('right-0 bottom-0 border-t transition-[left] duration-300 ease-out-expo', rail ? 'left-[68px]' : 'left-64'))}
      data-now-playing
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-[1fr_auto] items-center gap-3 px-3 py-2 md:py-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] md:gap-6 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onOpen} aria-label="Open Hank Music" className="flex min-w-0 items-center gap-3 text-left">
            <Cover track={track} className="size-11 shadow-lg md:size-12" rounded="rounded-md" />
            <span className="min-w-0 leading-tight">
              <b className="block truncate text-fine font-medium text-bone" data-now-title>
                {track.title}
              </b>
              <small className="block truncate font-mono text-[0.72rem] text-bone-faint">{error || track.artist || 'Unknown artist'}</small>
            </span>
          </button>
          <Icon label={track.favorite ? 'Remove from favorites' : 'Add to favorites'} active={track.favorite} onClick={() => toggleFavorite(track.id)} className="max-sm:hidden">
            <Heart size={16} fill={track.favorite ? 'currentColor' : 'none'} aria-hidden="true" />
          </Icon>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <Icon label="Shuffle" active={shuffle} onClick={toggleShuffle} className="max-sm:hidden">
              <Shuffle size={15} aria-hidden="true" />
            </Icon>
            <Icon label="Previous track" onClick={previous} className="max-sm:hidden">
              <SkipBack size={17} fill="currentColor" aria-hidden="true" />
            </Icon>
            <button
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={togglePlay}
              className={clsx('grid size-10 place-items-center rounded-full bg-bone text-ink-0 transition-transform hover:scale-105 active:scale-95', loading && 'animate-pulse')}
            >
              {playing ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
            </button>
            <Icon label="Next track" onClick={next}>
              <SkipForward size={17} fill="currentColor" aria-hidden="true" />
            </Icon>
            <Icon label={`Repeat: ${repeat}`} active={repeat !== 'off'} onClick={cycleRepeat} className="max-sm:hidden">
              <RepeatIcon size={15} aria-hidden="true" />
            </Icon>
          </div>
          <div className="flex w-full items-center gap-2.5 max-md:hidden">
            <span className="w-9 text-right font-mono text-[0.68rem] text-bone-faint tabular-nums">{formatTime(time)}</span>
            <Slider label="Seek" value={Math.floor(time)} max={Math.max(1, Math.floor(duration))} onChange={seek} className="flex-1" />
            <span className="w-9 font-mono text-[0.68rem] text-bone-faint tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1 max-md:hidden">
          <Icon label="Open the queue" onClick={onOpen}>
            <ListMusic size={16} aria-hidden="true" />
          </Icon>
          <button type="button" aria-label={volume === 0 ? 'Unmute' : 'Mute'} onClick={() => setVolume(volume === 0 ? 0.8 : 0)} className="grid size-8 place-items-center text-bone-dim hover:text-bone">
            {volume === 0 ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
          </button>
          <Slider label="Volume" value={volume} max={1} step={0.02} onChange={setVolume} className="w-24" />
        </div>
      </div>
      {/* on a phone the progress runs along the top edge */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-line md:hidden" aria-hidden="true">
        <i className="block h-full bg-signal" style={{ width: `${duration > 0 ? Math.min(100, (time / duration) * 100) : 0}%` }} />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Headphones, LoaderCircle, Moon, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { useStore } from '../store';
import { tr } from '../lang';
import { clock, nextRate, nextSleep, rateLabel } from './model';
import { podcast, seekTo, setRate, setSleep, skip, toggle } from './player';

// The pieces of the podcast player, shared by the big player on the Podcast tab and the bar that follows you to the
// other tabs, so the two always look and behave the same.

export function Cover({ src, size = 56, className }) {
  return (
    <span className={clsx('grid shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-3 text-bone-faint', className)} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" /> : <Headphones size={typeof size === 'number' ? Math.round(size / 2.6) : 40} aria-hidden="true" />}
    </span>
  );
}

/** Back 15 seconds or forward 30: the circular arrow with the number inside. */
export function SkipButton({ seconds, small = false, className }) {
  const back = seconds < 0;
  const Icon = back ? RotateCcw : RotateCw;
  const label = back ? tr('Back 15 seconds') : tr('Forward 30 seconds');
  return (
    <button type="button" aria-label={label} title={label} onClick={() => skip(seconds)} className={clsx('grid shrink-0 place-items-center rounded-full text-bone transition-[transform,background-color] active:scale-90', small ? 'size-9 hover:bg-wash/10' : 'size-11 bg-wash/10 hover:bg-wash/20', className)}>
      <span className="relative grid place-items-center">
        <Icon size={small ? 19 : 22} aria-hidden="true" />
        <b className={clsx('absolute leading-none', small ? 'text-[0.5rem]' : 'text-[0.55rem]')}>{Math.abs(seconds)}</b>
      </span>
    </button>
  );
}

export function PlayButton({ size = 'lg', className }) {
  const playing = useStore(podcast, (s) => s.playing);
  const loading = useStore(podcast, (s) => s.loading);
  const icon = size === 'lg' ? 24 : 18;
  return (
    <button
      type="button"
      aria-label={playing ? tr('Pause') : tr('Play')}
      onClick={() => toggle()}
      className={clsx('grid shrink-0 place-items-center rounded-full bg-bone text-ink-0 transition-transform hover:scale-105 active:scale-90', size === 'lg' ? 'size-14' : 'size-10', className)}
    >
      {loading && !playing ? <LoaderCircle size={icon} className="animate-spin" aria-hidden="true" /> : playing ? <Pause size={icon} fill="currentColor" aria-hidden="true" /> : <Play size={icon} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
    </button>
  );
}

const pill = 'grid h-9 min-w-12 shrink-0 place-items-center rounded-full px-2.5 font-mono text-[0.72rem] tabular-nums transition-colors';

export function RateButton({ className }) {
  const rate = useStore(podcast, (s) => s.rate);
  return (
    <button type="button" onClick={() => setRate(nextRate(rate))} aria-label={tr('Speed {0}', rateLabel(rate))} title={tr('Speed')} className={clsx(pill, rate === 1 ? 'bg-wash/10 text-bone hover:bg-wash/20' : 'bg-signal-soft text-signal', className)}>
      {rateLabel(rate)}
    </button>
  );
}

/** The sleep timer: each tap adds a step (15, 30, 45, 60 minutes, off); while it runs it shows the minutes left. */
export function SleepButton({ className }) {
  const sleepAt = useStore(podcast, (s) => s.sleepAt);
  const minutes = useStore(podcast, (s) => s.sleepMinutes);
  useStore(podcast, (s) => Math.floor(s.time / 30)); // a fresh count of the minutes every little while
  const left = sleepAt ? Math.max(1, Math.ceil((sleepAt - Date.now()) / 60000)) : 0;
  const label = left ? tr('Sleep timer: {0} min left', left) : tr('Sleep timer');
  return (
    <button type="button" onClick={() => setSleep(nextSleep(minutes))} aria-label={label} title={label} className={clsx(pill, 'gap-1', left ? 'flex bg-signal-soft text-signal' : 'bg-wash/10 text-bone hover:bg-wash/20', className)}>
      <Moon size={14} aria-hidden="true" />
      {left ? <span>{tr('{0} min', left)}</span> : null}
    </button>
  );
}

/**
 * Where the episode has got to. Dragging shows the time under the finger but only asks the audio to move once it is let
 * go: a podcast is streamed, and seeking on every step of a drag makes it stall.
 */
export function Seek({ compact = false, className }) {
  const time = useStore(podcast, (s) => Math.floor(s.time));
  const duration = useStore(podcast, (s) => Math.floor(s.duration || s.episode?.duration || 0));
  const [drag, setDrag] = useState(null);
  const max = Math.max(1, duration);
  const value = Math.min(drag ?? time, max);
  const commit = () => {
    if (drag === null) return;
    seekTo(drag);
    setDrag(null);
  };
  const range = (
    <input
      type="range"
      min={0}
      max={max}
      step={1}
      value={value}
      onChange={(event) => setDrag(Number(event.target.value))}
      onPointerUp={commit}
      onKeyUp={commit}
      onTouchEnd={commit}
      onBlur={commit}
      aria-label={tr('Position in the episode')}
      aria-valuetext={`${clock(value)} / ${clock(duration)}`}
      className={clsx('player-range', compact ? 'flex-1' : 'w-full')}
      style={{ '--fill': `${(value / max) * 100}%` }}
      data-no-sheet-drag
    />
  );
  if (compact) {
    return (
      <div className={clsx('flex items-center gap-2.5', className)}>
        <span className="w-12 text-right font-mono text-[0.68rem] text-bone-faint tabular-nums">{clock(value)}</span>
        {range}
        <span className="w-12 font-mono text-[0.68rem] text-bone-faint tabular-nums">{duration ? `-${clock(Math.max(0, duration - value))}` : ''}</span>
      </div>
    );
  }
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {range}
      <div className="flex justify-between font-mono text-[0.72rem] text-bone-faint tabular-nums">
        <span>{clock(value)}</span>
        <span>{duration ? `-${clock(Math.max(0, duration - value))}` : ''}</span>
      </div>
    </div>
  );
}

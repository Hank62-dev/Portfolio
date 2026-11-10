import { BellOff, Pause, Play, X } from 'lucide-react';
import { clsx } from '../../shared/lib/format';
import { dismiss, focus, pause, reset, start } from '../focus/store';
import { useStore } from '../store';
import { clock } from '../study/model';
import { tr } from '../lang';

/**
 * The Focus timer as a widget that floats above every screen while it runs (and while it rings), so you never have to go
 * back to Study Hub to see the time. Tapping it opens the timer.
 */
export default function FocusWidget({ onOpen }) {
  const { mode, status, total, left } = useStore(focus);
  if (status === 'idle') return null;
  const ringing = status === 'done';
  const progress = total > 0 ? 1 - left / total : 0;
  const name = mode === 'focus' ? 'Focus' : 'Break';
  return (
    <div
      role="timer"
      aria-label={ringing ? tr('{0} finished', name) : tr('{0}: {1} left', name, clock(left))}
      className="fixed top-[calc(4.9rem+env(safe-area-inset-top))] left-1/2 z-30 w-[min(23rem,calc(100vw-1.5rem))] -translate-x-1/2 animate-fade-in md:top-20"
      data-focus-widget
    >
      <div className={clsx('flex items-center gap-2.5 rounded-full border bg-ink-1/85 p-1.5 pr-2 shadow-[0_18px_40px_-14px_rgb(var(--shadow-rgb)/0.95)] backdrop-blur-2xl', ringing ? 'border-signal/70 shadow-[0_0_0_4px_var(--color-signal-soft)]' : 'border-wash/12')}>
        <button type="button" onClick={onOpen} aria-label={tr('Open the Focus timer')} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="relative size-11 shrink-0">
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="7" />
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--color-signal)" strokeWidth="8" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(0.01, progress * 100)} 100`} className="transition-[stroke-dasharray] duration-300" />
            </svg>
            <span className={clsx('absolute inset-0 grid place-items-center font-mono text-[0.6rem] tracking-wide text-bone-dim uppercase', ringing && 'animate-pulse text-signal')}>{mode === 'focus' ? tr('F') : tr('B')}</span>
          </span>
          <span className="min-w-0 leading-tight">
            <b className="block font-display text-[1.35rem] font-normal text-bone tabular-nums" data-widget-clock>
              {ringing ? tr('Time is up') : clock(left)}
            </b>
            <small className="block truncate font-mono text-[0.66rem] text-bone-faint">{ringing ? tr('{0} finished', name) : status === 'paused' ? tr('{0} paused', name) : tr('{0} · keep going', name)}</small>
          </span>
        </button>
        {ringing ? (
          <button type="button" aria-label={tr('Stop the alarm')} onClick={dismiss} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-signal px-4 font-mono text-[0.78rem] font-medium text-ink-0 active:scale-95">
            <BellOff size={15} aria-hidden="true" /> {tr('Stop')}
          </button>
        ) : (
          <>
            <button type="button" aria-label={status === 'running' ? tr('Pause the timer') : tr('Resume the timer')} onClick={status === 'running' ? pause : start} className="grid size-10 shrink-0 place-items-center rounded-full bg-bone text-ink-0 active:scale-90">
              {status === 'running' ? <Pause size={17} fill="currentColor" aria-hidden="true" /> : <Play size={17} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
            </button>
            <button type="button" aria-label={tr('Stop the timer')} onClick={reset} className="grid size-9 shrink-0 place-items-center rounded-full text-bone-dim active:scale-90">
              <X size={17} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

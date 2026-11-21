import { useEffect } from 'react';
import { Check, Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react';
import { clsx } from '../../../shared/lib/format';
import { useTheme } from '../../../shared/lib/theme';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';
import { celebrate } from '../../core/celebrate';
import { sound } from '../../core/sound';
import { clock } from '../study/model';
import { missions } from '../missions/store';
import { moveCard } from '../missions/model';
import { library } from '../music/library';
import { next, player, togglePlay } from '../music/player';
import Cover from '../music/Cover';
import { WallpaperCanvas } from '../wallpaper/Wallpaper';
import { tasksForToday } from '../today/model';
import { MODES, focus, pause, reset, setMode, start } from './store';

/**
 * Focus mode: the whole screen gives way to one thing. Rain falls behind (a calm scene by night, the same one paler by day), the
 * timer stands large in the middle, under it the one task that matters most today (ticked off from here), and at the bottom what
 * is playing. Escape, or the cross, brings the workspace back.
 */
export default function FocusMode({ onClose }) {
  const { theme } = useTheme();
  const { mode, status, total, left } = useStore(focus);
  const cards = useStore(missions.store, (s) => s.items);
  const top = tasksForToday(cards)[0];
  const trackId = useStore(player, (s) => s.trackId);
  const playing = useStore(player, (s) => s.playing);
  const track = useStore(library, (s) => s.tracks.find((t) => t.id === trackId));
  const progress = total > 0 ? 1 - left / total : 0;
  const running = status === 'running';

  useEffect(() => {
    void missions.load();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        if (running) pause();
        else start();
      }
    };
    window.addEventListener('keydown', onKey);
    document.documentElement.dataset.focusMode = '';
    return () => {
      window.removeEventListener('keydown', onKey);
      delete document.documentElement.dataset.focusMode;
    };
  }, [onClose, running]);

  const finishTop = (event) => {
    if (!top) return;
    celebrate(event, { count: 30 });
    sound.tear();
    void missions.putMany(moveCard(missions.store.get().items, top.id, 'done', 0));
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={tr('Focus mode')} className="focus-mode fixed inset-0 z-[70] flex flex-col items-center justify-center px-6" data-focus-mode>
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <WallpaperCanvas id="rain" theme={theme} />
        <span className="focus-veil" />
      </div>

      <button type="button" onClick={onClose} aria-label={tr('Leave focus mode')} className="focus-exit">
        <X size={18} aria-hidden="true" />
        <span className="max-sm:hidden">{tr('Esc to leave')}</span>
      </button>

      <div className="flex gap-1 rounded-full border border-wash/15 bg-shade/30 p-1 backdrop-blur" role="radiogroup" aria-label={tr('Timer')}>
        {MODES.map(({ id, label }) => (
          <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)} className={clsx('rounded-full px-3.5 py-1.5 font-mono text-[0.72rem] transition-colors', mode === id ? 'bg-bone text-ink-0' : 'text-bone-dim hover:text-bone')}>
            {label}
          </button>
        ))}
      </div>

      <div className="focus-clock relative mt-8 grid place-items-center" style={{ '--p': progress }}>
        <svg viewBox="0 0 200 200" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
          <circle cx="100" cy="100" r="94" fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="2" />
          <circle cx="100" cy="100" r="94" fill="none" stroke="var(--color-signal)" strokeWidth="3" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(0.01, progress * 100)} 100`} className="transition-[stroke-dasharray] duration-500" />
        </svg>
        <b className="font-display text-[clamp(4rem,12vw,7rem)] leading-none font-normal text-bone tabular-nums" role="timer" aria-live="off">
          {status === 'done' ? tr('Done') : clock(left)}
        </b>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button type="button" onClick={reset} aria-label={tr('Reset the timer')} className="focus-round">
          <RotateCcw size={17} aria-hidden="true" />
        </button>
        <button type="button" onClick={running ? pause : start} aria-label={running ? tr('Pause') : tr('Start')} className="grid size-16 place-items-center rounded-full bg-bone text-ink-0 shadow-[0_14px_40px_-10px_rgb(0_0_0/0.8)] transition-transform hover:scale-105 active:scale-95">
          {running ? <Pause size={24} fill="currentColor" aria-hidden="true" /> : <Play size={24} fill="currentColor" className="translate-x-0.5" aria-hidden="true" />}
        </button>
        <span className="size-11" aria-hidden="true" />
      </div>

      {top && (
        <div className="focus-task mt-10">
          <small className="font-mono text-[0.62rem] tracking-[0.16em] text-bone-faint uppercase">{tr('Now, just this')}</small>
          <span className="mt-1 flex items-center gap-3">
            <span className="min-w-0 flex-1 truncate font-display text-[1.3rem] text-bone">{top.title}</span>
            <button type="button" onClick={finishTop} aria-label={tr('Mark "{0}" as done', top.title)} className="focus-round">
              <Check size={16} aria-hidden="true" />
            </button>
          </span>
        </div>
      )}

      {track && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-wash/12 bg-shade/35 p-1.5 pr-2 backdrop-blur-xl">
          <Cover track={track} className={clsx('size-10 [animation:disc_14s_linear_infinite]', !playing && '[animation-play-state:paused]')} rounded="rounded-full" />
          <span className="max-w-[14rem] min-w-0 leading-tight">
            <b className="block truncate text-[0.84rem] font-medium text-bone">{track.title}</b>
            <small className="block truncate font-mono text-[0.66rem] text-bone-faint">{track.artist || tr('Unknown artist')}</small>
          </span>
          <button type="button" onClick={togglePlay} aria-label={playing ? tr('Pause') : tr('Play')} className="grid size-9 place-items-center rounded-full bg-bone text-ink-0">
            {playing ? <Pause size={14} fill="currentColor" aria-hidden="true" /> : <Play size={14} fill="currentColor" aria-hidden="true" />}
          </button>
          <button type="button" onClick={next} aria-label={tr('Next track')} className="grid size-9 place-items-center rounded-full text-bone-dim hover:text-bone">
            <SkipForward size={15} fill="currentColor" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

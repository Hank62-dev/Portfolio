import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Scan } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { useHistoryLayer } from '../hooks/useHistoryLayer';
import { useStore } from '../store';
import { useCoverTint } from './Cover';
import { MODES, focusWindow, followRatio, lineProgress, lyricPalette, lyricPrefs, setLyricPrefs, stepSize } from './lyricModes';
import { activeLine } from './lrc';
import { Ribbon } from './parts';
import { tr } from '../lang';

// Text sizes of the small view beside the player. (The full-screen stage is sized by the screen: see STAGE_SCALE.)
const TEXT = { s: 'text-[1.05rem] md:text-[1.35rem]', m: 'text-[1.3rem] md:text-[1.8rem]', l: 'text-[1.65rem] md:text-[2.3rem]' };
const BOX = 'h-[300px] md:h-[clamp(320px,48vh,540px)]'; // the small view: taller beside the player on a wide screen
const SMALL = { s: 'text-[0.82rem]', m: 'text-[0.95rem]', l: 'text-[1.1rem]' };
const STAGE_SMALL = { s: 'text-[1.1rem]', m: 'text-[1.35rem]', l: 'text-[1.7rem]' };
const STAGE_SCALE = { s: 0.78, m: 1, l: 1.25 };

/** Keeps the sung line where a reader's eye rests (a third of the way down), unless a hand has just scrolled the list. */
function useAutoScroll(active, anchor = 0.36) {
  const box = useRef(null);
  const holdUntil = useRef(0);
  useEffect(() => {
    const list = box.current;
    const line = list?.querySelector('[data-active="true"]');
    if (!list || !line || Date.now() < holdUntil.current) return;
    list.scrollTo({ top: line.offsetTop - list.clientHeight * anchor + line.clientHeight / 2, behavior: 'smooth' });
  }, [active, anchor]);
  const hold = () => {
    holdUntil.current = Date.now() + 3500;
  };
  return { box, bind: { onWheel: hold, onTouchMove: hold, onPointerDown: hold } };
}

const Rest = ({ active }) => (
  <span className={clsx('inline-flex items-center gap-[0.3em] align-middle', active ? 'opacity-90' : 'opacity-25')} aria-label={tr('Instrumental')}>
    {[0, 1, 2].map((i) => (
      <i key={i} className={clsx('size-[0.35em] rounded-full bg-current', active && 'animate-pulse')} style={{ animationDelay: `${i * 180}ms` }} />
    ))}
  </span>
);

// The colours of a line by where it is (sung now, sung before, still to come): theme colours in the small view, the cover's shades on the stage
const colourOf = (stage, sung, past) => {
  if (stage) return sung ? 'var(--ly-active)' : past ? 'var(--ly-past)' : 'var(--ly-next)';
  return sung ? 'var(--color-bone)' : past ? 'color-mix(in srgb, var(--color-bone) 30%, transparent)' : 'color-mix(in srgb, var(--color-bone) 45%, transparent)';
};

/** The scrolling looks: the list slides so the sung line stays in view; tapping a line jumps the song to it. */
function ScrollingLines({ lines, active, time, mode, size, onSeek, stage }) {
  const { box, bind } = useAutoScroll(active, mode === 'full' ? 0.3 : stage ? 0.42 : 0.36);
  const pad = stage ? 'py-[42vh]' : mode === 'full' ? 'py-10' : 'py-24';
  // on the stage the lines are as big as the screen allows, set tight and heavy; the small view uses fixed sizes
  const style = stage && mode !== 'full' ? { fontSize: 'calc(clamp(1.9rem, 5.2vw, 4.6rem) * var(--ly-scale, 1))' } : undefined;
  const heavy = 'text-[1em] leading-[1.08] font-bold tracking-[-0.045em]';
  return (
    <div ref={box} {...bind} style={style} className={clsx('relative overflow-y-auto overscroll-contain', stage ? 'h-full' : BOX, '[mask-image:linear-gradient(transparent,#000_14%,#000_80%,transparent)]')} aria-label={tr('Lyrics')} tabIndex={0} data-lyrics-mode={mode}>
      <div className={pad}>
        {lines.map((entry, i) => {
          const sung = i === active;
          const past = i < active;
          const key = `${entry.time}-${i}`;
          const seek = () => onSeek?.(entry.time);
          const colour = colourOf(stage, sung, past);
          if (mode === 'full') {
            return (
              <button key={key} type="button" data-active={sung} onClick={seek} style={{ color: colour }} className={clsx('block w-full border-l-2 py-1 pl-3 text-left font-body leading-snug transition-colors duration-300', stage ? STAGE_SMALL[size] : SMALL[size], sung ? 'border-current font-semibold' : 'border-transparent')}>
                {entry.text || <Rest active={sung} />}
              </button>
            );
          }
          if (mode === 'karaoke') {
            const fill = sung ? lineProgress(lines, i, time) * 100 : 0;
            const base = stage ? (past ? 'var(--ly-past)' : 'var(--ly-next)') : 'color-mix(in srgb, var(--color-bone) 46%, transparent)';
            const filling = stage ? 'var(--ly-active)' : 'var(--color-signal)';
            const done = !stage && past ? 100 : fill; // the small view leaves the sung lines coloured; the stage sinks them back
            return (
              <button key={key} type="button" data-active={sung} onClick={seek} className={clsx('block w-full text-left transition-opacity duration-500', stage ? clsx('font-body py-[0.32em]', heavy) : clsx('py-2 font-display leading-[1.15]', TEXT[size]), sung ? 'opacity-100' : 'opacity-80 hover:opacity-100')}>
                {entry.text ? (
                  <span
                    className="[background-clip:text] [background-repeat:no-repeat] [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] [transition:background-size_0.35s_linear]"
                    style={{ backgroundImage: `linear-gradient(${filling}, ${filling}), linear-gradient(${base}, ${base})`, backgroundSize: `${done}% 100%, 100% 100%` }}
                  >
                    {entry.text}
                  </span>
                ) : (
                  <Rest active={sung} />
                )}
              </button>
            );
          }
          // scroll: bold lines, the sung one in full colour
          return (
            <button key={key} type="button" data-active={sung} onClick={seek} style={{ color: colour }} className={clsx('block w-full text-left font-body transition-colors duration-500', stage ? clsx(heavy, 'py-[0.32em] hover:brightness-125') : clsx('py-2 leading-[1.15] font-bold tracking-tight', TEXT[size]))}>
              {entry.text || <Rest active={sung} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One line in the middle, with the ones around it small and faint; each change fades in. */
function FocusLines({ lines, active, size, stage }) {
  const shown = focusWindow(lines, active);
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3 px-2 text-center', stage ? 'h-full' : BOX)} aria-label={tr('Lyrics')} aria-live="polite" data-lyrics-mode="focus">
      {shown.map(({ at, index, line }) => (
        <p
          key={index}
          data-active={at === 0}
          style={{ color: stage ? (at === 0 ? 'var(--ly-active)' : at < 0 ? 'var(--ly-past)' : 'var(--ly-next)') : undefined, fontSize: stage && at === 0 ? 'calc(clamp(2rem, 5vw, 4.4rem) * var(--ly-scale, 1))' : undefined }}
          className={clsx('animate-fade-in transition-opacity duration-500', at === 0 ? clsx('leading-tight', stage ? 'font-body font-bold tracking-[-0.045em]' : clsx('font-display text-bone', TEXT[size])) : clsx('font-body', stage ? STAGE_SMALL[size] : clsx('text-bone-dim', SMALL[size])), Math.abs(at) === 2 ? 'opacity-40' : 'opacity-100')}
        >
          {line.text || <Rest active={at === 0} />}
        </p>
      ))}
    </div>
  );
}

/** Timed lyrics in whichever look is chosen. */
export function SyncedLyrics({ lines, time, mode, size, onSeek, stage = false }) {
  const active = activeLine(lines, time);
  if (mode === 'focus') return <FocusLines lines={lines} active={active} size={size} stage={stage} />;
  if (mode === 'ribbon') return <Ribbon lines={lines} active={active} className={stage ? 'h-full' : undefined} />;
  return <ScrollingLines lines={lines} active={active} time={time} mode={mode} size={size} onSeek={onSeek} stage={stage} />;
}

/** Lyrics without times: plain text that scrolls down by itself in step with the song, until a hand takes over. */
export function PlainLyrics({ text, time, duration, size, stage = false }) {
  const box = useRef(null);
  const [following, setFollowing] = useState(true);
  const ratio = followRatio(time, duration);
  useEffect(() => {
    const el = box.current;
    if (!following || !el) return;
    el.scrollTo({ top: ratio * (el.scrollHeight - el.clientHeight), behavior: 'smooth' });
  }, [following, ratio]);
  const letGo = () => setFollowing(false);
  return (
    <div className={clsx('relative', stage && 'h-full')}>
      <div
        ref={box}
        onWheel={letGo}
        onTouchMove={letGo}
        onPointerDown={letGo}
        style={stage ? { fontSize: 'calc(clamp(1.5rem, 3.6vw, 3.2rem) * var(--ly-scale, 1))', color: 'var(--ly-next)' } : undefined}
        className={clsx('overflow-y-auto overscroll-contain whitespace-pre-line [mask-image:linear-gradient(transparent,#000_8%,#000_92%,transparent)]', stage ? 'h-full py-[20vh] font-body leading-[1.15] font-bold tracking-[-0.04em]' : clsx(BOX, 'py-4 font-display leading-relaxed text-bone', TEXT[size]))}
        aria-label={tr('Lyrics')}
        tabIndex={0}
        data-plain-lyrics
      >
        {text}
      </div>
      {!following && duration > 20 && (
        <button type="button" onClick={() => setFollowing(true)} className="absolute right-1 bottom-2 rounded-full border border-line-strong bg-ink-1/90 px-3 py-1 font-mono text-[0.68rem] text-bone backdrop-blur" data-follow>
          {tr('Follow the song')}
        </button>
      )}
    </div>
  );
}

/** The choice of look (timed lyrics only), the text size, and the way into the full screen. `stage` dresses it for the stage. */
export function LyricsBar({ synced, onStage, stage = false, children }) {
  const { mode, size } = useStore(lyricPrefs);
  const chip = (on) => clsx('rounded-full border px-2.5 py-1 font-mono text-[0.68rem] transition-colors', stage ? (on ? 'border-white bg-white text-black' : 'border-white/25 text-white/75 hover:text-white') : on ? 'border-signal/60 bg-signal-soft text-bone' : 'border-line text-bone-dim hover:text-bone');
  const step = clsx('grid place-items-center rounded-full border font-mono text-[0.72rem] disabled:opacity-35', stage ? 'size-9 border-white/25 text-white/80 hover:text-white' : 'size-7 border-line text-bone-dim hover:text-bone');
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-lyrics-bar>
      {synced && (
        <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={tr('Lyrics look')}>
          {MODES.map(({ id, label, hint }) => (
            <button key={id} type="button" role="radio" aria-checked={mode === id} title={hint} onClick={() => setLyricPrefs({ mode: id })} className={chip(mode === id)}>
              {label}
            </button>
          ))}
        </div>
      )}
      <span className="ml-auto flex items-center gap-1.5">
        <button type="button" aria-label={tr('Smaller text')} disabled={size === 's'} onClick={() => setLyricPrefs({ size: stepSize(size, -1) })} className={step}>
          {tr('A−')}
        </button>
        <button type="button" aria-label={tr('Larger text')} disabled={size === 'l'} onClick={() => setLyricPrefs({ size: stepSize(size, 1) })} className={step}>
          {tr('A+')}
        </button>
        {onStage && (
          <button type="button" aria-label={tr('Lyrics full screen')} onClick={onStage} className={step}>
            <Maximize2 size={13} aria-hidden="true" />
          </button>
        )}
        {children}
      </span>
    </div>
  );
}

/**
 * The lyrics on the whole screen, in the style of a streaming app's lyrics page: the screen takes a deep shade of the cover,
 * the sung line is white and huge, the lines to come are a light tint, the sung ones sink back. The song's name sits top left,
 * the controls top right; one button hands the whole screen over to the browser (and back).
 */
export function LyricsStage({ track, lines, text, time, duration, onSeek, onClose }) {
  const { mode, size } = useStore(lyricPrefs);
  const tint = useCoverTint(track);
  const palette = lyricPalette(tint);
  const root = useRef(null);
  const [wide, setWide] = useState(false); // the browser's own full screen
  const leave = useHistoryLayer(true, onClose); // the back button of a phone closes the stage first

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && !document.fullscreenElement && leave();
    const onFull = () => setWide(Boolean(document.fullscreenElement));
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFull);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFull);
      if (document.fullscreenElement) void document.exitFullscreen?.();
    };
  }, [leave]);

  const toggleWide = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void root.current?.requestFullscreen?.().catch(() => {});
  };
  const host = document.querySelector('.app-shell') ?? document.body;
  const canWide = Boolean(document.documentElement.requestFullscreen);
  const iconButton = 'grid size-9 place-items-center rounded-full border border-white/25 text-white/80 transition-colors hover:text-white';

  return createPortal(
    <div
      ref={root}
      className="dark-island fixed inset-0 z-[88] flex animate-fade-in flex-col transition-colors duration-1000"
      style={{ backgroundColor: palette.bg, '--ly-active': palette.active, '--ly-next': palette.next, '--ly-past': palette.past, '--ly-scale': STAGE_SCALE[size] }}
      role="dialog"
      aria-label={tr('Lyrics')}
      data-lyrics-stage
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/55 to-transparent" aria-hidden="true" />
      <header className="relative z-20 flex items-start gap-4 px-5 pt-[calc(0.9rem+env(safe-area-inset-top))] md:px-8">
        <div className="min-w-0 flex-1 leading-tight">
          <h2 className="truncate font-body text-[1.05rem] font-bold tracking-tight text-white uppercase">{track.title}</h2>
          <p className="truncate font-body text-[0.8rem] text-white/60">{track.artist || tr('Unknown artist')}</p>
        </div>
        <LyricsBar synced={lines.length > 0} stage>
          {canWide && (
            <button type="button" aria-label={wide ? tr('Leave the browser full screen') : tr('Browser full screen')} onClick={toggleWide} className={iconButton} data-wide>
              <Scan size={15} aria-hidden="true" />
            </button>
          )}
          <button type="button" aria-label={tr('Close the full screen lyrics')} onClick={leave} className={iconButton} data-close-stage>
            <Minimize2 size={15} aria-hidden="true" />
          </button>
        </LyricsBar>
      </header>
      <div className="relative min-h-0 flex-1">
        <div className="mx-auto h-full w-full max-w-[72rem] px-5 md:px-12">
          {lines.length ? <SyncedLyrics lines={lines} time={time} mode={mode} size={size} onSeek={onSeek} stage /> : <PlainLyrics text={text} time={time} duration={duration} size={size} stage />}
        </div>
      </div>
    </div>,
    host
  );
}

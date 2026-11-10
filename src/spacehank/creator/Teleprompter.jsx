import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FlipHorizontal2, Minus, Pause, Play, Plus, RotateCcw, X } from 'lucide-react';
import { clsx } from '../../shared/lib/format';
import { useHistoryLayer } from '../hooks/useHistoryLayer';
import { prompterLines, speakSeconds } from './model';
import { tr } from '../lang';

const SPEEDS = [20, 30, 40, 55, 70, 90, 120]; // pixels a second

/**
 * A teleprompter for filming: the script in large type, scrolling at a speed you choose, on a phone or a second screen.
 * Tap the text to pause. Mirror flips it for a prompter glass. The screen is kept awake while it runs (where the browser allows).
 */
export default function Teleprompter({ text, onClose }) {
  const lines = useMemo(() => prompterLines(text), [text]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // index into SPEEDS
  const [size, setSize] = useState(34);
  const [mirror, setMirror] = useState(false);
  const [count, setCount] = useState(0); // a 3-2-1 before it starts
  const box = useRef(null);
  const leave = useHistoryLayer(true, onClose);

  // the countdown, then the scroll
  useEffect(() => {
    if (!count) return undefined;
    const timer = window.setTimeout(() => {
      if (count === 1) {
        setCount(0);
        setPlaying(true);
      } else setCount(count - 1);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [count]);

  useEffect(() => {
    if (!playing) return undefined;
    let frame = 0;
    let last = performance.now();
    const step = (now) => {
      const el = box.current;
      if (el) {
        el.scrollTop += ((now - last) / 1000) * SPEEDS[speed];
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
          setPlaying(false);
          return;
        }
      }
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  // keep the screen on while it is open
  useEffect(() => {
    let lock = null;
    let gone = false;
    navigator.wakeLock?.request?.('screen').then((l) => (gone ? l.release() : (lock = l))).catch(() => {});
    return () => {
      gone = true;
      lock?.release?.().catch?.(() => {});
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') leave();
      else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave]);

  const restart = () => {
    setPlaying(false);
    if (box.current) box.current.scrollTop = 0;
    setCount(3);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white" role="dialog" aria-label={tr('Teleprompter')} data-prompter>
      <div className="relative min-h-0 flex-1">
        <div ref={box} onClick={() => !count && setPlaying((p) => !p)} className="no-scrollbar h-full overflow-y-auto px-6 select-none" style={{ transform: mirror ? 'scaleX(-1)' : undefined }}>
          <div style={{ height: '42vh' }} aria-hidden="true" />
          {lines.map((line, i) => (
            <p key={i} className={clsx('font-display leading-[1.25] text-balance', line ? 'mb-2' : 'mb-8')} style={{ fontSize: size, minHeight: line ? undefined : '0.5em' }}>
              {line}
            </p>
          ))}
          <div style={{ height: '70vh' }} aria-hidden="true" />
        </div>
        {/* the reading line */}
        <div className="pointer-events-none absolute inset-x-0 top-[42%] h-px bg-white/25" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-black to-transparent" aria-hidden="true" />
        {count > 0 && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/60 font-display text-[7rem] leading-none" aria-live="assertive">{count}</div>}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-black px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button type="button" onClick={leave} aria-label={tr('Close the teleprompter')} className="grid size-11 place-items-center rounded-full border border-white/20 active:scale-90">
          <X size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={restart} aria-label={tr('Start again from the top')} className="grid size-11 place-items-center rounded-full border border-white/20 active:scale-90">
          <RotateCcw size={17} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => (playing ? setPlaying(false) : setCount(count ? 0 : 3))} aria-label={playing ? tr('Pause') : tr('Start with a countdown')} className="grid size-14 place-items-center rounded-full bg-white text-black active:scale-90">
          {playing ? <Pause size={22} fill="currentColor" aria-hidden="true" /> : <Play size={22} fill="currentColor" className="translate-x-px" aria-hidden="true" />}
        </button>
        <div className="flex items-center gap-1 rounded-full border border-white/20 px-1.5" role="group" aria-label={tr('Speed')}>
          <button type="button" aria-label={tr('Slower')} onClick={() => setSpeed((s) => Math.max(0, s - 1))} className="grid size-10 place-items-center active:scale-90">
            <Minus size={16} aria-hidden="true" />
          </button>
          <span className="w-10 text-center font-mono text-[0.75rem] tabular-nums">{SPEEDS[speed]}</span>
          <button type="button" aria-label={tr('Faster')} onClick={() => setSpeed((s) => Math.min(SPEEDS.length - 1, s + 1))} className="grid size-10 place-items-center active:scale-90">
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/20 px-1.5" role="group" aria-label={tr('Text size')}>
          <button type="button" aria-label={tr('Smaller text')} onClick={() => setSize((s) => Math.max(20, s - 4))} className="grid size-10 place-items-center font-display text-[0.9rem] active:scale-90">
            {tr('A')}
          </button>
          <button type="button" aria-label={tr('Larger text')} onClick={() => setSize((s) => Math.min(72, s + 4))} className="grid size-10 place-items-center font-display text-[1.3rem] active:scale-90">
            {tr('A')}
          </button>
        </div>
        <button type="button" onClick={() => setMirror((m) => !m)} aria-pressed={mirror} aria-label={tr('Mirror the text')} className={clsx('grid size-11 place-items-center rounded-full border active:scale-90', mirror ? 'border-white bg-white text-black' : 'border-white/20')}>
          <FlipHorizontal2 size={17} aria-hidden="true" />
        </button>
        <span className="w-full text-center font-mono text-[0.68rem] text-white/50">{tr('About')} {speakSeconds(text)} {tr('s to say · tap the text to pause · space to start or stop')}</span>
      </div>
    </div>,
    document.querySelector('.app-shell') ?? document.body
  );
}

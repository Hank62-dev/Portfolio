import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, NotebookPen, Sparkles, X } from 'lucide-react';
import { Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { useCountUp } from '../motion/hooks';
import { swipeAxis } from '../motion/swipe';
import { tr } from '../lang';
import { formatVnd } from '../wallet/model';

const NUMBER = new Intl.NumberFormat('vi-VN');

/** The big number of a card, counting up as the card arrives. */
function Figure({ slide }) {
  const counted = useCountUp(slide.value, { duration: 1100 });
  const shown = slide.format === 'vnd' ? formatVnd(counted) : NUMBER.format(Math.round(counted));
  return (
    <p className="story-figure font-display text-[clamp(3.4rem,17vw,7rem)] leading-none tracking-tight tabular-nums" aria-label={slide.format === 'vnd' ? formatVnd(slide.value) : String(slide.value)}>
      <span aria-hidden="true">{shown}</span>
      {slide.of ? <span aria-hidden="true" className="ml-2 text-[0.38em] text-bone-faint">/ {slide.of}</span> : null}
    </p>
  );
}

// ---- what a card draws of the seven days (all of it decorates numbers that are also written on the card)

const W = 320;
const xAt = (i, pad = 22) => pad + (i * (W - pad * 2)) / 6;

/** A smooth line through points: each step leaves and arrives flat, so the trail winds like a path. */
const smooth = (xs, ys) => xs.reduce((d, x, i) => (i === 0 ? `M${x} ${ys[0]}` : `${d} C${(xs[i - 1] + x) / 2} ${ys[i - 1]} ${(xs[i - 1] + x) / 2} ${ys[i]} ${x} ${ys[i]}`), '');

/** The week as a trail: a line that draws itself through seven stepping stones, higher on the busier days, the busiest one lit. */
function Trail({ days }) {
  const H = 132;
  const xs = days.map((_, i) => xAt(i));
  const ys = days.map((d) => 88 - d.v * 58);
  const line = smooth(xs, ys);
  const top = days.findIndex((d) => d.v === 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="trail-stroke" x1="0" x2="1">
          <stop offset="0" style={{ stopColor: 'hsl(var(--hue) 90% 78%)' }} />
          <stop offset="1" style={{ stopColor: 'hsl(calc(var(--hue) + 60) 90% 74%)' }} />
        </linearGradient>
        <linearGradient id="trail-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'hsl(var(--hue) 90% 70% / 0.32)' }} />
          <stop offset="1" style={{ stopColor: 'hsl(var(--hue) 90% 70% / 0)' }} />
        </linearGradient>
      </defs>
      <path d={`${line} L${xs[6]} ${H - 26} L${xs[0]} ${H - 26} Z`} fill="url(#trail-fill)" className="trail-fill" />
      <path d={line} pathLength="1" fill="none" stroke="url(#trail-stroke)" strokeWidth="3" strokeLinecap="round" className="trail-line" />
      {days.map((d, i) => (
        <g key={d.label + i} style={{ '--i': i }}>
          {i === top && d.v > 0 && <circle cx={xs[i]} cy={ys[i]} r="11" fill="none" style={{ stroke: 'hsl(var(--hue) 95% 82% / 0.55)' }} strokeWidth="1.5" className="trail-node trail-halo" />}
          <circle cx={xs[i]} cy={ys[i]} r={d.v > 0 ? 5 : 3.2} fill={d.v > 0 ? '#fff' : 'rgb(255 255 255 / 0.4)'} className="trail-node" />
          <text x={xs[i]} y={H - 8} textAnchor="middle" className="fill-bone-faint font-mono" fontSize="9.5">
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Seven bars rising from the floor, the highest one bright and named. `show` writes the value of a day. */
function Bars({ days, peak, show }) {
  return (
    <div className="flex w-full max-w-md items-end gap-2.5" aria-hidden="true">
      {days.map((d, i) => (
        <div key={d.label + i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="h-3 max-w-full truncate font-mono text-[0.58rem] text-bone-dim">{d.label === peak && d.raw > 0 ? show(d.raw) : ''}</span>
          <span className="flex h-24 w-full items-end">
            <i className="story-bar" data-peak={d.label === peak && d.raw > 0 ? '' : undefined} style={{ '--v': Math.max(d.v, 0.05), '--i': i }} />
          </span>
          <span className="font-mono text-[0.62rem] text-bone-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Seven rings, each filled as far as that day went (a tick when it went all the way). */
function Rings({ days }) {
  return (
    <div className="flex w-full max-w-md justify-between gap-1" aria-hidden="true">
      {days.map((d, i) => (
        <div key={d.label + i} className="flex flex-col items-center gap-1.5">
          <span className="story-dot" data-full={d.v >= 1 ? '' : undefined} style={{ '--p': d.v, '--i': i }}>
            {d.v >= 1 && <Check size={15} strokeWidth={3} />}
          </span>
          <span className="font-mono text-[0.62rem] text-bone-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** The mood of the days as a wave: a dot for each day that was written, joined to the next written day. */
function Wave({ days }) {
  const H = 118;
  const pts = days.map((d, i) => ({ x: xAt(i), y: 86 - d.v * 62, on: d.on }));
  const segments = pts.slice(1).flatMap((p, i) => (pts[i].on && p.on ? [`M${pts[i].x} ${pts[i].y} C${(pts[i].x + p.x) / 2} ${pts[i].y} ${(pts[i].x + p.x) / 2} ${p.y} ${p.x} ${p.y}`] : []));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md overflow-visible" aria-hidden="true">
      {segments.map((d, i) => (
        <path key={d} d={d} pathLength="1" fill="none" strokeWidth="2.6" strokeLinecap="round" className="trail-line" style={{ stroke: 'hsl(var(--hue) 90% 80%)', '--i': i }} />
      ))}
      {days.map((d, i) => (
        <g key={d.label + i} style={{ '--i': i }}>
          <circle cx={pts[i].x} cy={pts[i].y} r={pts[i].on ? 6 : 3.2} fill={pts[i].on ? '#fff' : 'none'} style={{ stroke: pts[i].on ? 'hsl(var(--hue) 90% 80%)' : 'rgb(255 255 255 / 0.4)' }} strokeWidth={pts[i].on ? 3 : 1.4} className="trail-node" />
          <text x={pts[i].x} y={H - 6} textAnchor="middle" className="fill-bone-faint font-mono" fontSize="9.5">
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** How much of the open and done tasks is done, as a ring that draws itself. */
function Ring({ done, total }) {
  const share = total > 0 ? done / total : 0;
  return (
    <span className="relative grid size-24 shrink-0 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="7" />
        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" strokeLinecap="round" pathLength="1" strokeDasharray="1" style={{ stroke: 'hsl(var(--hue) 90% 76%)', '--share': share }} className="story-ring" />
      </svg>
      <b className="font-display text-xl text-bone tabular-nums">{Math.round(share * 100)}%</b>
    </span>
  );
}

function Chart({ slide }) {
  const chart = slide.chart;
  if (!chart) return null;
  const show = slide.format === 'vnd' ? formatVnd : (n) => NUMBER.format(n);
  return (
    <div className="flex w-full justify-center sm:justify-start">
      {chart.kind === 'path' && <Trail days={chart.days} />}
      {chart.kind === 'bars' && <Bars days={chart.days} peak={chart.peak} show={show} />}
      {chart.kind === 'dots' && <Rings days={chart.days} />}
      {chart.kind === 'wave' && <Wave days={chart.days} />}
    </div>
  );
}

/**
 * The week as a story of full-screen cards: tap the right side (or press →) for the next, the left side (←) to go back, or swipe.
 * Each card has one fact, big, and its own tint. The last card is Hank's own words, or the way to ask for them.
 */
export default function WrappedStory({ open, onClose, slides, onWrite, writing, error, onSave }) {
  const [index, setIndex] = useState(0);
  const touch = useRef(null);
  const swiped = useRef(false);
  const last = slides.length - 1;
  const slide = slides[Math.min(index, last)];

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const go = (to) => setIndex((i) => Math.max(0, Math.min(last, typeof to === 'function' ? to(i) : to)));

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') go((i) => i + 1);
    if (event.key === 'ArrowLeft') go((i) => i - 1);
  };

  const down = (event) => {
    swiped.current = false;
    touch.current = { x: event.clientX, y: event.clientY };
  };
  const up = (event) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (swipeAxis(dx, event.clientY - start.y) === 'x' && Math.abs(dx) > 40) {
      go((i) => i + (dx < 0 ? 1 : -1));
      swiped.current = true;
    }
  };
  const tap = (direction) => {
    // a swipe already moved the card: the click that ends it must not move it again
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    go((i) => i + direction);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] animate-fade-in bg-ink-0" />
        <Dialog.Content
          aria-describedby={undefined}
          onKeyDown={onKeyDown}
          onPointerDown={down}
          onPointerUp={up}
          className="fixed inset-0 z-[81] flex flex-col overflow-hidden text-bone focus:outline-none"
          data-wrapped
        >
          <Dialog.Title className="sr-only">{tr('Your week')}</Dialog.Title>
          <div key={slide.id} aria-hidden="true" className="story-aurora pointer-events-none absolute inset-0" style={{ '--hue': slide.hue }}>
            <i className="a1" />
            <i className="a2" />
            <i className="a3" />
            <b className="story-rings" />
          </div>

          <div className="relative z-10 flex gap-1.5 px-5 pt-[calc(1rem+env(safe-area-inset-top))]" aria-hidden="true">
            {slides.map((s, i) => (
              <i key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-wash/15">
                <b className={clsx('block h-full rounded-full bg-bone transition-[width] duration-500 ease-out-expo', i <= index ? 'w-full' : 'w-0')} />
              </i>
            ))}
          </div>
          <div className="relative z-10 flex items-center justify-between px-5 pt-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pr-3 pl-2.5 font-mono text-[0.66rem] tracking-[0.2em] text-bone-dim uppercase backdrop-blur-md">
              <i className="size-1.5 rounded-full" style={{ background: `hsl(${slide.hue} 95% 72%)`, boxShadow: `0 0 10px hsl(${slide.hue} 95% 65%)` }} />
              {slide.kicker}
            </span>
            <Dialog.Close aria-label={tr('Close')} className="grid size-10 place-items-center rounded-full text-bone-dim hover:text-bone active:scale-90">
              <X size={20} aria-hidden="true" />
            </Dialog.Close>
          </div>

          <div key={slide.id} className="story-steps relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-5 px-7 pb-24" style={{ '--hue': slide.hue }} aria-live="polite">
            {slide.id === 'outro' ? (
              <>
                {slide.written ? (
                  <p className="max-w-[34ch] rounded-[1.75rem] border border-white/15 bg-black/20 p-6 font-display text-[clamp(1.4rem,5.5vw,2rem)] leading-snug text-bone backdrop-blur-md" data-story-text>
                    {slide.written}
                  </p>
                ) : (
                  <p className="max-w-[30ch] font-display text-[clamp(1.5rem,6vw,2.2rem)] leading-snug text-bone-dim">{tr('Hank can write you a short review of this week.')}</p>
                )}
                {error && (
                  <p role="alert" className="text-fine text-danger">
                    {error}
                  </p>
                )}
                <div className="relative z-20 flex flex-wrap gap-2">
                  <Button variant={slide.written ? 'ghost' : 'primary'} size="sm" onClick={onWrite} loading={writing} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
                    <Sparkles size={14} aria-hidden="true" /> {slide.written ? tr('Write it again') : tr('Ask Hank to write it')}
                  </Button>
                  {slide.written && (
                    <Button variant="ghost" size="sm" onClick={onSave} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
                      <NotebookPen size={14} aria-hidden="true" /> {tr('Save as a note')}
                    </Button>
                  )}
                </div>
              </>
            ) : slide.id === 'intro' ? (
              <>
                <h2 className="story-figure font-display text-[clamp(2.6rem,12vw,5rem)] leading-[1.02] tracking-tight">{slide.unit}</h2>
                <p className="font-mono text-fine text-bone-dim">{slide.sub}</p>
                <Chart slide={slide} />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <Figure slide={slide} />
                  {slide.ring && slide.ring.total > 0 && <Ring done={slide.ring.done} total={slide.ring.total} />}
                </div>
                <p className="font-display text-[clamp(1.4rem,6vw,2rem)] leading-tight text-bone">{slide.unit}</p>
                {slide.sub && <p className="max-w-[36ch] text-body text-bone-dim">{slide.sub}</p>}
                <Chart slide={slide} />
              </>
            )}
          </div>

          {/* the two halves of the screen: left goes back, right goes on (the buttons of a card sit above them) */}
          <button type="button" aria-label={tr('Previous card')} onClick={() => tap(-1)} disabled={index === 0} className="absolute inset-y-24 left-0 z-[5] w-1/3 cursor-w-resize" tabIndex={-1} />
          <button type="button" aria-label={tr('Next card')} onClick={() => tap(1)} disabled={index === last} className="absolute inset-y-24 right-0 z-[5] w-2/3 cursor-e-resize" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

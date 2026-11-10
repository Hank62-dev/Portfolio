import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { NotebookPen, Sparkles, X } from 'lucide-react';
import { Button } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { swipeAxis } from '../motion/swipe';
import { tr } from '../lang';
import { Chart, Chips, Emblem, Figure, Items, Ring } from './StoryParts';

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
          style={{ '--hue': slide.hue }}
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
            <span className="inline-flex items-center gap-2 rounded-full border border-wash/15 bg-wash/5 py-1 pr-3 pl-2.5 font-mono text-[0.66rem] tracking-[0.2em] text-bone-dim uppercase backdrop-blur-md">
              <i className="size-1.5 rounded-full" style={{ background: 'var(--hl)', boxShadow: '0 0 10px var(--hl)' }} />
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
                  <p className="max-w-[34ch] rounded-[1.75rem] border border-wash/15 bg-shade/20 p-6 font-display text-[clamp(1.4rem,5.5vw,2rem)] leading-snug text-bone backdrop-blur-md" data-story-text>
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
            ) : slide.value === undefined ? (
              <>
                <Emblem id={slide.id} />
                <h2 className="story-figure font-display text-[clamp(2.4rem,11vw,4.6rem)] leading-[1.02] tracking-tight">{slide.unit}</h2>
                {slide.sub && <p className="font-mono text-fine text-bone-dim">{slide.sub}</p>}
                <Chips chips={slide.chips} />
                {slide.list ? <Items list={slide.list} /> : <Chart slide={slide} />}
              </>
            ) : (
              <>
                <Emblem id={slide.id} />
                <div className="flex items-center justify-between gap-4">
                  <Figure slide={slide} />
                  {slide.ring && slide.ring.total > 0 && <Ring done={slide.ring.done} total={slide.ring.total} />}
                </div>
                <p className="font-display text-[clamp(1.4rem,6vw,2rem)] leading-tight text-bone">{slide.unit}</p>
                {slide.sub && <p className="max-w-[36ch] text-body text-bone-dim">{slide.sub}</p>}
                <Items list={slide.list} />
                {(!slide.list || slide.id === 'mind') && <Chart slide={slide} />}
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

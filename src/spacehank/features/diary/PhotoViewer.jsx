import * as Dialog from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { usePhoto } from './photos';
import { tr } from '../../core/i18n/lang';

// A picture of a diary page, full screen. Tap it to zoom in (then drag to look around), swipe or use the arrows to go to
// the next picture of the same page, Esc or the cross to put it away.

const SWIPE = 56; // px of sideways movement that counts as a swipe

const round = 'grid size-11 place-items-center rounded-full bg-white/12 text-white backdrop-blur transition-colors hover:bg-white/25 disabled:opacity-30';

/** `ids` are the pictures of the page, `start` the one to open first. */
export default function PhotoViewer({ ids, start = 0, onClose }) {
  const [index, setIndex] = useState(Math.min(Math.max(start, 0), ids.length - 1));
  const [zoomed, setZoomed] = useState(false);
  const url = usePhoto(ids[index]);
  usePhoto(ids[index + 1]); // the neighbours are read ahead, so a swipe shows the next one at once
  usePhoto(ids[index - 1]);
  const finger = useRef(null);
  const scroller = useRef(null);

  const go = (step) => {
    const next = index + step;
    if (next < 0 || next >= ids.length) return;
    setIndex(next);
    setZoomed(false);
  };

  useEffect(() => {
    if (zoomed && scroller.current) {
      // zooming opens on the middle of the picture
      const box = scroller.current;
      box.scrollLeft = (box.scrollWidth - box.clientWidth) / 2;
      box.scrollTop = (box.scrollHeight - box.clientHeight) / 2;
    }
  }, [zoomed]);

  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') go(-1);
    else if (event.key === 'ArrowRight') go(1);
  };

  const down = (event) => {
    finger.current = { x: event.clientX, y: event.clientY, moved: false };
  };
  const move = (event) => {
    const s = finger.current;
    if (s && Math.hypot(event.clientX - s.x, event.clientY - s.y) > 8) s.moved = true;
  };
  const up = (event) => {
    const s = finger.current;
    finger.current = null;
    if (!s) return;
    const dx = event.clientX - s.x;
    if (!zoomed && Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(event.clientY - s.y) * 1.5) go(dx < 0 ? 1 : -1);
    else if (!s.moved) setZoomed((on) => !on); // a plain tap
  };

  return (
    <Dialog.Root open onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        {/* data-no-sheet-drag: this lives inside the diary sheet in React's tree, and must not pull that sheet down */}
        <Dialog.Overlay className="fixed inset-0 z-[120] animate-fade-in bg-black/92" data-no-sheet-drag />
        <Dialog.Content aria-describedby={undefined} onKeyDown={onKeyDown} data-no-sheet-drag className="fixed inset-0 z-[121] flex flex-col outline-none">
          <Dialog.Title className="sr-only">{tr('Xem ảnh')}</Dialog.Title>

          <header className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
            <span className="rounded-full bg-white/12 px-3 py-1.5 font-body text-[0.85rem] text-white tabular-nums backdrop-blur">{tr('{0} / {1}', index + 1, ids.length)}</span>
            <div className="flex gap-2">
              <button type="button" className={round} onClick={() => setZoomed((on) => !on)} aria-label={zoomed ? tr('Thu nhỏ') : tr('Phóng to')}>
                {zoomed ? <ZoomOut size={18} aria-hidden="true" /> : <ZoomIn size={18} aria-hidden="true" />}
              </button>
              <Dialog.Close className={round} aria-label={tr('Đóng ảnh')}>
                <X size={18} aria-hidden="true" />
              </Dialog.Close>
            </div>
          </header>

          <div className="relative min-h-0 flex-1">
            <div
              ref={scroller}
              className={zoomed ? 'size-full overflow-auto overscroll-contain' : 'grid size-full place-items-center overflow-hidden'}
              style={{ touchAction: zoomed ? 'auto' : 'pan-y' }}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={() => (finger.current = null)}
            >
              {url && (
                <img
                  src={url}
                  alt={tr('Ảnh kỷ niệm')}
                  draggable={false}
                  className={zoomed ? 'm-auto block max-w-none cursor-zoom-out select-none' : 'max-h-full max-w-full cursor-zoom-in object-contain select-none'}
                  style={zoomed ? { width: 'max(220%, 1400px)' } : undefined}
                />
              )}
            </div>
            {ids.length > 1 && !zoomed && (
              <>
                <button type="button" className={`${round} absolute top-1/2 left-3 -translate-y-1/2 max-md:hidden`} onClick={() => go(-1)} disabled={index === 0} aria-label={tr('Ảnh trước')}>
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <button type="button" className={`${round} absolute top-1/2 right-3 -translate-y-1/2 max-md:hidden`} onClick={() => go(1)} disabled={index === ids.length - 1} aria-label={tr('Ảnh sau')}>
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {ids.length > 1 && (
            <footer className="flex justify-center gap-1.5 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]" aria-hidden="true">
              {ids.map((id, i) => (
                <span key={id} className={i === index ? 'h-1.5 w-5 rounded-full bg-white transition-all' : 'size-1.5 rounded-full bg-white/40 transition-all'} />
              ))}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

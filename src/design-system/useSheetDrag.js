import { useRef, useState } from 'react';

// Pull a sheet down with a finger to put it away, as on a phone. It follows the finger and closes when it has been pulled
// far enough, or flicked. It only starts from the top of the sheet's own scroll, so scrolling the content still scrolls it,
// and it leaves text fields and sliders alone.

const IGNORE = 'input, textarea, select, [role="slider"], [data-no-sheet-drag]';
const START = 8; // px of downward movement before it counts as a pull
const FAR = 110; // px pulled before letting go closes the sheet
const FLICK = 0.6; // px/ms: a quick flick closes it sooner

/** Whether letting go now closes the sheet. Pure. `offset` is how far it was pulled (px), `speed` the last speed (px/ms). */
export const closesSheet = ({ offset, speed }, far = FAR) => offset > far || (offset > 40 && speed > FLICK);

/**
 * `bind` goes on the element that scrolls (the sheet itself), `style` on the same element.
 * `minWidth`: from this viewport width up the sheet is a centred dialog, not a bottom sheet, so it is not pulled.
 */
export function useSheetDrag(onClose, { minWidth = 0 } = {}) {
  const [offset, setOffset] = useState(0);
  const [active, setActive] = useState(false);
  const track = useRef(null);

  const reset = () => {
    track.current = null;
    setOffset(0);
    setActive(false);
  };

  const onTouchStart = (event) => {
    const touch = event.touches[0];
    const blocked = event.touches.length !== 1 || event.target.closest?.(IGNORE) || (minWidth > 0 && window.matchMedia(`(min-width: ${minWidth}px)`).matches);
    track.current = blocked ? null : { x: touch.clientX, y: touch.clientY, atTop: event.currentTarget.scrollTop <= 0, dragging: false, offset: 0, speed: 0, lastY: touch.clientY, lastAt: event.timeStamp };
  };

  const onTouchMove = (event) => {
    const s = track.current;
    if (!s) return;
    const touch = event.touches[0];
    const dx = touch.clientX - s.x;
    const dy = touch.clientY - s.y;
    if (!s.dragging) {
      if (Math.abs(dx) > Math.abs(dy) || dy < -START) {
        track.current = null; // sideways or upwards: an ordinary scroll
        return;
      }
      if (dy < START || !s.atTop) return;
      s.dragging = true;
      s.y = touch.clientY; // start from here, so the sheet does not jump by the distance already moved
      s.lastY = touch.clientY;
      s.lastAt = event.timeStamp;
      setActive(true);
      return;
    }
    const gap = event.timeStamp - s.lastAt;
    if (gap > 0) s.speed = (touch.clientY - s.lastY) / gap;
    s.lastY = touch.clientY;
    s.lastAt = event.timeStamp;
    s.offset = Math.max(0, touch.clientY - s.y);
    setOffset(s.offset);
  };

  const onTouchEnd = () => {
    const s = track.current;
    const close = Boolean(s?.dragging) && closesSheet(s);
    reset();
    if (close) onClose();
  };

  return {
    bind: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: reset },
    style: { transform: offset ? `translateY(${offset}px)` : undefined, transition: active ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)' },
  };
}

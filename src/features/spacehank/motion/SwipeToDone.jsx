import { useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { SWIPE_DONE, swipeAxis, swipeOffset, swipeOutcome, swipeProgress } from './swipe';

/**
 * A row that can be dragged to the right to finish it, like swiping a mail away: a tick appears behind it and grows as you go,
 * and past the mark it is done. A mouse can do it too; vertical drags are left to scroll the page. Wherever it is used the same
 * thing must also be reachable with a plain button (this is a shortcut, not the only way).
 */
export default function SwipeToDone({ onDone, disabled = false, children }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);

  const down = (event) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    drag.current = { x: event.clientX, y: event.clientY, axis: null, buzzed: false, id: event.pointerId };
  };

  const move = (event) => {
    const d = drag.current;
    if (!d) return;
    const rawX = event.clientX - d.x;
    if (!d.axis) {
      d.axis = swipeAxis(rawX, event.clientY - d.y);
      if (d.axis === 'x') {
        event.currentTarget.setPointerCapture?.(d.id);
        setDragging(true);
      } else if (d.axis === 'y') {
        drag.current = null;
      }
      return;
    }
    setDx(rawX);
    if (!d.buzzed && rawX >= SWIPE_DONE) {
      d.buzzed = true;
      navigator.vibrate?.(8);
    }
  };

  const up = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d || d.axis !== 'x') return;
    if (swipeOutcome(dx) === 'done') {
      setDx(0);
      onDone();
    } else {
      setDx(0);
    }
  };

  const progress = swipeProgress(dx);
  const shift = swipeOffset(dx);

  return (
    <div className="relative touch-pan-y select-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 grid w-14 place-items-center text-signal" style={{ opacity: progress, transform: `scale(${0.6 + progress * 0.4})` }}>
        <Check size={18} strokeWidth={2.4} />
      </span>
      <div style={{ transform: shift ? `translateX(${shift}px)` : undefined, transition: dragging ? 'none' : 'transform 0.4s var(--ease-out-expo)' }}>{children}</div>
    </div>
  );
}

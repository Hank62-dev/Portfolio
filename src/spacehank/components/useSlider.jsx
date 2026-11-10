import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { clsx } from '../../shared/lib/format';

const same = (a, b) => a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/**
 * The marker that glides to whichever tab is chosen, as on Hank Music's Home / Search / Library bar.
 * Put `ref` on the (relatively positioned) row of tabs, render `marker` as its first child, and give each tab
 * `relative z-10` and aria-selected; the marker finds the selected one itself, so tabs can be any width and the
 * row can wrap or scroll. `fit: 'x'` follows only the tab's left edge and width (for an underline; size and
 * position it with the class), the default follows the whole tab (for a pill). It does not animate on first paint.
 */
export function useSlider(active, className, { fit = 'box' } = {}) {
  const ref = useRef(null);
  const [box, setBox] = useState(null);
  const [live, setLive] = useState(false);

  const measure = () => {
    const el = ref.current?.querySelector('[aria-selected="true"]');
    const next = el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null;
    setBox((prev) => (same(prev, next) ? prev : next));
  };

  // after every render, so a tab that grew (a new count, a longer label) is followed too
  useLayoutEffect(measure);

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    document.fonts?.ready.then(measure);
    const frame = requestAnimationFrame(() => setLive(true));
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const style = box && { width: box.w, transform: `translate(${box.x}px, ${fit === 'x' ? 0 : box.y}px)`, ...(fit === 'x' ? null : { height: box.h }) };
  const marker = box ? (
    <i
      aria-hidden="true"
      style={style}
      className={clsx('pointer-events-none absolute left-0', fit === 'x' ? 'bottom-0' : 'top-0', live && 'transition-[transform,width,height] duration-500 ease-out-expo', className)}
      data-slider
    />
  ) : null;

  return { ref, marker, active };
}

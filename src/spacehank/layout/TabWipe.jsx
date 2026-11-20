import { useEffect, useState } from 'react';
import { canMove } from '../../shared/fx/gate';
import { sound } from '../core/sound';

// Where the last press was, so the next tab's colour can spread from the very place that was touched.
const press = { x: 0, y: 0, at: 0 };
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (event) => {
      press.x = event.clientX;
      press.y = event.clientY;
      press.at = performance.now();
    },
    { capture: true, passive: true }
  );
}

/**
 * The change of tab, in the new tab's colour: a wash of it spreads out as a circle from where the menu was touched (or sweeps
 * in from the side the tab lies on, when the change came from the keyboard or the command palette) and fades as the page
 * eases in under it. Mount it keyed by the tab. A soft whoosh plays with it when the sounds are on.
 */
export default function TabWipe({ hue, way }) {
  const [origin] = useState(() => {
    const recent = performance.now() - press.at < 800;
    if (recent) return { x: `${press.x}px`, y: `${press.y}px` };
    return { x: way === 'back' ? '0%' : '100%', y: '40%' };
  });
  const [show, setShow] = useState(Boolean(way) && canMove());
  useEffect(() => {
    if (!way) return undefined;
    sound.move();
    const timer = window.setTimeout(() => setShow(false), 800);
    return () => window.clearTimeout(timer);
  }, [way]);
  if (!show) return null;
  return <span aria-hidden="true" className="tab-wipe" style={{ '--wipe-hue': hue, '--wipe-x': origin.x, '--wipe-y': origin.y }} />;
}

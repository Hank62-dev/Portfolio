import { canMove } from './gate';

// A short burst of small pieces from a point on the screen (viewport coordinates): squares, dots and slivers that fly out,
// tumble, fall a little and fade. Drawn with the Web Animations API (no library), they take themselves away when done.
// With less motion asked for, nothing happens.

const SHAPES = ['square', 'dot', 'sliver'];

/** Where a burst should come from: a pointer event's point, an element's centre, or the middle of the screen. */
export const pointOf = (from) => {
  if (from && typeof from.clientX === 'number' && (from.clientX || from.clientY)) return { x: from.clientX, y: from.clientY };
  const el = from?.currentTarget ?? from?.target ?? from;
  if (el?.getBoundingClientRect) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
};

/**
 * Pieces in `colors` (any CSS colours) out of `x, y`. `spread` is how far they fly (px), `count` how many, `drop` how much
 * they fall at the end (px, as if they had weight), `up` lifts the whole spray (a fountain rather than a ring).
 */
export const burst = (x, y, { colors = ['#ff5b2e', '#ece6da'], count = 26, spread = 170, drop = 90, up = 0.35, z = 120 } = {}) => {
  if (typeof document === 'undefined' || !canMove() || typeof Element.prototype.animate !== 'function') return;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${z};overflow:hidden;contain:strict`;
  document.body.appendChild(layer);
  let left = count;
  for (let i = 0; i < count; i += 1) {
    const el = document.createElement('i');
    const shape = SHAPES[i % SHAPES.length];
    const size = 4 + Math.random() * 6;
    const w = shape === 'sliver' ? size * 0.45 : size;
    const h = shape === 'sliver' ? size * 1.8 : size;
    el.style.cssText = `position:absolute;left:${x - w / 2}px;top:${y - h / 2}px;width:${w}px;height:${h}px;background:${colors[i % colors.length]};border-radius:${shape === 'dot' ? '50%' : '1px'};will-change:transform,opacity`;
    layer.appendChild(el);
    const angle = Math.random() * Math.PI * 2;
    const reach = spread * (0.35 + Math.random() * 0.65);
    const dx = Math.cos(angle) * reach;
    const dy = Math.sin(angle) * reach - spread * up;
    const spin = (Math.random() - 0.5) * 900;
    const duration = 750 + Math.random() * 650;
    el.animate(
      [
        { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) rotate(${spin * 0.6}deg) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx * 1.1}px,${dy + drop}px) rotate(${spin}deg) scale(0.6)`, opacity: 0 },
      ],
      { duration, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: Math.random() * 40, fill: 'forwards' }
    ).onfinish = () => {
      left -= 1;
      if (!left) layer.remove();
    };
  }
};

/** A burst from wherever `from` is (an event, an element, nothing for the middle of the screen). */
export const burstFrom = (from, options) => {
  const { x, y } = pointOf(from);
  burst(x, y, options);
};

/**
 * A few small round pieces that fly in an arc from one place to another (a coin into a purse), one after another, and
 * vanish there. `from` and `to` are anything `pointOf` takes.
 */
export const flyTo = (from, to, { colors = ['#f5b100'], count = 7, size = 12, label = '' } = {}) => {
  if (typeof document === 'undefined' || !canMove() || typeof Element.prototype.animate !== 'function') return;
  const a = pointOf(from);
  const b = pointOf(to);
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:120;overflow:hidden;contain:strict';
  document.body.appendChild(layer);
  let left = count;
  for (let i = 0; i < count; i += 1) {
    const el = document.createElement('i');
    const color = colors[i % colors.length];
    el.textContent = label;
    el.style.cssText = `position:absolute;left:${a.x - size / 2}px;top:${a.y - size / 2}px;width:${size}px;height:${size}px;border-radius:50%;display:grid;place-items:center;font:700 ${size * 0.62}px/1 system-ui;font-style:normal;color:rgb(0 0 0 / 0.55);background:radial-gradient(circle at 35% 30%, #fff8, transparent 45%), ${color};box-shadow:0 0 0 1px rgb(0 0 0 / 0.15) inset, 0 4px 10px rgb(0 0 0 / 0.3)`;
    layer.appendChild(el);
    const dx = b.x - a.x + (Math.random() - 0.5) * 24;
    const dy = b.y - a.y + (Math.random() - 0.5) * 24;
    // the arc's top: above the higher of the two ends
    const lift = -Math.max(60, Math.abs(dx) * 0.35) + (Math.random() - 0.5) * 30;
    el.animate(
      [
        { transform: 'translate(0,0) scale(0.4)', opacity: 0 },
        { transform: `translate(${dx * 0.15}px,${lift * 0.6}px) scale(1.1)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${dx * 0.55}px,${dy * 0.5 + lift}px) scale(1)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${dx}px,${dy}px) scale(0.5)`, opacity: 0 },
      ],
      { duration: 800 + Math.random() * 200, delay: i * 55, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'both' }
    ).onfinish = () => {
      left -= 1;
      if (!left) layer.remove();
    };
  }
};

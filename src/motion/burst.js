import { gsap, prefersReducedMotion } from './gsap';

const COLORS = ['#ff5b2e', '#ece6da', '#ff8a5c', '#a8a396'];

/** A short burst of small squares from a point (viewport coordinates). They remove themselves. No-op with reduced motion. */
export const burst = (x, y, count = 28) => {
  if (prefersReducedMotion()) return;
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:96;overflow:hidden';
  document.body.appendChild(layer);

  const pieces = Array.from({ length: count }, () => {
    const el = document.createElement('i');
    const size = gsap.utils.random(4, 9);
    el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${gsap.utils.random(COLORS)}`;
    layer.appendChild(el);
    return el;
  });

  gsap.to(pieces, {
    x: () => gsap.utils.random(-200, 200),
    y: () => gsap.utils.random(-260, 60),
    rotation: () => gsap.utils.random(-420, 420),
    opacity: 0,
    duration: () => gsap.utils.random(0.9, 1.5),
    ease: 'power3.out',
    stagger: 0.004,
    onComplete: () => layer.remove(),
  });
};

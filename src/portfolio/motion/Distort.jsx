import { useEffect, useId, useRef } from 'react';
import { clsx } from '../../shared/lib/format';
import { gsap, MOTION } from './gsap';
import { motionStore } from './store';

/**
 * How hard to bend for a given speed: nothing below a small dead zone (so still pictures stay sharp),
 * then rising and levelling off. Returns 0..1.
 */
export const distortAmount = (speed) => {
  const s = Math.max(0, Math.abs(speed) - 0.6);
  return 1 - Math.exp(-s * 0.09);
};

const SCALE = 46; // displacement at full amount, in px
const SPLIT = 7; // red channel offset at full amount, in px

/**
 * Wraps a picture (an image, an SVG, anything) and bends it like liquid while it moves: a noise
 * displacement plus a red/cyan split, both growing with speed and easing back to a clean image when
 * the movement stops. The speed is the page's scroll speed, plus whatever `getSpeed` adds (the floating
 * preview passes how fast it is being dragged). With reduced motion it is a plain wrapper.
 */
export default function Distort({ children, className, getSpeed, axis = 'y' }) {
  const raw = useId();
  const id = `distort-${raw.replace(/[^a-zA-Z0-9-]/g, '')}`;
  const box = useRef(null);
  const map = useRef(null);
  const red = useRef(null);
  const noise = useRef(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION, () => {
      const el = box.current;
      let now = 0;
      let applied = false;
      let t = 0;
      const tick = (_, deltaMs) => {
        // React detaches refs before it runs this effect's cleanup: a frame can land in between
        if (!map.current || !red.current || !noise.current) return;
        const speed = Math.abs(motionStore.velocity) + (getSpeed ? getSpeed() : 0);
        const target = distortAmount(speed);
        now += (target - now) * (target > now ? 0.25 : 0.08);
        if (now < 0.004) {
          if (applied) {
            el.style.filter = '';
            applied = false;
          }
          now = 0;
          return;
        }
        if (!applied) {
          el.style.filter = `url(#${id})`;
          applied = true;
        }
        t += deltaMs / 1000;
        map.current.setAttribute('scale', (now * SCALE).toFixed(2));
        const dir = Math.sign(motionStore.velocity || 1);
        red.current.setAttribute(axis === 'y' ? 'dy' : 'dx', (now * SPLIT * dir).toFixed(2));
        // the ripple drifts while it is visible, so it reads as liquid rather than a fixed warp
        const f = axis === 'y' ? `0.006 ${(0.028 + Math.sin(t * 2) * 0.004).toFixed(4)}` : `${(0.028 + Math.sin(t * 2) * 0.004).toFixed(4)} 0.006`;
        noise.current.setAttribute('baseFrequency', f);
      };
      gsap.ticker.add(tick);
      return () => {
        gsap.ticker.remove(tick);
        el.style.filter = '';
      };
    });
    return () => mm.revert();
  }, [id, getSpeed, axis]);

  return (
    <div ref={box} className={clsx('will-change-[filter]', className)}>
      <svg className="pointer-events-none absolute size-0" aria-hidden="true" focusable="false">
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feTurbulence ref={noise} type="fractalNoise" baseFrequency="0.006 0.028" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap ref={map} in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="warp" />
          <feColorMatrix in="warp" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset ref={red} in="r" dx="0" dy="0" result="rs" />
          <feColorMatrix in="warp" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
          <feBlend in="rs" in2="gb" mode="screen" />
        </filter>
      </svg>
      {children}
    </div>
  );
}

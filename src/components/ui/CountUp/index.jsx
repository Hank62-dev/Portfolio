import { useLayoutEffect, useRef, useState } from 'react';
import { useLang } from '../../../lib/i18n';
import { formatNumber } from '../../../lib/format';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * Counts from 0 to `value` the first time it scrolls into view.
 * The real value is the default render, so it is correct without JS effects or with reduced motion.
 */
const CountUp = ({ value, duration = 1400 }) => {
  const { lang } = useLang();
  const ref = useRef(null);
  const [shown, setShown] = useState(value);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion() || !('IntersectionObserver' in window)) {
      setShown(value);
      return undefined;
    }

    setShown(0);
    let raf = 0;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          setShown(Math.round(value * easeOutCubic(p)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {formatNumber(shown, lang)}
    </span>
  );
};

export default CountUp;

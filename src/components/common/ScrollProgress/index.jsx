import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** A 2px line at the top of the window showing how far down the page you are. */
const ScrollProgress = () => {
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${p.toFixed(4)})`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [pathname]);

  return (
    <div
      ref={ref}
      // the width is driven by an inline `transform` each frame, hence the arbitrary starting value
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-signal will-change-transform [transform:scaleX(0)]"
      aria-hidden="true"
    />
  );
};

export default ScrollProgress;

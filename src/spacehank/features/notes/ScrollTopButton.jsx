import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clsx } from '../../../shared/lib/format';
import { player } from '../music/player';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';

// A round button that takes a long note back to its top. It appears once the page has been scrolled a screen or so, and it
// keeps clear of the tab bar and of the music bar, wherever each of them is on this screen size.

const SHOW_AFTER = 480; // px scrolled before it is worth offering

/** `container`: the element that scrolls, when it is not the page itself (a note shown full screen scrolls on its own, with nothing under it: `low`). */
export default function ScrollTopButton({ container = null, low = false }) {
  const [visible, setVisible] = useState(false);
  const music = useStore(player, (s) => Boolean(s.trackId));

  useEffect(() => {
    const source = container ?? window;
    let frame = 0;
    const look = () => {
      frame = 0;
      setVisible((container ? container.scrollTop : window.scrollY) > SHOW_AFTER);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(look);
    };
    look();
    source.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      source.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [container]);

  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label={tr('Back to top')}
      title={tr('Back to top')}
      onClick={() => (container ?? window).scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
      className={clsx(
        'fixed right-4 z-30 grid size-12 animate-fade-in place-items-center rounded-full border border-line-strong bg-ink-1/90 text-bone shadow-[0_14px_30px_-12px_rgb(var(--shadow-rgb)/0.9)] backdrop-blur transition-[transform,border-color,color] hover:border-signal hover:text-signal active:scale-90 md:right-8',
        // phones: above the tab bar (and the music bar when a track is loaded); wider screens: above the music bar along the bottom
        low ? 'bottom-[calc(1.5rem+env(safe-area-inset-bottom))] md:bottom-8' : music ? 'bottom-[calc(12rem+env(safe-area-inset-bottom))] md:bottom-28' : 'bottom-[calc(7.8rem+env(safe-area-inset-bottom))] md:bottom-8'
      )}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}

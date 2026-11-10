import { useEffect } from 'react';
import { canUsePointerFx } from '../../shared/hooks/useMotion';

/**
 * A soft light under the pointer on every card (an element with data-card), drawn as a hairline of light along its border.
 * One listener for the whole app: it writes the pointer position onto the card under it, and only on a desktop with a mouse
 * and when motion is welcome.
 */
export const useCardGlow = (root) => {
  useEffect(() => {
    const el = root?.current;
    if (!el || !canUsePointerFx()) return undefined;
    let frame = 0;
    let lit = null;

    const off = () => {
      lit?.classList.remove('is-lit');
      lit = null;
    };
    const onMove = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const card = event.target.closest?.('[data-card]');
        if (card !== lit) {
          off();
          lit = card;
          lit?.classList.add('is-lit');
        }
        if (card) {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${event.clientX - r.left}px`);
          card.style.setProperty('--my', `${event.clientY - r.top}px`);
        }
      });
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', off);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', off);
      off();
    };
  }, [root]);
};

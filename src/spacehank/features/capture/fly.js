import { afterPaint, prefersReducedMotion } from '../../core/motion/hooks';

/**
 * A small copy of what was just captured flies from where it was typed to the Inbox card (which gives a nudge when it lands).
 * When the Inbox is not on the screen, it just lifts away and fades. Nothing happens for anyone who wants less motion.
 * `rect` is where it starts (a DOMRect: the input or the sheet).
 */
export const flyToInbox = (rect, text) => {
  if (prefersReducedMotion() || !rect || typeof document === 'undefined') return;
  const startX = rect.left + Math.min(rect.width / 2, 140);
  const startY = rect.top + Math.min(rect.height / 2, 30);
  afterPaint(() => {
    const target = document.querySelector('[data-inbox-target]');
    const end = target?.getBoundingClientRect();
    const dx = end ? end.left + 24 - startX : 0;
    const dy = end ? end.top + end.height / 2 - startY : -70;

    const ghost = document.createElement('div');
    ghost.className = 'fly-ghost';
    ghost.textContent = String(text).slice(0, 36);
    ghost.style.left = `${startX}px`;
    ghost.style.top = `${startY}px`;
    document.body.appendChild(ghost);

    const flight = ghost.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.55}px), calc(-50% + ${dy * 0.35 - 24}px)) scale(0.8)`, opacity: 0.95, offset: 0.45 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.28)`, opacity: end ? 0.2 : 0 },
      ],
      { duration: end ? 760 : 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
    );
    const land = () => {
      ghost.remove();
      if (target) {
        target.classList.remove('bump');
        void target.offsetWidth; // so the nudge plays again if it was just playing
        target.classList.add('bump');
      }
    };
    flight.finished.then(land, () => ghost.remove());
  });
};

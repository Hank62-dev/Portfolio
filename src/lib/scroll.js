import { lenisRef } from '../motion/SmoothScroll';

const headerOffset = () => -(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--spacing-header'), 10) || 64);

/** Scrolls to an element (or the top) with Lenis when it is running, natively otherwise. */
export const scrollToTarget = (target, { immediate = false } = {}) => {
  const lenis = lenisRef.current;
  if (lenis) {
    lenis.scrollTo(target, { offset: target === 0 ? 0 : headerOffset(), immediate, duration: 1.4 });
  } else if (target === 0) {
    window.scrollTo(0, 0);
  } else {
    target.scrollIntoView();
  }
};

/** Click handler: scroll to a section on the current page and keep the URL hash in sync. */
export const jumpTo = (id) => (e) => {
  e.preventDefault();
  const el = document.getElementById(id);
  if (el) scrollToTarget(el);
  window.history.replaceState(null, '', `/#${id}`);
};

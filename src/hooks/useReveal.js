import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SELECTOR = '[data-reveal]:not(.in)';

/**
 * Adds `.in` to any [data-reveal] element as it enters the viewport.
 * A MutationObserver also picks up elements that render later (e.g. once GitHub data arrives),
 * so nothing can stay hidden. Content is never hidden without JS (see .js in global.css).
 */
export const useReveal = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const root = document.getElementById('main') ?? document.body;

    if (!('IntersectionObserver' in window)) {
      root.querySelectorAll(SELECTOR).forEach((el) => el.classList.add('in'));
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    const watch = (scope) => {
      if (scope.matches?.(SELECTOR)) io.observe(scope);
      scope.querySelectorAll?.(SELECTOR).forEach((el) => io.observe(el));
    };

    watch(root);
    const mo = new MutationObserver((records) =>
      records.forEach((r) => r.addedNodes.forEach((n) => n.nodeType === 1 && watch(n)))
    );
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
};

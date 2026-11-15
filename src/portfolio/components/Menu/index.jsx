import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { NAV_SECTIONS, profile, socials } from '../../../shared/profile';
import { byTier } from '../../data/projects';
import { useLang } from '../../i18n';
import { clsx } from '../../../shared/lib/format';
import { gsap, prefersReducedMotion } from '../../motion/gsap';
import LangToggle from '../LangToggle';
import LocalClock from '../LocalClock';

const firstCover = (tier) => byTier(tier).find((p) => p.cover)?.cover ?? null;

// What the preview beside the list shows for each section: a picture where the site has one.
const PICTURES = {
  work: firstCover('featured'),
  lab: firstCover('lab'),
  immersive: '/images/vr-gallery.jpg',
  about: profile.portrait,
};

const FOCUSABLE = 'a[href], button:not([disabled])';
const titleOf = (field) => (Array.isArray(field) ? field.join(' ') : field ?? '');

/**
 * The full-screen menu. It opens as a circle growing out of the menu button, the section names rise one
 * after another, and pointing at one shows what is there beside the list. Escape or the close button
 * shuts it; focus stays inside while it is open and goes back to the button afterwards.
 *   origin   { x, y } in viewport pixels: where the circle grows from
 *   onGo     (id) => handler for a section link
 */
const Menu = ({ open, onClose, origin, active, onGo, returnFocus }) => {
  const { c } = useLang();
  const root = useRef(null);
  const [preview, setPreview] = useState(active || NAV_SECTIONS[0]);
  const [shown, setShown] = useState(open);

  useEffect(() => {
    if (open) setPreview(active || NAV_SECTIONS[0]);
  }, [open, active]);

  // open: mount, then grow; close: shrink, then unmount
  useLayoutEffect(() => {
    if (open) setShown(true);
  }, [open]);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const at = `${origin?.x ?? window.innerWidth - 40}px ${origin?.y ?? 32}px`;
    const reduced = prefersReducedMotion();

    if (open) {
      if (reduced) {
        gsap.set(el, { clipPath: 'none', autoAlpha: 1 });
        return undefined;
      }
      const tl = gsap.timeline();
      tl.fromTo(el, { clipPath: `circle(0% at ${at})`, autoAlpha: 1 }, { clipPath: `circle(150% at ${at})`, duration: 0.9, ease: 'expo.inOut' })
        .fromTo(el.querySelectorAll('[data-menu-line]'), { yPercent: 115, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 1, ease: 'expo.out', stagger: 0.05 }, 0.3)
        .fromTo(el.querySelectorAll('[data-menu-fade]'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, 0.5);
      return () => tl.kill();
    }

    if (!shown) return undefined;
    if (reduced) {
      setShown(false);
      return undefined;
    }
    const tl = gsap.timeline({ onComplete: () => setShown(false) });
    tl.to(el.querySelectorAll('[data-menu-line]'), { yPercent: -115, duration: 0.4, ease: 'power3.in', stagger: 0.025 }).to(
      el,
      { clipPath: `circle(0% at ${at})`, duration: 0.6, ease: 'expo.inOut' },
      0.15
    );
    return () => tl.kill();
    // `shown` is read, not watched: this runs when `open` flips (the element exists whenever it is open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // keyboard: Escape closes, Tab cycles inside; focus moves in on open and back out on close
  useEffect(() => {
    if (!open) return undefined;
    const el = root.current;
    const trigger = returnFocus?.current;
    const id = requestAnimationFrame(() => el?.querySelector('[data-menu-link]')?.focus({ preventScroll: true }));
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const items = [...el.querySelectorAll(FOCUSABLE)];
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('keydown', onKey);
      trigger?.focus({ preventScroll: true });
    };
  }, [open, onClose, returnFocus]);

  if (!shown && !open) return null;

  const index = NAV_SECTIONS.indexOf(preview);

  return createPortal(
    <div
      ref={root}
      id="site-menu"
      role="dialog"
      aria-modal="true"
      aria-label={c.nav.menu}
      className="invisible fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-ink-0 text-bone"
    >
      <div className="wrap flex h-header shrink-0 items-center justify-between">
        <span data-menu-fade className="font-mono text-fine tracking-[0.1em] text-bone-faint uppercase">
          {c.nav.menu}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="group -mr-2 inline-flex h-11 items-center gap-3 px-2 font-mono text-fine text-bone-dim hover:text-bone"
          aria-label={c.nav.close}
        >
          <span>{c.nav.closeShort}</span>
          <span className="relative size-4" aria-hidden="true">
            <span className="absolute inset-x-0 top-1/2 h-[1.5px] rotate-45 bg-current transition-transform duration-500 ease-out-expo group-hover:rotate-[135deg]" />
            <span className="absolute inset-x-0 top-1/2 h-[1.5px] -rotate-45 bg-current transition-transform duration-500 ease-out-expo group-hover:rotate-45" />
          </span>
        </button>
      </div>

      <div className="wrap grid flex-1 content-center gap-10 py-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Primary">
          <ol>
            {NAV_SECTIONS.map((id, i) => (
              <li key={id} className="overflow-hidden border-b border-line">
                <Link
                  to={`/#${id}`}
                  data-menu-link
                  data-menu-line
                  onClick={onGo(id)}
                  onPointerEnter={() => setPreview(id)}
                  onFocus={() => setPreview(id)}
                  aria-current={active === id ? 'location' : undefined}
                  className={clsx(
                    'group flex items-baseline gap-4 py-[clamp(4px,1vh,12px)] font-display text-[min(clamp(2rem,1rem+3.6vw,4.6rem),8vh)] leading-[1.02] transition-[color,translate] duration-500 ease-out-expo hover:translate-x-3 hover:text-signal focus-visible:translate-x-3 focus-visible:text-signal',
                    active === id ? 'text-signal' : 'text-bone'
                  )}
                >
                  <span className="w-8 shrink-0 font-mono text-fine text-bone-faint transition-colors group-hover:text-signal">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{c.nav[id]}</span>
                  <span className="ml-auto -translate-x-3 font-body text-[0.4em] opacity-0 transition-[opacity,translate] duration-500 ease-out-expo group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true">
                    ↘
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        {/* What is in the section being pointed at. Decorative: the links say it all. */}
        <div data-menu-fade className="relative hidden aspect-[4/5] max-h-[62vh] overflow-hidden rounded-card border border-line-strong bg-ink-1 lg:block" aria-hidden="true">
          {NAV_SECTIONS.map((id) => (
            <div
              key={id}
              className={clsx(
                'absolute inset-0 transition-[clip-path,scale] duration-[900ms] ease-out-expo',
                id === preview ? 'z-10 scale-100 [clip-path:inset(0)]' : 'z-0 scale-110 [clip-path:inset(100%_0_0_0)]'
              )}
            >
              {PICTURES[id] ? (
                <img src={PICTURES[id]} alt="" loading="lazy" className="size-full object-cover brightness-[0.7]" />
              ) : (
                <div className="grid size-full place-items-center bg-ink-2">
                  <span className="font-display text-[14rem] leading-none text-transparent [-webkit-text-stroke:1px_var(--color-signal)]">
                    {String(NAV_SECTIONS.indexOf(id) + 1).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          ))}
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink-0/95 via-ink-0/60 to-transparent p-6 pt-24">
            <p className="font-mono text-[0.72rem] tracking-[0.1em] text-signal uppercase">
              {String(index + 1).padStart(2, '0')} · {c[preview]?.label}
            </p>
            <p className="mt-2 font-display text-h3 leading-[1.1] text-bone">{titleOf(c[preview]?.title)}</p>
          </div>
        </div>
      </div>

      <div data-menu-fade className="wrap flex shrink-0 flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-line py-6 font-mono text-fine text-bone-dim">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {socials.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-signal">
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>
        <a href={`mailto:${profile.email}`} className="text-bone transition-colors hover:text-signal">
          {profile.email}
        </a>
        <div className="flex items-center gap-5">
          <span>
            HCM · <LocalClock />
          </span>
          <LangToggle />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Menu;

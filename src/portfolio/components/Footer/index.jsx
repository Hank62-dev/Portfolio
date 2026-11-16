import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_SECTIONS, profile, socials } from '../../../shared/profile';
import { byTier, projectHref } from '../../data/projects';
import { useLang } from '../../i18n';
import { jumpTo, scrollToTarget } from '../../lib/scroll';
import { burst } from '../../motion/burst';
import { gsap, MOTION, ScrollTrigger } from '../../motion/gsap';
import { useLetterProximity } from '../../motion/useLetterProximity';
import { useGsap } from '../../motion/useGsap';
import { useFitText } from '../../motion/useFitText';
import { usePointerGlow } from '../../../shared/hooks/useMotion';
import Button from '../../../shared/ui/Button';
import LocalClock from '../LocalClock';
import ParticleName from './ParticleName';
import { MarqueeRow } from '../Marquee';

// a hairline that draws in from the left on hover and drains out to the right
const LINK =
  'relative inline-block py-1 text-bone transition-colors duration-300 hover:text-signal after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-right after:scale-x-0 after:bg-signal after:transition-transform after:duration-500 after:ease-out-expo hover:after:origin-left hover:after:scale-x-100 focus-visible:after:scale-x-100';
const HEAD = 'mb-4 font-mono text-[0.72rem] tracking-[0.1em] text-bone-faint uppercase';

/**
 * The invitation above the footer: the call to talk running across the screen in outline type, and a
 * line with the two ways to get in touch. In the page's flow (not part of the revealed footer), so a
 * short window never has to fit it.
 */
const Invite = () => {
  const { c } = useLang();
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const glow = usePointerGlow();
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async (event) => {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      burst(left + width / 2, top + height / 2);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the mailto button still works */
    }
  };

  const scope = useGsap(({ mm }) => {
    mm.add(MOTION, () => {
      gsap.from('[data-invite-fade]', {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '[data-invite-fade]', start: 'top 92%', once: true },
      });
    });
  }, []);

  return (
    <section
      ref={(el) => {
        scope.current = el;
        glow.current = el;
      }}
      className="group relative overflow-hidden border-t border-line bg-ink-1/70 pt-[clamp(48px,7vw,96px)] pb-[clamp(40px,6vw,80px)] backdrop-blur-[2px]"
      aria-labelledby="invite-title"
    >
      <i
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 [background:radial-gradient(600px_circle_at_var(--mx,50%)_var(--my,50%),rgb(255_91_46/0.14),transparent_70%)] fine:group-hover:opacity-100"
        aria-hidden="true"
      />
      <a href={`mailto:${profile.email}`} data-cursor="mail" tabIndex={-1} aria-hidden="true" className="relative block">
        <MarqueeRow items={c.footer.marquee} big />
      </a>
      <div className="wrap relative mt-[clamp(32px,5vw,64px)] grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <h2 id="invite-title" data-invite-fade className="font-display text-h2">
            {c.footer.inviteTitle}
          </h2>
          <p data-invite-fade className="mt-4 max-w-[52ch] text-lead text-bone-dim">
            {c.footer.inviteLede}
          </p>
        </div>
        <div data-invite-fade className="flex flex-wrap gap-3">
          <Button fill href={`mailto:${profile.email}`} icon="→">
            {c.footer.write}
          </Button>
          <Button fill variant="ghost" onClick={copy}>
            {copied ? c.footer.copied : c.footer.copy}
          </Button>
          <span className="sr-only" role="status" aria-live="polite">
            {copied ? c.footer.copied : ''}
          </span>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  const { c, t } = useLang();
  const { pathname } = useLocation();
  const year = new Date().getFullYear();
  const wordmark = useRef(null);
  const inner = useRef(null);
  const wordmarkText = useRef(null);
  useFitText(wordmarkText);
  const [height, setHeight] = useState(0);
  const [reveal, setReveal] = useState(false);
  // with a mouse the name is a cloud of dust (ParticleName); the letters underneath only keep its place
  const [dust, setDust] = useState(false);
  const onDust = useCallback((on) => setDust(on), []);
  useLetterProximity(wordmark);
  const featured = byTier('featured');

  // The footer waits underneath the page: its frame is in the flow, the footer itself is pinned to the
  // bottom of the window and clipped to the frame, so scrolling down uncovers it. Only when it fits in the
  // window and motion is welcome; otherwise it is an ordinary footer.
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return undefined;
    const motionOk = window.matchMedia(MOTION).matches;
    const measure = () => {
      const h = el.offsetHeight;
      setHeight(h);
      setReveal(motionOk && h > 0 && h <= window.innerHeight - 48);
    };
    measure();
    const ro = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // the page below the footer changed length: let ScrollTrigger measure again
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [reveal, height]);

  // Everything is triggered by the frame, which is in the flow: the pinned footer itself never moves.
  const scope = useGsap(
    ({ scope: ref, mm }) => {
      mm.add(MOTION, () => {
        const frame = ref.current;
        const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: 'top 85%', once: true } });
        tl.from(frame.querySelectorAll('[data-footer-rule]'), { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'expo.out', stagger: 0.08 })
          .from(frame.querySelectorAll('[data-footer-col]'), { y: 40, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.1)
          .from(frame.querySelectorAll('[data-letter]'), { yPercent: 105, duration: 1.3, ease: 'expo.out', stagger: 0.05 }, 0.25)
          .from(frame.querySelectorAll('[data-footer-row]'), { y: 16, opacity: 0, duration: 0.8, ease: 'expo.out' }, 0.6);
        if (reveal) {
          // the footer comes up out of the dark and settles as it is uncovered
          gsap.fromTo(
            frame.querySelector('[data-footer-shade]'),
            { opacity: 0.85 },
            { opacity: 0, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom bottom', scrub: true } }
          );
          gsap.fromTo(
            frame.querySelector('[data-footer-body]'),
            { yPercent: 18 },
            { yPercent: 0, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom bottom', scrub: true } }
          );
        }
      });
    },
    [reveal]
  );

  const sectionLink = (id) => (pathname === '/' ? { to: `/#${id}`, onClick: jumpTo(id) } : { to: `/#${id}` });

  return (
    <>
      <Invite />
      <footer
        ref={scope}
        className="relative"
        style={reveal ? { height, clipPath: 'inset(0 0 0 0)' } : undefined}
      >
        <div
          ref={inner}
          className={
            reveal
              ? 'fixed inset-x-0 bottom-0 overflow-hidden bg-ink-1 text-fine text-bone-dim'
              : 'relative overflow-hidden bg-ink-1 text-fine text-bone-dim'
          }
        >
          <div data-footer-body className="pt-[clamp(48px,6vw,80px)] pb-6">
            <div className="wrap grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-[1fr_1.3fr_1.2fr_1fr]">
              <nav data-footer-col aria-label={c.footer.explore}>
                <h2 className={HEAD}>{c.footer.explore}</h2>
                <ul className="grid gap-1">
                  {NAV_SECTIONS.map((id) => (
                    <li key={id}>
                      <Link {...sectionLink(id)} className={LINK}>
                        {c.nav[id]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav data-footer-col aria-label={c.footer.work}>
                <h2 className={HEAD}>{c.footer.work}</h2>
                <ul className="grid gap-1">
                  {featured.map((p) => (
                    <li key={p.slug}>
                      <Link to={projectHref(p)} className={LINK} data-cursor="view">
                        {p.name}
                      </Link>
                      <span className="ml-2 font-mono text-[0.7rem] text-bone-faint">{p.year}</span>
                    </li>
                  ))}
                </ul>
              </nav>

              <div data-footer-col>
                <h2 className={HEAD}>{c.footer.contact}</h2>
                <a href={`mailto:${profile.email}`} className={`${LINK} font-display text-[clamp(1.2rem,1rem+0.6vw,1.5rem)]`} data-cursor="mail">
                  {profile.email}
                </a>
                <dl className="mt-5 grid gap-3">
                  <div>
                    <dt className="font-mono text-[0.7rem] tracking-[0.08em] text-bone-faint uppercase">{c.footer.based}</dt>
                    <dd className="text-bone">{t(profile.location)}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[0.7rem] tracking-[0.08em] text-bone-faint uppercase">{c.footer.local}</dt>
                    <dd className="font-mono text-bone">
                      <LocalClock /> <span className="text-bone-faint">GMT+7</span>
                    </dd>
                  </div>
                </dl>
              </div>

              <nav data-footer-col aria-label={c.footer.social}>
                <h2 className={HEAD}>{c.footer.social}</h2>
                <ul className="grid gap-1">
                  {socials.map((s) => (
                    <li key={s.id}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className={LINK} data-cursor="go">
                        {s.label} <span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="wrap mt-12" aria-hidden="true">
              <i data-footer-rule className="block h-px bg-line-strong" />
            </div>

            {/* The name, enormous. Decorative repeat of the header, so it is hidden from assistive technology. */}
            <div ref={wordmark} className="wrap relative mt-6 select-none" aria-hidden="true">
              <ParticleName textRef={wordmarkText} onActive={onDust} />
              <p
                ref={wordmarkText}
                data-wordmark
                className="inline-block overflow-hidden pt-[0.06em] pb-[0.14em] font-display text-[clamp(3.5rem,17vw,18rem)] leading-[0.9] tracking-[-0.02em] whitespace-nowrap text-bone"
                style={dust ? { color: 'transparent' } : undefined}
              >
                {[...profile.name].map((char, i) => (
                  <span key={i} data-letter={dust ? undefined : true} className="inline-block whitespace-pre">
                    {char}
                  </span>
                ))}
              </p>
            </div>

            <div data-footer-row className="wrap mt-4 flex flex-wrap items-center justify-between gap-x-10 gap-y-3 font-mono">
              <p>
                <span className="text-bone">© {year} Võ Gia Huy</span> · {c.footer.built}
              </p>
              {/* a hint for the curious: the keys that open the developer's view (components/DevMode) */}
              <p className="hidden items-center gap-2 fine:flex">
                <kbd className="rounded border border-line-strong px-1.5 text-bone">G</kbd>
                <kbd className="rounded border border-line-strong px-1.5 text-bone">D</kbd>
                {c.dev.hint}
              </p>
              <a
                href="#top"
                className={LINK}
                data-cursor="top"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTarget(0);
                }}
              >
                {c.footer.top} ↑
              </a>
            </div>
          </div>
          {reveal && <i data-footer-shade className="pointer-events-none absolute inset-0 bg-ink-0" aria-hidden="true" />}
        </div>
      </footer>
    </>
  );
};

export default Footer;

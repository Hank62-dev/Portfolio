import { useEffect, useRef, useState } from 'react';
import { profile, socials } from '../../../data/profile';
import { useLang } from '../../../lib/i18n';
import { scrollToTarget } from '../../../lib/scroll';
import { gsap, MOTION } from '../../../motion/gsap';
import { useLetterProximity } from '../../../motion/useLetterProximity';
import { useGsap } from '../../../motion/useGsap';

const linkCls = 'py-1.5 transition-colors duration-200 hover:text-signal';

const TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Ho Chi Minh City time, ticking every second. */
const LocalClock = () => {
  const [now, setNow] = useState(() => TIME.format(new Date()));
  useEffect(() => {
    const id = setInterval(() => setNow(TIME.format(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return <time className="tabular-nums">{now}</time>;
};

const Footer = () => {
  const { c, t } = useLang();
  const year = new Date().getFullYear();
  const wordmark = useRef(null);
  useLetterProximity(wordmark);

  const scope = useGsap(({ mm }) => {
    mm.add(MOTION, () => {
      gsap.from('[data-footer-row]', {
        y: 24,
        opacity: 0,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.1,
        scrollTrigger: { trigger: '[data-footer-row]', start: 'top 95%', once: true },
      });
      gsap.from('[data-letter]', {
        yPercent: 105,
        duration: 1.3,
        ease: 'expo.out',
        stagger: 0.05,
        scrollTrigger: { trigger: '[data-wordmark]', start: 'top 100%', once: true },
      });
    });
  }, []);

  return (
    <footer ref={scope} className="relative overflow-hidden border-t border-line pt-10 pb-6 font-mono text-fine text-bone-dim">
      <div className="wrap flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
        <div data-footer-row>
          <p className="text-bone">© {year} Võ Gia Huy</p>
          <p className="mt-1">{c.footer.built}</p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2" data-footer-row>
          {socials.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className={linkCls}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-6" data-footer-row>
          <p>
            {t(profile.location).split(',')[0]} · <LocalClock />
          </p>
          <a
            href="#top"
            className={linkCls}
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

      {/* The name, enormous. Decorative repeat of the header, so it is hidden from assistive technology. */}
      <div ref={wordmark} className="wrap mt-10 select-none" aria-hidden="true">
        <p
          data-wordmark
          className="overflow-hidden pb-[0.14em] font-display text-[clamp(3.5rem,21vw,20rem)] leading-[0.9] tracking-[-0.02em] whitespace-nowrap text-bone"
        >
          {[...profile.name].map((char, i) => (
            <span key={i} data-letter className="inline-block whitespace-pre">
              {char}
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
};

export default Footer;

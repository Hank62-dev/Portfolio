import { useEffect, useRef, useState } from 'react';
import { profile, socials } from '../../data/profile';
import { useLang } from '../../lib/i18n';
import { usePointerGlow } from '../../hooks/useMotion';
import { burst } from '../../motion/burst';
import { gsap, MOTION, ScrollTrigger } from '../../motion/gsap';
import { useGsap } from '../../motion/useGsap';
import { useLetterProximity } from '../../motion/useLetterProximity';
import SectionTitle from '../../components/common/SectionTitle';
import Button from '../../design-system/Button';

const Contact = () => {
  const { c } = useLang();
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const glowRef = usePointerGlow();
  const emailRef = useRef(null);
  useLetterProximity(emailRef, { radius: 200, lift: 22, rest: '#ece6da' });

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
      /* clipboard blocked: the mailto link and visible address still work */
    }
  };

  const scope = useGsap(({ scope: ref, mm }) => {
    mm.add(MOTION, () => {
      const root = ref.current;
      gsap.from('[data-email-letter]', {
        yPercent: 110,
        rotate: 6,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.035,
        scrollTrigger: { trigger: root.querySelector('[data-email]'), start: 'top 90%', once: true },
      });
      ScrollTrigger.batch(root.querySelectorAll('[data-social]'), {
        start: 'top 94%',
        once: true,
        onEnter: (batch) => gsap.from(batch, { x: 60, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1 }),
      });
      gsap.from('[data-contact-fade]', {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.12,
        scrollTrigger: { trigger: root, start: 'top 55%', once: true },
      });
    });
  }, []);

  return (
    <section
      id="contact"
      ref={(el) => {
        scope.current = el;
        glowRef.current = el;
      }}
      className="group relative overflow-hidden py-section"
      aria-labelledby="contact-title"
    >
      {/* a warm light that follows the pointer across the section */}
      <i
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 [background:radial-gradient(520px_circle_at_var(--mx,50%)_var(--my,50%),rgb(255_91_46/0.12),transparent_70%)] fine:group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="wrap relative">
        <SectionTitle id="contact-title" index="06" label={c.contact.label} title={c.contact.title} />

        <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr] lg:gap-24">
          <div>
            <p data-contact-fade className="max-w-[46ch] text-lead text-bone-dim">
              {c.contact.lede}
            </p>
            <a
              ref={emailRef}
              data-email
              data-cursor="mail"
              href={`mailto:${profile.email}`}
              aria-label={profile.email}
              className="mt-7 mb-8 block overflow-hidden pb-2 font-display text-[clamp(1.7rem,0.8rem+4.2vw,4.2rem)] leading-[1.1] break-words text-bone"
            >
              {[...profile.email].map((char, i) => (
                <span key={i} data-letter className="inline-block overflow-hidden align-top">
                  <span data-email-letter className="inline-block">
                    {char}
                  </span>
                </span>
              ))}
            </a>
            <div data-contact-fade className="flex flex-wrap gap-3">
              <Button href={`mailto:${profile.email}`} icon="→">
                {c.contact.write}
              </Button>
              <Button variant="ghost" onClick={copy}>
                {copied ? c.contact.copied : c.contact.copy}
              </Button>
              <span className="sr-only" role="status" aria-live="polite">
                {copied ? c.contact.copied : ''}
              </span>
            </div>
          </div>

          <nav aria-label={c.contact.elsewhere}>
            <h3 data-contact-fade className="mb-2 font-mono text-fine font-medium tracking-[0.08em] text-bone-faint uppercase">
              {c.contact.elsewhere}
            </h3>
            <ul className="border-t border-line-strong">
              {socials.map((s) => (
                <li key={s.id} data-social>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="go"
                    className="group/link relative isolate flex items-baseline justify-between gap-4 overflow-hidden border-b border-line py-[18px] font-display text-h3 transition-[color,padding] duration-500 ease-out-expo hover:pl-3 hover:text-signal"
                  >
                    <i
                      className="absolute inset-y-0 left-0 -z-10 w-full origin-left scale-x-0 bg-gradient-to-r from-signal/12 to-transparent transition-transform duration-700 ease-out-expo group-hover/link:scale-x-100"
                      aria-hidden="true"
                    />
                    <span>{s.label}</span>
                    <span className="font-mono text-fine text-bone-dim transition-transform duration-500 ease-out-expo group-hover/link:-translate-y-0.5">
                      {s.handle} ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </section>
  );
};

export default Contact;

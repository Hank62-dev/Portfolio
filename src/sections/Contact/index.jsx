import { useEffect, useRef, useState } from 'react';
import { profile, socials } from '../../data/profile';
import { useLang } from '../../lib/i18n';
import SectionTitle from '../../components/common/SectionTitle';
import Button from '../../components/common/Button';

const Contact = () => {
  const { c } = useLang();
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the mailto link and visible address still work */
    }
  };

  return (
    <section id="contact" className="relative py-section" aria-labelledby="contact-title">
      <div className="wrap">
        <SectionTitle id="contact-title" index="06" label={c.contact.label} title={c.contact.title} />

        <div className="grid gap-14 lg:grid-cols-[1.3fr_1fr] lg:gap-24" data-reveal>
          <div>
            <p className="max-w-[46ch] text-lead text-bone-dim">{c.contact.lede}</p>
            <a
              href={`mailto:${profile.email}`}
              // the accent underline draws across on hover/focus, over the resting hairline
              className="mt-7 mb-8 inline-block border-b border-line-strong bg-[linear-gradient(var(--color-signal),var(--color-signal))] bg-[size:0%_1px] bg-[position:left_bottom] bg-no-repeat font-display text-[clamp(1.7rem,1rem+3.6vw,3.4rem)] leading-[1.1] break-words transition-[color,background-size] duration-[600ms] ease-out-expo hover:bg-[size:100%_1px] hover:text-signal focus-visible:bg-[size:100%_1px] focus-visible:text-signal"
            >
              {profile.email}
            </a>
            <div className="flex flex-wrap gap-3">
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
            <h3 className="mb-2 font-mono text-fine font-medium tracking-[0.08em] text-bone-faint uppercase">
              {c.contact.elsewhere}
            </h3>
            <ul className="border-t border-line-strong">
              {socials.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-baseline justify-between gap-4 border-b border-line py-[18px] font-display text-h3 transition-[color,padding] duration-300 ease-out-expo hover:pl-2.5 hover:text-signal"
                  >
                    <span>{s.label}</span>
                    <span className="font-mono text-fine text-bone-dim">{s.handle} ↗</span>
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

import { facts, profile } from '../../data/profile';
import { useLang } from '../../lib/i18n';
import SectionTitle from '../../components/common/SectionTitle';

const About = () => {
  const { c, t } = useLang();

  return (
    <section id="about" className="relative py-section" aria-labelledby="about-title">
      <div className="wrap">
        <SectionTitle id="about-title" index="04" label={c.about.label} title={c.about.title} />

        <div className="grid gap-12 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-20">
          <figure
            className="aspect-[4/5] w-[min(100%,420px)] overflow-hidden rounded-card border border-line-strong bg-ink-1 lg:sticky lg:top-[calc(var(--spacing-header)+32px)]"
            data-reveal
          >
            {/* The photo settles from a slight zoom as it enters (only when motion is welcome) */}
            <img
              src={profile.portrait}
              alt={c.about.portraitAlt}
              width="1705"
              height="2560"
              loading="lazy"
              className="size-full object-cover object-[55%_38%] transition-[scale,filter] duration-[1800ms] ease-out-expo motion-safe:unrevealed:scale-[1.14] motion-safe:unrevealed:brightness-[0.7]"
            />
          </figure>

          <div className="grid content-start gap-12">
            <div
              className="grid max-w-[62ch] gap-[1.1em] text-lead leading-[1.6] text-bone-dim [&>p:first-child]:text-bone"
              data-reveal
            >
              {c.about.body.map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>

            <ul className="grid border-t border-line-strong" data-reveal>
              {facts.map((f) => (
                <li
                  key={f.id}
                  className="grid gap-x-6 gap-y-0.5 border-b border-line py-3.5 sm:grid-cols-[140px_1fr] sm:items-baseline"
                >
                  <span className="font-mono text-[0.72rem] tracking-[0.08em] text-bone-faint uppercase">
                    {t(f.label)}
                  </span>
                  <span>{t(f.value)}</span>
                </li>
              ))}
            </ul>

            <div data-reveal>
              <h3 className="mb-2 font-display text-h3">{c.about.principlesTitle}</h3>
              <ol>
                {c.about.principles.map(([name, body], i) => (
                  <li key={name} className="grid grid-cols-[40px_1fr] gap-2 border-b border-line py-5">
                    <span className="pt-[0.2em] font-mono text-fine text-signal">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h4 className="mb-1 text-lead font-medium">{name}</h4>
                      <p className="max-w-[54ch] text-bone-dim">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;

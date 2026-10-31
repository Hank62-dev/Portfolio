import { facts, profile } from '../../data/profile';
import { useLang } from '../../lib/i18n';
import { gsap, MOTION, ScrollTrigger } from '../../motion/gsap';
import ScrubText from '../../motion/ScrubText';
import { useGsap } from '../../motion/useGsap';
import SectionTitle from '../../components/common/SectionTitle';

/** Text running round a circle, turning slowly: a seal for the portrait. Purely decorative. */
const Seal = ({ text }) => (
  <svg viewBox="0 0 120 120" className="size-full animate-orbit" aria-hidden="true" focusable="false">
    <defs>
      <path id="seal-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
    </defs>
    <text fontFamily="var(--font-mono)" fontSize="8.6" letterSpacing="2.6" fill="var(--color-bone-dim)">
      <textPath href="#seal-circle">{text}</textPath>
    </text>
  </svg>
);

const About = () => {
  const { c, t } = useLang();
  const [lead, ...rest] = c.about.body;
  const seal = `${profile.name.toUpperCase()} · ${t(facts[0].value).toUpperCase()} · `.repeat(2);

  const scope = useGsap(({ scope: ref, mm }) => {
    mm.add(MOTION, () => {
      const root = ref.current;
      const figure = root.querySelector('[data-portrait]');
      const img = figure.querySelector('img');

      // The photo is uncovered from the bottom while it settles from a zoom, then drifts as you scroll.
      gsap
        .timeline({ scrollTrigger: { trigger: figure, start: 'top 85%', once: true } })
        .from(figure, { clipPath: 'inset(100% 0 0 0)', duration: 1.6, ease: 'expo.out' })
        .from(img, { scale: 1.35, filter: 'brightness(0.55)', duration: 2, ease: 'expo.out' }, 0)
        .from('[data-seal]', { scale: 0.4, opacity: 0, rotate: -90, duration: 1.4, ease: 'expo.out' }, 0.5);
      gsap.fromTo(
        img,
        { yPercent: -6 },
        { yPercent: 6, ease: 'none', scrollTrigger: { trigger: figure, scrub: true, start: 'top bottom', end: 'bottom top' } }
      );

      // Rows draw their rule, then slide in one after another.
      ScrollTrigger.batch(root.querySelectorAll('[data-fact], [data-principle]'), {
        start: 'top 92%',
        once: true,
        onEnter: (batch) =>
          gsap.from(batch, { y: 36, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.09 }),
      });
    });
  }, [c]);

  return (
    <section id="about" ref={scope} className="relative py-section" aria-labelledby="about-title">
      <div className="wrap">
        <SectionTitle id="about-title" index="04" label={c.about.label} title={c.about.title} />

        <div className="grid gap-12 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-20">
          <div className="relative lg:sticky lg:top-[calc(var(--spacing-header)+32px)] lg:self-start">
            <figure
              data-portrait
              className="aspect-[4/5] w-[min(100%,420px)] overflow-hidden rounded-card border border-line-strong bg-ink-1"
            >
              <img
                src={profile.portrait}
                alt={c.about.portraitAlt}
                width="1705"
                height="2560"
                loading="lazy"
                className="size-full scale-[1.12] object-cover object-[55%_38%]"
              />
            </figure>
            <div data-seal className="absolute right-2 -bottom-8 size-[132px] rounded-full bg-ink-0/80 backdrop-blur-sm lg:-right-12">
              <Seal text={seal} />
            </div>
          </div>

          <div className="grid content-start gap-14">
            <div className="grid max-w-[34ch] gap-[1.1em] sm:max-w-[40ch]">
              {/* The opening passage is set large and lights up as you read it. */}
              <ScrubText as="p" className="font-display text-[clamp(1.8rem,1.2rem+2.2vw,3rem)] leading-[1.12] text-bone">
                {lead}
              </ScrubText>
            </div>
            <div className="grid max-w-[62ch] gap-[1.1em] text-lead leading-[1.6] text-bone-dim">
              {rest.map((p) => (
                <ScrubText as="p" key={p.slice(0, 24)}>
                  {p}
                </ScrubText>
              ))}
            </div>

            <ul className="grid border-t border-line-strong">
              {facts.map((f) => (
                <li
                  key={f.id}
                  data-fact
                  className="group grid gap-x-6 gap-y-0.5 border-b border-line py-4 transition-[padding,background-color] duration-500 ease-out-expo hover:bg-ink-1/70 hover:pl-3 sm:grid-cols-[140px_1fr] sm:items-baseline"
                >
                  <span className="font-mono text-[0.72rem] tracking-[0.08em] text-bone-faint uppercase">{t(f.label)}</span>
                  <span className="transition-colors duration-300 group-hover:text-signal">{t(f.value)}</span>
                </li>
              ))}
            </ul>

            <div>
              <h3 className="mb-4 font-display text-h3">{c.about.principlesTitle}</h3>
              <ol>
                {c.about.principles.map(([name, body], i) => (
                  <li
                    key={name}
                    data-principle
                    className="group grid grid-cols-[72px_1fr] gap-3 border-b border-line py-6 transition-colors duration-500 hover:bg-ink-1/70"
                  >
                    <span className="font-display text-[3rem] leading-none text-transparent transition-colors duration-500 [-webkit-text-stroke:1px_var(--color-bone-faint)] group-hover:text-signal group-hover:[-webkit-text-stroke-color:var(--color-signal)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="transition-transform duration-500 ease-out-expo group-hover:translate-x-2">
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

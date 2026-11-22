import { useMemo, useState } from 'react';
import { LAYERS, deriveStack, getProject, projects } from '../../data/projects';
import { useLang } from '../../i18n';
import { clsx } from '../../../shared/lib/format';
import { gsap, DESKTOP, MOTION, ScrollTrigger } from '../../motion/gsap';
import { useGsap } from '../../motion/useGsap';
import SectionTitle from '../../components/SectionTitle';
import PeriodicTable from './PeriodicTable';
import { stackStore } from './stackStore';

const ALL = 'all';

const Stack = () => {
  const { c } = useLang();
  const [selected, setSelected] = useState(ALL);

  const stack = useMemo(deriveStack, []);
  // Every project with a write-up can be inspected; one-line archive rows only feed the totals.
  const pickable = useMemo(() => projects.filter((p) => p.tier !== 'archive' || p.decisions.length > 0), []);
  const project = selected === ALL ? null : getProject(selected);

  // The picture follows the reading: the layer in view is the band that is lit.
  const scope = useGsap(({ scope: ref, mm }) => {
    mm.add(DESKTOP, () => {
      const root = ref.current;
      const panels = [...root.querySelectorAll('[data-layer-panel]')];
      panels.forEach((panel, i) => {
        ScrollTrigger.create({
          trigger: panel,
          start: 'top 58%',
          end: 'bottom 58%',
          onToggle: (self) => self.isActive && stackStore.set(i),
        });
      });
      ScrollTrigger.create({
        trigger: root.querySelector('[data-layers]'),
        start: 'top 55%',
        end: 'bottom 65%',
        onUpdate: (self) => {
          stackStore.progress = self.progress;
        },
        onRefresh: (self) => {
          stackStore.progress = self.progress;
        },
      });
    });
    // phones: the picture is in the flow above the lists and turns as it crosses the screen
    mm.add('(max-width: 1023px)', () => {
      const root = ref.current;
      ScrollTrigger.create({
        trigger: root.querySelector('[data-orbit]'),
        start: 'top 80%',
        end: 'bottom 20%',
        onUpdate: (self) => {
          stackStore.progress = self.progress;
          stackStore.set(Math.min(3, Math.floor(self.progress * 4)));
        },
      });
    });
    mm.add(MOTION, () => {
      gsap.from('[data-orbit]', {
        opacity: 0,
        scale: 0.85,
        duration: 1.6,
        ease: 'expo.out',
        scrollTrigger: { trigger: '[data-orbit]', start: 'top 85%', once: true },
      });
    });
  }, [c]);

  return (
    <section id="stack" ref={scope} className="relative py-section" aria-labelledby="stack-title">
      <div className="wrap">
        <SectionTitle id="stack-title" index="02" label={c.stack.label} title={c.stack.title} lede={c.stack.lede} />

        <div className="flex flex-wrap gap-2" role="group" aria-label={c.stack.all} data-reveal>
          {[{ slug: ALL, name: c.stack.all }, ...pickable].map((p) => (
            <button
              key={p.slug}
              type="button"
              className={clsx(
                'min-h-[38px] rounded-full border px-3.5 font-mono text-fine transition-colors duration-200',
                selected === p.slug
                  ? 'border-bone bg-bone text-ink-0'
                  : 'border-line-strong text-bone-dim hover:border-bone hover:text-bone'
              )}
              aria-pressed={selected === p.slug}
              onClick={() => setSelected(p.slug)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <p className="mt-5 mb-12 font-mono text-fine text-bone-dim" role="status" aria-live="polite">
          {project ? c.stack.showing(project.name) : c.stack.showingAll}
        </p>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
          <div className="relative" aria-hidden="true">
            <div
              data-orbit
              className="relative h-[min(520px,130vw)] lg:sticky lg:top-[var(--spacing-header)] lg:h-[calc(100svh-var(--spacing-header))]"
            >
              <PeriodicTable stack={stack} words={c.stack} selected={project?.slug ?? null} />
              <p className="pointer-events-none absolute bottom-4 left-0 font-mono text-[0.68rem] tracking-[0.1em] text-bone-faint uppercase max-lg:hidden">
                {c.stack.orbitHint}
              </p>
            </div>
          </div>

          <div data-layers className="grid">
            {LAYERS.map((layer, i) => {
              const entries = project
                ? (project.layers[layer] ?? []).map((tech) => ({
                    tech,
                    slugs: stack[layer].find((e) => e.tech === tech)?.slugs ?? [project.slug],
                  }))
                : stack[layer];

              return (
                <section
                  key={layer}
                  data-layer-panel
                  className="flex flex-col justify-center border-t border-line-strong py-10 lg:min-h-[78svh] lg:py-16"
                  aria-labelledby={`layer-${layer}`}
                  data-reveal
                >
                  <header className="mb-8">
                    <span className="font-mono text-fine text-signal">{String(i + 1).padStart(2, '0')}</span>
                    <h3
                      id={`layer-${layer}`}
                      className="mt-2 font-display text-[clamp(2.6rem,1.6rem+4vw,5.5rem)] leading-[0.95]"
                    >
                      {c.stack.layers[layer]}
                    </h3>
                    <p className="mt-3 max-w-[40ch] text-lead text-bone-dim">{c.stack.layerHint[layer]}</p>
                  </header>

                  {entries.length === 0 ? (
                    <p className="text-fine text-bone-faint">{c.stack.none}</p>
                  ) : (
                    <ul className="grid gap-0.5 sm:grid-cols-2 sm:gap-x-8">
                      {entries.map(({ tech, slugs }, n) => (
                        // keyed by selection too, so the entrance replays when you switch project
                        <li
                          key={`${selected}-${tech}`}
                          onPointerEnter={() => stackStore.setFocus(tech)}
                          onPointerLeave={() => stackStore.setFocus(null)}
                          className="flex items-center justify-between gap-3 border-b border-line py-[10px] transition-[transform,color] duration-300 ease-out-expo hover:translate-x-1.5 hover:text-signal in:animate-tech-in in:[animation-delay:calc(var(--i,0)*35ms)]"
                          style={{ '--i': n + i * 2 }}
                        >
                          <span className="text-body">{tech}</span>
                          {!project && (
                            <span
                              className="inline-flex items-center gap-[3px]"
                              title={c.stack.used(slugs.length)}
                              aria-label={c.stack.used(slugs.length)}
                            >
                              {Array.from({ length: Math.min(slugs.length, 6) }, (_, k) => (
                                <i
                                  key={k}
                                  className="size-1.5 rounded-[1px] bg-signal in:animate-dot-in in:[animation-delay:calc(var(--i,0)*35ms+var(--k,0)*50ms+250ms)]"
                                  style={{ '--k': k }}
                                />
                              ))}
                              <span className="ml-1.5 min-w-[1ch] text-right font-mono text-[0.72rem] text-bone-dim">
                                {slugs.length}
                              </span>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Stack;

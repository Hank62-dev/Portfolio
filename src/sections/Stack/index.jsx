import { useMemo, useState } from 'react';
import { LAYERS, deriveStack, getProject, projects } from '../../data/projects';
import { useLang } from '../../lib/i18n';
import { clsx } from '../../lib/format';
import SectionTitle from '../../components/common/SectionTitle';

const ALL = 'all';

const Stack = () => {
  const { c } = useLang();
  const [selected, setSelected] = useState(ALL);

  const stack = useMemo(deriveStack, []);
  // Every project with a write-up can be inspected; one-line archive rows only feed the totals.
  const pickable = useMemo(() => projects.filter((p) => p.tier !== 'archive' || p.decisions.length > 0), []);
  const project = selected === ALL ? null : getProject(selected);

  return (
    <section id="stack" className="relative py-section" aria-labelledby="stack-title">
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

        <p className="mt-5 mb-9 font-mono text-fine text-bone-dim" role="status" aria-live="polite">
          {project ? c.stack.showing(project.name) : c.stack.showingAll}
        </p>

        {/* 1px gaps over a tinted background draw the dividers, so no per-cell border logic is needed */}
        <div
          className="grid gap-px overflow-hidden rounded-card border border-line-strong bg-line-strong md:grid-cols-2 xl:grid-cols-4"
          data-reveal
        >
          {LAYERS.map((layer, i) => {
            const entries = project
              ? (project.layers[layer] ?? []).map((tech) => ({
                  tech,
                  slugs: stack[layer].find((e) => e.tech === tech)?.slugs ?? [project.slug],
                }))
              : stack[layer];

            return (
              <section key={layer} className="bg-ink-1 p-6" aria-labelledby={`layer-${layer}`}>
                <header className="mb-5 grid grid-cols-[auto_1fr] items-baseline gap-x-3 border-b border-line pb-4">
                  <span className="font-mono text-[0.72rem] text-signal">{String(i + 1).padStart(2, '0')}</span>
                  <h3 id={`layer-${layer}`} className="font-display text-h3">
                    {c.stack.layers[layer]}
                  </h3>
                  <p className="col-start-2 text-fine text-bone-faint">{c.stack.layerHint[layer]}</p>
                </header>

                {entries.length === 0 ? (
                  <p className="text-fine text-bone-faint">{c.stack.none}</p>
                ) : (
                  <ul className="grid gap-0.5">
                    {entries.map(({ tech, slugs }, n) => (
                      // keyed by selection too, so the entrance replays when you switch project
                      <li
                        key={`${selected}-${tech}`}
                        className="flex items-center justify-between gap-3 py-[7px] transition-transform duration-200 ease-out-expo hover:translate-x-1 in:animate-tech-in in:[animation-delay:calc(var(--i,0)*35ms)]"
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
    </section>
  );
};

export default Stack;

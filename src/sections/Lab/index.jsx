import { Link } from 'react-router-dom';
import { byTier, projectHref } from '../../data/projects';
import { useLang } from '../../lib/i18n';
import { clsx } from '../../lib/format';
import SectionTitle from '../../components/common/SectionTitle';
import Badge from '../../design-system/Badge';

const Lab = () => {
  const { c, t } = useLang();
  const items = byTier('lab');

  return (
    <section id="lab" className="relative py-section" aria-labelledby="lab-title">
      <div className="wrap">
        <SectionTitle id="lab-title" index="03" label={c.lab.label} title={c.lab.title} lede={c.lab.lede} />

        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p, i) => {
            const lead = i === 0;
            return (
              <li
                key={p.slug}
                className={clsx(
                  'flex flex-col overflow-hidden rounded-card border border-line-strong bg-ink-1 transition-colors duration-200 hover:border-bone-faint',
                  lead && 'md:col-span-full md:grid md:grid-cols-[1.2fr_1fr]'
                )}
                data-reveal
                style={{ '--reveal-delay': `${(i % 3) * 0.07}s` }}
              >
                {lead && p.cover && (
                  <div className="aspect-[16/7] border-b border-line bg-black md:aspect-auto md:border-r md:border-b-0">
                    <img
                      src={p.cover}
                      alt=""
                      loading="lazy"
                      width="1846"
                      height="910"
                      className="size-full object-cover"
                    />
                  </div>
                )}
                <div className={clsx('flex flex-1 flex-col gap-3 p-6', lead && 'md:justify-center md:p-9')}>
                  <p className="font-mono text-[0.72rem] tracking-[0.08em] text-signal uppercase">{t(p.kind)}</p>
                  <h3 className="font-display text-h3">{p.name}</h3>
                  <p className="text-bone-dim">{t(p.tagline)}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {[...p.layers.interface, ...p.layers.service].slice(0, 4).map((tech) => (
                      <Badge key={tech}>{tech}</Badge>
                    ))}
                  </div>
                  <Link
                    to={projectHref(p)}
                    className="mt-auto self-start pt-3 font-mono text-fine text-bone transition-colors hover:text-signal"
                  >
                    {c.lab.open} <span aria-hidden="true">→</span>
                    <span className="sr-only"> — {p.name}</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default Lab;

import { clsx } from '../../../lib/format';
import { useSlider } from './useSlider';

/** The heading every tab opens with: a small label, a serif title with an italic accent word, and room for actions. */
export function PageHead({ eyebrow, title, accent, description, children, keepOnPhone = false }) {
  return (
    <header className={clsx('flex flex-wrap items-end justify-between gap-3 md:gap-4 max-md:justify-start', (!children || !keepOnPhone) && 'max-md:hidden')}>
      {/* on a phone the title bar above already names the screen, so only the actions stay */}
      <div className="max-md:hidden">
        <span className="font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint uppercase">{eyebrow}</span>
        <h1 className="mt-2 font-display text-h2 leading-[1.05] text-bone max-md:mt-1 max-md:text-[2rem]">
          {title} <em className="serif-accent">{accent}</em>
        </h1>
        {description && <p className="mt-2 max-w-[60ch] text-bone-dim max-md:line-clamp-2 max-md:text-fine">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** A row of pill buttons where one is chosen (a tab strip, or a filter); the chosen marker glides between them. */
export function Segmented({ value, onChange, options, label, large = false, round = false }) {
  const { ref, marker } = useSlider(value, 'rounded-full bg-bone');
  return (
    <div ref={ref} className={clsx('relative flex max-w-full gap-1 border border-line bg-ink-1 p-1', round ? 'rounded-full' : 'rounded-[1.5rem]', options.length > 3 && 'flex-wrap')} role="tablist" aria-label={label}>
      {marker}
      {options.map(({ id, label: text, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={clsx('relative z-10 inline-flex items-center gap-1.5 rounded-full font-mono transition-colors duration-300', large ? 'px-4 py-1.5 text-fine' : 'px-3.5 py-1 text-[0.78rem]', value === id ? 'text-ink-0' : 'text-bone-dim hover:text-bone')}
        >
          {Icon && <Icon size={large ? 14 : 13} aria-hidden="true" />} {text}
        </button>
      ))}
    </div>
  );
}

/** A rounded surface for a group of things, optionally with a title row. */
export function Tile({ title, aside, className, children, ...rest }) {
  return (
    <section className={clsx('min-w-0 rounded-[1.75rem] border border-line bg-ink-1 p-5 shadow-[0_30px_70px_-50px_rgb(var(--shadow-rgb)/0.95)]', className)} {...rest}>
      {(title || aside) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/** A big number with a label under it. */
export function Figure({ value, label, tone }) {
  return (
    <div className="min-w-0 rounded-3xl border border-line bg-gradient-to-b from-wash/[0.04] to-transparent bg-ink-1 p-3.5 md:p-4">
      <b className={clsx('block font-display text-h3 leading-none tabular-nums', tone ?? 'text-bone')}>{value}</b>
      {/* short labels, and on a phone plain sentence case: three columns are narrow, and a spaced-out capital label wraps */}
      <small className="mt-2 block text-[0.74rem] leading-tight text-balance text-bone-faint md:mt-1.5 md:font-mono md:text-[0.68rem] md:tracking-[0.12em] md:uppercase">{label}</small>
    </div>
  );
}

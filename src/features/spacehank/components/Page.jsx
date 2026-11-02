import { clsx } from '../../../lib/format';

/** The heading every tab opens with: a small label, a serif title with an italic accent word, and room for actions. */
export function PageHead({ eyebrow, title, accent, description, children }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint uppercase">{eyebrow}</span>
        <h1 className="mt-2 font-display text-h2 leading-[1.05] text-bone">
          {title} <em className="serif-accent">{accent}</em>
        </h1>
        {description && <p className="mt-2 max-w-[60ch] text-bone-dim">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** A row of pill buttons where one is chosen (a tab strip, or a filter). */
export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="flex gap-1 rounded-full border border-line bg-ink-1 p-1" role="tablist" aria-label={label}>
      {options.map(({ id, label: text, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={clsx('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 font-mono text-[0.78rem] transition-colors', value === id ? 'bg-bone text-ink-0' : 'text-bone-dim hover:text-bone')}
        >
          {Icon && <Icon size={13} aria-hidden="true" />} {text}
        </button>
      ))}
    </div>
  );
}

/** A rounded surface for a group of things, optionally with a title row. */
export function Tile({ title, aside, className, children, ...rest }) {
  return (
    <section className={clsx('min-w-0 rounded-[1.75rem] border border-line bg-ink-1 p-5 shadow-[0_30px_70px_-50px_rgb(0_0_0/0.95)]', className)} {...rest}>
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
    <div className="rounded-3xl border border-line bg-gradient-to-b from-white/[0.04] to-transparent bg-ink-1 p-4">
      <b className={clsx('block font-display text-h3 leading-none tabular-nums', tone ?? 'text-bone')}>{value}</b>
      <small className="mt-1.5 block font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{label}</small>
    </div>
  );
}

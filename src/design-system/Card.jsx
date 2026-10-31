import { clsx } from '../lib/format';

/** Small uppercase-mono label that sits above a heading. */
export const Eyebrow = ({ children, className }) => (
  <span className={clsx('font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint uppercase', className)}>
    {children}
  </span>
);

export const Card = ({ as: Component = 'section', className, children, ...rest }) => (
  <Component className={clsx('min-w-0 rounded-card border border-line bg-ink-1 p-5', className)} {...rest}>
    {children}
  </Component>
);

/** Eyebrow + title on the left, an optional control or icon on the right. */
export const CardHeader = ({ eyebrow, title, aside, className }) => (
  <div className={clsx('mb-4 flex items-start justify-between gap-3', className)}>
    <div>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      {title && <h3 className="mt-1 font-body text-lead font-medium text-bone">{title}</h3>}
    </div>
    {aside && <div className="text-bone-faint">{aside}</div>}
  </div>
);

/** A single headline number with its label. */
export const Stat = ({ icon: Icon, label, value, note }) => (
  <Card as="article" className="flex flex-col gap-1">
    <div className="flex items-center gap-2 text-bone-faint">
      {Icon && <Icon size={15} aria-hidden="true" />}
      <Eyebrow>{label}</Eyebrow>
    </div>
    <strong className="font-body text-h3 leading-none font-medium text-bone tabular-nums">{value}</strong>
    {note && <small className="font-mono text-fine text-bone-faint">{note}</small>}
  </Card>
);

/** Page header for app screens: eyebrow, serif title, description and actions. */
export const PageHeader = ({ eyebrow, title, description, actions }) => (
  <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-2 font-display text-h2 leading-[1.05] text-bone [&_em]:serif-accent">{title}</h1>
      {description && <p className="mt-2 max-w-[60ch] text-bone-dim">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

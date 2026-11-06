import { Check, Copy } from 'lucide-react';
import { useId, useState } from 'react';
import { Button, pushToast } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { tr } from '../lang';

/** Copies a text and says so. Falls back quietly when the browser will not allow it. */
export const copyText = async (text, what = 'Copied') => {
  try {
    await navigator.clipboard.writeText(text);
    pushToast(what, { tone: 'success' });
    return true;
  } catch {
    pushToast(tr('This browser would not let the page copy. Select the text and copy it by hand.'), { tone: 'error' });
    return false;
  }
};

export function CopyButton({ text, label = 'Copy', what, size = 'sm', className }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={className}
      onClick={async () => {
        if (await copyText(text, what ?? tr('{0} copied', label))) {
          setDone(true);
          window.setTimeout(() => setDone(false), 1600);
        }
      }}
    >
      {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {done ? tr('Copied') : label}
    </Button>
  );
}

/** A small caption above a block. */
export const Label = ({ children, className }) => <p className={clsx('font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint uppercase', className)}>{children}</p>;

/** A round badge with an icon, tinted by a hue (0 to 360). With no hue it is neutral. */
export const IconBubble = ({ icon: Icon, hue, size = 'md', className }) => (
  <span
    className={clsx('grid shrink-0 place-items-center rounded-full', size === 'sm' ? 'size-7' : size === 'lg' ? 'size-12' : 'size-9', hue === undefined && 'bg-wash/7 text-bone-dim', className)}
    style={hue === undefined ? undefined : { background: `hsl(${hue} 70% 55% / 0.16)`, color: `hsl(${hue} 75% 72%)`, boxShadow: `inset 0 0 0 1px hsl(${hue} 70% 60% / 0.22)` }}
    aria-hidden="true"
  >
    <Icon size={size === 'sm' ? 13 : size === 'lg' ? 21 : 16} strokeWidth={1.7} />
  </span>
);

/** A lit glass surface for one block of the Creator Lab. */
export const Panel = ({ title, icon, hue, aside, children, className, ...rest }) => (
  <section className={clsx('cl-surface min-w-0 rounded-[1.75rem] border border-line p-4 md:p-6', className)} {...rest}>
    {(title || aside) && (
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon && <IconBubble icon={icon} hue={hue} />}
          {title && <h3 className="font-display text-lead leading-tight text-bone">{title}</h3>}
        </div>
        {aside}
      </div>
    )}
    {children}
  </section>
);

/** One statistic. */
export const Stat = ({ value, label, tone = 'text-bone', icon: Icon }) => (
  <div className="cl-card min-w-0 rounded-2xl border border-line px-3.5 py-3.5">
    <b className={clsx('block truncate font-display text-[1.55rem] leading-none tabular-nums', tone)}>{value}</b>
    <small className="mt-2 flex items-center gap-1.5 truncate font-mono text-[0.68rem] tracking-[0.06em] text-bone-faint">
      {Icon && <Icon size={11} aria-hidden="true" />} {label}
    </small>
  </div>
);

/** A chip that can be toggled. */
export const Chip = ({ on, children, onClick, ...rest }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={on}
    onClick={onClick}
    className={clsx('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[0.8rem] transition-all duration-300 active:scale-95', on ? 'border-transparent bg-bone text-ink-0 shadow-[0_8px_20px_-10px_var(--color-bone)]' : 'border-line text-bone-dim hover:border-line-strong hover:text-bone')}
    {...rest}
  >
    {children}
  </button>
);

/** A field's label, for forms that use plain controls. */
export const Row = ({ label, children }) => (
  <label className="flex flex-col gap-1.5">
    <Label>{label}</Label>
    {children}
  </label>
);

// each platform and each stage has a colour of its own, so a board reads at a glance
export const PLATFORM_HUE = { tiktok: 345, shorts: 4, reels: 305, discord: 235, x: 205, blog: 168 };
export const STAGE_HUE = { idea: 46, script: 208, filmed: 268, edited: 322, posted: 150, lead: 208, contacted: 46, negotiating: 22, won: 150, lost: 4 };

/** A platform's name with a dot of its colour. */
export const PlatformTag = ({ id, label }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-wash/[0.06] px-2 py-0.5 font-mono text-[0.62rem] text-bone-dim">
    <i className="size-1.5 rounded-full" style={{ background: `hsl(${PLATFORM_HUE[id] ?? 220} 75% 62%)` }} aria-hidden="true" />
    {label}
  </span>
);

/** A friendly empty state: an icon, a line, and room for a hint. */
export const EmptyNote = ({ icon: Icon, title, children }) => (
  <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-8 text-center">
    <IconBubble icon={Icon} size="lg" />
    <b className="font-display text-[1.15rem] font-normal text-bone">{title}</b>
    {children && <p className="max-w-[34ch] text-[0.82rem] leading-snug text-bone-faint">{children}</p>}
  </div>
);

/** A ring that fills to a percentage, with room in the middle. */
export function Ring({ pct = 0, size = 132, stroke = 9, done = false, children }) {
  const id = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: done ? '#7fd6a2' : 'hsl(var(--app-hue) 95% 62%)' }} />
            <stop offset="100%" style={{ stopColor: done ? '#b6f0cf' : 'hsl(calc(var(--app-hue) + 34) 95% 72%)' }} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, Math.max(0, pct)) / 100)}
          style={{ transition: 'stroke-dashoffset 1.2s var(--ease-out-expo)', filter: 'drop-shadow(0 0 8px hsl(var(--app-hue) 95% 60% / 0.45))' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** A small line chart of a few numbers, drawn in as the card appears. */
export function Spark({ values, className }) {
  const id = useId();
  const top = Math.max(1, ...values);
  const w = 100;
  const h = 32;
  const points = values.map((v, i) => [values.length < 2 ? w / 2 : (i / (values.length - 1)) * w, h - 3 - (v / top) * (h - 8)]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={clsx('overflow-visible', className)} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--app-hue) 95% 62%)', stopOpacity: 0.38 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--app-hue) 95% 62%)', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${id})`} />
      <path d={line} pathLength="1" fill="none" style={{ stroke: 'hsl(calc(var(--app-hue) + 14) 95% 68%)' }} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="cl-draw" />
    </svg>
  );
}

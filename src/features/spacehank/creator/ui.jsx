import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button, pushToast } from '../../../design-system';
import { clsx } from '../../../lib/format';

/** Copies a text and says so. Falls back quietly when the browser will not allow it. */
export const copyText = async (text, what = 'Copied') => {
  try {
    await navigator.clipboard.writeText(text);
    pushToast(what, { tone: 'success' });
    return true;
  } catch {
    pushToast('This browser would not let the page copy. Select the text and copy it by hand.', { tone: 'error' });
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
        if (await copyText(text, what ?? `${label} copied`)) {
          setDone(true);
          window.setTimeout(() => setDone(false), 1600);
        }
      }}
    >
      {done ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />} {done ? 'Copied' : label}
    </Button>
  );
}

/** A small caption above a block. */
export const Label = ({ children, className }) => <p className={clsx('font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase', className)}>{children}</p>;

/** A rounded surface for one block of the Creator Lab. */
export const Panel = ({ title, aside, children, className, ...rest }) => (
  <section className={clsx('min-w-0 rounded-[1.75rem] border border-line bg-ink-1 p-4 md:p-5', className)} {...rest}>
    {(title || aside) && (
      <div className="mb-3 flex items-center justify-between gap-3">
        {title && <h3 className="font-display text-lead leading-tight text-bone">{title}</h3>}
        {aside}
      </div>
    )}
    {children}
  </section>
);

/** One statistic. */
export const Stat = ({ value, label, tone = 'text-bone' }) => (
  <div className="min-w-0 rounded-2xl border border-line bg-ink-1 px-3 py-3">
    <b className={clsx('block truncate font-display text-[1.45rem] leading-none tabular-nums', tone)}>{value}</b>
    <small className="mt-1.5 block truncate text-[0.74rem] text-bone-faint">{label}</small>
  </div>
);

/** A chip that can be toggled. */
export const Chip = ({ on, children, onClick, ...rest }) => (
  <button type="button" role="checkbox" aria-checked={on} onClick={onClick} className={clsx('inline-flex items-center rounded-full border px-3 py-1.5 text-[0.8rem] transition-colors active:scale-95', on ? 'border-bone bg-bone text-ink-0' : 'border-line text-bone-dim hover:border-line-strong hover:text-bone')} {...rest}>
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

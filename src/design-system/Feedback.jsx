import { AlertTriangle } from 'lucide-react';
import { clsx } from '../lib/format';

/** Indeterminate loading indicator. The accessible name comes from `label`. */
export const Spinner = ({ size = 18, label }) => (
  <span role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} className="inline-flex">
    <span
      className="animate-spin rounded-full border-2 border-line-strong border-t-signal"
      style={{ width: size, height: size }}
    />
  </span>
);

/** Placeholder block shown while content of a known shape loads. */
export const Skeleton = ({ className }) => (
  <div aria-hidden="true" className={clsx('animate-pulse rounded-sm bg-ink-3', className)} />
);

/** A small coloured dot for live/offline state. Pair it with a text label. */
export const StatusDot = ({ tone = 'ok', pulse = false }) => {
  const color = { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger', idle: 'bg-bone-faint' }[tone];
  return (
    <i
      aria-hidden="true"
      className={clsx('inline-block size-2 rounded-full', color, pulse && 'animate-pulse-ring')}
    />
  );
};

/** Nothing to show yet. Say why and, when possible, what to do next. */
export const EmptyState = ({ icon: Icon, title, description, action, className }) => (
  <div className={clsx('flex flex-col items-center gap-2 px-4 py-10 text-center', className)}>
    {Icon && <Icon size={24} className="text-bone-faint" aria-hidden="true" />}
    {title && <p className="text-bone">{title}</p>}
    {description && <p className="max-w-[44ch] text-fine text-bone-dim">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

/** Something failed. Always say what happened, and offer a retry when one makes sense. */
export const ErrorState = ({ title = 'Something went wrong', message, action, className }) => (
  <div
    role="alert"
    className={clsx('flex items-start gap-3 rounded-sm border border-danger/40 bg-danger/5 px-4 py-3', className)}
  >
    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <p className="text-fine font-medium text-danger">{title}</p>
      {message && <p className="mt-0.5 text-fine break-words text-bone-dim">{message}</p>}
    </div>
    {action}
  </div>
);

/** A transient confirmation. Rendered as a polite live region. */
export const Toast = ({ message }) => {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-sm border border-line-strong bg-ink-2 px-4 py-2.5 font-mono text-fine text-bone shadow-pop"
    >
      {message}
    </div>
  );
};

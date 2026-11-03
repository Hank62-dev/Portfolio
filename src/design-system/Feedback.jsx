import { AlertTriangle } from 'lucide-react';
import { clsx } from '../lib/format';

/** Placeholder block shown while content of a known shape loads, with a soft band of light sweeping across it. Pass a `rounded-*` class to change the corners. */
export const Skeleton = ({ className }) => (
  <div aria-hidden="true" className={clsx('skeleton bg-ink-3', !/(^|\s)rounded/.test(className ?? '') && 'rounded-sm', className)} />
);

/** Placeholder for a few lines of text; the last one is shorter, like the end of a paragraph. */
export const SkeletonLines = ({ lines = 3, className }) => (
  <div aria-hidden="true" className={clsx('flex flex-col gap-2', className)}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton key={i} className={clsx('h-3.5', i === lines - 1 && lines > 1 ? 'w-3/5' : 'w-full')} />
    ))}
  </div>
);

/** Names a region that is loading for screen readers; put the skeleton inside it. Nothing is announced out loud. */
export const Loading = ({ label = 'Loading', className, children }) => (
  <div role="status" aria-busy="true" aria-label={label} className={className}>
    {children}
  </div>
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

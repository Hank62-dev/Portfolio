import { clsx } from '../lib/format';

const TONES = {
  default: 'border-line-strong text-bone-dim',
  signal: 'border-signal text-signal',
  ok: 'border-ok/60 text-ok',
  warn: 'border-warn/60 text-warn',
  danger: 'border-danger/60 text-danger',
};

const DOTS = { default: 'bg-bone-faint', signal: 'bg-signal', ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger' };

/** A small pill for a label or a status. `dot` adds a leading state dot. */
const Badge = ({ children, tone = 'default', dot = false, className }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1.5 rounded-full border px-[9px] py-[3px] font-mono text-[0.72rem] leading-normal whitespace-nowrap',
      TONES[tone],
      className
    )}
  >
    {dot && <i className={clsx('size-1.5 rounded-full', DOTS[tone])} aria-hidden="true" />}
    {children}
  </span>
);

export default Badge;

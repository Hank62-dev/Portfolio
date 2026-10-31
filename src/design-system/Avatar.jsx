import { clsx } from '../lib/format';

/** Initials in a circle. `color` tints it, e.g. with an agent's own colour. */
const Avatar = ({ children, color, size = 32, className }) => (
  <span
    aria-hidden="true"
    className={clsx(
      'inline-grid shrink-0 place-items-center rounded-full border border-line-strong bg-ink-3 font-mono text-[0.72rem] font-medium text-bone',
      className
    )}
    style={{ width: size, height: size, ...(color ? { color, borderColor: color } : null) }}
  >
    {children}
  </span>
);

export default Avatar;

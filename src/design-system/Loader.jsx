import { clsx } from '../lib/format';

// Loading indicators. A skeleton stands in for content that has a known shape; these are for the moment something is working
// (a button that was pressed, an answer being written, a file being read). They take their colour from the text colour around them.

/** Three dots that rise and fall in a wave. Small enough for a button. `size` is the dot's diameter in px. */
export const Dots = ({ size = 6, className }) => (
  <span role="status" aria-label="Loading" className={clsx('inline-flex items-center gap-[0.3em]', className)} style={{ fontSize: size }}>
    {[0, 1, 2].map((i) => (
      <i key={i} aria-hidden="true" className="loader-dot block rounded-full bg-current" style={{ width: '1em', height: '1em', animationDelay: `${i * 0.14}s` }} />
    ))}
  </span>
);

/** A ring with a soft, fading tail that turns. `size` in px. */
export const Ring = ({ size = 20, thickness, className }) => (
  <span
    role="status"
    aria-label="Loading"
    className={clsx('loader-ring inline-block shrink-0 rounded-full', className)}
    style={{ width: size, height: size, '--ring': `${thickness ?? Math.max(2, Math.round(size / 9))}px` }}
  />
);

/** Text with a band of light that slides across it: for a line such as "Hank is thinking". */
export const TextShimmer = ({ children, className }) => <span className={clsx('text-shine', className)}>{children}</span>;

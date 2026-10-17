import { Link } from 'react-router-dom';
import { clsx } from '../../../lib/format';
import { useMagnetic } from '../../../hooks/useMotion';

const BASE =
  'group inline-flex items-center gap-2.5 font-mono text-fine font-medium tracking-[0.02em] whitespace-nowrap transition-[background-color,color,border-color,transform] duration-300 ease-out-expo';

// Padding and height differ per variant, so they live here rather than in BASE (no conflicting utilities).
const VARIANTS = {
  primary: 'min-h-[46px] px-5 rounded-sm bg-bone text-ink-0 hover:bg-signal',
  ghost: 'min-h-[46px] px-5 rounded-sm border border-line-strong text-bone hover:border-bone',
  link: 'text-bone border-b border-line-strong hover:text-signal hover:border-signal',
};

/**
 * One component for every call to action.
 *   to    → internal route (react-router)
 *   href  → external link (opens in a new tab) or mailto:
 *   none  → <button>
 */
const Button = ({ variant = 'primary', to, href, children, className, icon, ...rest }) => {
  const cls = clsx(BASE, VARIANTS[variant], className);
  const magnet = useMagnetic(variant !== 'link');
  const content = (
    <>
      <span>{children}</span>
      {icon && (
        <span
          className="inline-block transition-transform duration-500 ease-out-expo group-hover:translate-x-1"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link ref={magnet} to={to} className={cls} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    const external = /^https?:/.test(href);
    return (
      <a
        ref={magnet}
        href={href}
        className={cls}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...rest}
      >
        {content}
      </a>
    );
  }
  return (
    <button ref={magnet} type="button" className={cls} {...rest}>
      {content}
    </button>
  );
};

export default Button;

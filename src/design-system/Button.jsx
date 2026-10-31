import { Link } from 'react-router-dom';
import { clsx } from '../lib/format';
import { useMagnetic } from '../hooks/useMotion';
import { Spinner } from './Feedback';

const BASE =
  'group inline-flex items-center justify-center gap-2.5 font-mono text-fine font-medium tracking-[0.02em] whitespace-nowrap transition-[background-color,color,border-color,transform] duration-300 ease-out-expo disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  primary: 'rounded-sm bg-bone text-ink-0 hover:bg-signal disabled:hover:bg-bone',
  secondary: 'rounded-sm border border-line bg-ink-3 text-bone hover:border-line-strong',
  ghost: 'rounded-sm border border-line-strong text-bone hover:border-bone',
  danger: 'rounded-sm border border-danger/50 text-danger hover:bg-danger/10',
  // A text link with an underline: has no box, so no size.
  link: 'border-b border-line-strong text-bone hover:border-signal hover:text-signal',
};

const SIZES = {
  md: 'min-h-[46px] px-5',
  sm: 'min-h-9 px-3.5',
  icon: 'size-9 shrink-0 p-0',
};

/**
 * One component for every call to action.
 *   to       internal route (react-router)
 *   href     external link (opens in a new tab) or mailto:
 *   none     <button>
 *   variant  primary | secondary | ghost | danger | link
 *   size     md | sm | icon (icon-only buttons need an aria-label)
 *   icon     trailing arrow-style icon that nudges on hover
 *   loading  shows a spinner and disables the button
 */
const Button = ({ variant = 'primary', size = 'md', to, href, children, className, icon, loading = false, ...rest }) => {
  const cls = clsx(BASE, VARIANTS[variant], variant !== 'link' && SIZES[size], className);
  // The pointer-follow effect belongs to full-size calls to action only.
  const magnet = useMagnetic(variant !== 'link' && size === 'md');
  const content = (
    <>
      <span className="inline-flex items-center gap-2">
        {loading && <Spinner size={14} />}
        {children}
      </span>
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
    <button
      ref={magnet}
      type="button"
      className={cls}
      {...rest}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
};

export default Button;

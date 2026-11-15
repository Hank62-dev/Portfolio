import { forwardRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from '../lib/format';
import { useMagnetic } from '../hooks/useMotion';
import { Dots } from './Loader';
import { useSoft } from './soft';

const BASE =
  'group inline-flex items-center justify-center gap-2.5 font-mono text-fine font-medium tracking-[0.02em] whitespace-nowrap transition-[background-color,color,border-color,transform,scale] duration-300 ease-out-expo active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  primary: 'rounded-sm bg-bone text-ink-0 hover:bg-signal disabled:hover:bg-bone',
  secondary: 'rounded-sm border border-line bg-ink-3 text-bone hover:border-line-strong',
  ghost: 'rounded-sm border border-line-strong text-bone hover:border-bone',
  danger: 'rounded-sm border border-danger/50 text-danger hover:bg-danger/10',
  // A text link with an underline: has no box, so no size.
  link: 'border-b border-line-strong text-bone hover:border-signal hover:text-signal',
};

// `fill`: instead of changing colour, the hover colour floods in from the side the pointer came in by
// and drains out the side it leaves by.
const FILL_LOOK = {
  primary: 'rounded-sm bg-bone text-ink-0',
  ghost: 'rounded-sm border border-line-strong text-bone hover:border-bone hover:text-ink-0',
};
const FILL_COLOR = { primary: 'bg-signal', ghost: 'bg-bone' };

/** Writes where the pointer crossed the edge into --fx / --fy, so the flood starts (or ends) there. */
const markEdge = (e) => {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--fx', `${e.clientX - r.left}px`);
  el.style.setProperty('--fy', `${e.clientY - r.top}px`);
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
 *   loading  hides the label behind three waving dots and disables the button
 *   fill     (primary and ghost) the hover colour floods in from where the pointer enters
 */
const Button = forwardRef(function Button({ variant = 'primary', size = 'md', to, href, children, className, icon, loading = false, fill = false, ...rest }, forwarded) {
  const soft = useSoft();
  const flood = fill && FILL_LOOK[variant] ? FILL_COLOR[variant] : null;
  const base = flood ? FILL_LOOK[variant] : VARIANTS[variant];
  const look = soft ? base.replace('rounded-sm', 'rounded-full') : base;
  const cls = clsx(BASE, look, variant !== 'link' && SIZES[size], (loading || flood) && 'relative', flood && 'group/fill isolate overflow-hidden', className);
  if (flood) {
    const { onPointerEnter, onPointerLeave } = rest;
    rest.onPointerEnter = (e) => {
      markEdge(e);
      onPointerEnter?.(e);
    };
    rest.onPointerLeave = (e) => {
      markEdge(e);
      onPointerLeave?.(e);
    };
  }
  // The pointer-follow effect belongs to full-size calls to action only.
  const own = useMagnetic(variant !== 'link' && size === 'md');
  // a menu, popover or tooltip puts its own ref on the trigger to know where to open: both refs get the element
  const magnet = useCallback(
    (node) => {
      own.current = node;
      if (typeof forwarded === 'function') forwarded(node);
      else if (forwarded) forwarded.current = node;
    },
    [own, forwarded]
  );
  const content = (
    <>
      {flood && (
        <span className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" aria-hidden="true">
          <span
            className={clsx(
              'absolute top-[var(--fy,50%)] left-[var(--fx,50%)] aspect-square w-[260%] -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full transition-transform duration-[650ms] ease-out-expo group-hover/fill:scale-100 group-focus-visible/fill:scale-100 motion-reduce:transition-none',
              flood
            )}
          />
        </span>
      )}
      <span className={clsx('inline-flex items-center gap-2 transition-opacity', loading && 'opacity-0')}>{children}</span>
      {loading && <Dots size={6} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
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
});

export default Button;

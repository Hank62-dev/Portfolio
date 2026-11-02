import { clsx } from '../../../lib/format';

// The look of "Ra chơi": a school notebook on a wooden desk, drawn in blue ballpoint. One SVG filter (#pen) makes every
// outline wobble a little, so boxes, boats and doodles all look drawn by hand rather than by a computer.

export const INK = '#2c3aa8';
export const RED = '#cf3b33';
export const PENCIL = '#5b5b63';

/** The wobble, defined once. Draw anything in an SVG with `filter="url(#pen)"` to get it. */
export function PenFilters() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <defs>
        <filter id="pen" x="-6%" y="-6%" width="112%" height="112%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="pen-bold" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="9" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

/** The scene every game sits in: a wooden desk, and on it a squared page held down with tape and a red margin line. */
export function Desk({ children, className }) {
  return (
    <div className="desk -mx-5 -mt-4 px-3 py-6 md:mx-0 md:mt-0 md:rounded-[2rem] md:px-8 md:py-10" data-desk>
      <PenFilters />
      <div className={clsx('notebook relative mx-auto w-full max-w-[34rem] rounded-[3px] px-4 pt-8 pb-9 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.75),0_2px_0_rgb(0_0_0/0.15)]', className)}>
        <i className="absolute -top-3 left-6 h-6 w-16 -rotate-6 bg-[#e9d9a0]/80 shadow-sm" aria-hidden="true" />
        <i className="absolute -top-3 right-6 h-6 w-16 rotate-3 bg-[#e9d9a0]/80 shadow-sm" aria-hidden="true" />
        <i className="absolute top-0 bottom-0 left-[1.6rem] w-px bg-[#d6403a]/55" aria-hidden="true" />
        <i className="absolute top-0 bottom-0 left-[1.85rem] w-px bg-[#d6403a]/30" aria-hidden="true" />
        <div className="relative pl-5">{children}</div>
      </div>
    </div>
  );
}

/** A hand-drawn box: its outline is an SVG rectangle drawn twice, a little off, through the wobble. */
export function InkBox({ as: Tag = 'div', className, innerClassName, tone = INK, fill, round = 4, children, ...rest }) {
  return (
    // `relative` is the default, but a box that is placed absolutely (a card face) must keep that
    <Tag className={clsx(!/(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className ?? '') && 'relative', className)} {...rest}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <g filter="url(#pen)" fill="none" stroke={tone} strokeLinecap="round" vectorEffect="non-scaling-stroke">
          <rect x="1.2" y="1.4" width="97.6" height="97.2" rx={round} fill={fill ?? 'none'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <rect x="0.6" y="2.2" width="98.6" height="96.2" rx={round} strokeWidth="1" opacity="0.55" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      <div className={clsx('relative', innerClassName)}>{children}</div>
    </Tag>
  );
}

/** A button drawn in pen: it presses down into the page. */
export function InkButton({ children, tone = INK, className, solid = false, ...rest }) {
  return (
    <InkBox as="button" type="button" tone={tone} fill={solid ? tone : undefined} className={clsx('select-none font-pen text-[1.25rem] leading-none font-semibold transition-transform active:translate-y-0.5 active:scale-[0.97] disabled:opacity-40', solid ? 'text-[#f8f3e5]' : '', className)} style={solid ? undefined : { color: tone }} {...rest}>
      <span className="flex items-center justify-center gap-1.5 px-4 py-2.5">{children}</span>
    </InkBox>
  );
}

/** A number written on the page, with its name under it. */
export const Score = ({ label, value, tone = INK }) => (
  <InkBox className="min-w-0 flex-1 px-2 py-1.5 text-center leading-none" tone={tone}>
    <b className="block font-pen text-[1.7rem] font-bold tabular-nums" style={{ color: tone }}>
      {value}
    </b>
    <small className="font-hand text-[0.78rem] text-[#20296a]/70">{label}</small>
  </InkBox>
);

/** A game's name written across the top, with a scribbled underline. */
export const Title = ({ children, hint }) => (
  <div className="leading-none">
    <h2 className="font-pen text-[2.1rem] font-bold" style={{ color: INK }}>
      {children}
    </h2>
    <svg viewBox="0 0 200 8" className="mt-0.5 h-2 w-40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M2 5 C30 1 60 7 95 3 S160 6 198 2" fill="none" stroke={RED} strokeWidth="2.2" strokeLinecap="round" filter="url(#pen)" />
    </svg>
    {hint && <p className="mt-1 font-hand text-[0.95rem] text-[#20296a]/75">{hint}</p>}
  </div>
);

/** What a game says when it ends: a note written on the page. */
export const Note = ({ title, detail, children }) => (
  <InkBox className="rotate-[-1deg] bg-[#fff8c9]/70 p-4 text-center" tone={RED} role="status">
    <p className="font-pen text-[1.9rem] leading-none font-bold" style={{ color: RED }}>
      {title}
    </p>
    {detail && <p className="mt-1 font-hand text-[1.05rem]">{detail}</p>}
    {children && <div className="mt-3 flex justify-center gap-2">{children}</div>}
  </InkBox>
);

// ---- doodles: small drawings in a 48 by 48 box -------------------------------------------------------------------------

const DOODLES = {
  bau: (
    <>
      <circle cx="24" cy="31" r="11" />
      <circle cx="24" cy="14" r="6.5" />
      <path d="M24 7.5c0-3 3-4.5 6-4M18 25c3 2 9 2 12 0" />
    </>
  ),
  cua: (
    <>
      <ellipse cx="24" cy="30" rx="12" ry="8" />
      <circle cx="10" cy="14" r="4.5" />
      <circle cx="38" cy="14" r="4.5" />
      <path d="M13 18l5 7M35 18l-5 7M12 32l-7 4M13 37l-6 6M36 32l7 4M35 37l6 6M20 22v-3M28 22v-3" />
    </>
  ),
  tom: (
    <>
      <path d="M35 9C21 4 8 12 10 25c1 8 8 13 16 12" />
      <path d="M26 37l7 5-1-9M35 9c4-2 8-1 10 1M35 11c4 0 7 2 9 6M16 15c2-2 5-3 8-3M14 21c2 0 4-1 7-1" />
      <circle cx="31" cy="13" r="1.3" />
    </>
  ),
  ca: (
    <>
      <path d="M5 24c8-13 24-13 31 0-7 13-23 13-31 0z" />
      <path d="M36 24l8-8v16zM22 14c3-3 6-3 8 0M13 22.5h.1M20 31c3 1 6 1 8 0" />
    </>
  ),
  ga: (
    <>
      <circle cx="22" cy="28" r="11" />
      <path d="M15 18c-3-5 0-9 4-6 1-5 7-5 8 0 4-1 6 3 3 7M33 27l9 3-9 3M29 36c3 4 0 8-4 6" />
      <circle cx="26" cy="25" r="1.4" />
    </>
  ),
  nai: (
    <>
      <path d="M15 22c0 11 4 19 9 19s9-8 9-19c-4-3-14-3-18 0z" />
      <path d="M15 22l-5-9m0 0l-6-2m6 2l-2-7M33 22l5-9m0 0l6-2m-6 2l2-7M12 23l-5 3M36 23l5 3M21 27h.1M27 27h.1M22 36c2 1 4 1 6 0" />
    </>
  ),
  boat: (
    <>
      <path d="M5 30h38l-6 9H11z" />
      <path d="M24 9v21M24 9l-14 17h14M24 13l10 13H24" />
    </>
  ),
  rock: (
    <>
      <path d="M10 30c-3-6 0-12 6-13 2-4 8-5 11-1 5-1 9 3 8 8 3 4 1 10-4 11-6 3-16 2-21-5z" />
      <path d="M17 24c2-2 4-2 6 0M27 22c2 1 3 3 3 5" />
    </>
  ),
  star: <path d="M24 5l5.5 12 13 1.5-9.5 9 2.5 13L24 34l-11.5 6.5 2.5-13-9.5-9 13-1.5z" />,
  cross: <path d="M10 10l28 28M38 10L10 38" />,
  ring: <circle cx="24" cy="24" r="14" />,
};

/** A little drawing, in ink by default. Names: bau cua tom ca ga nai boat rock star cross ring. */
export function Doodle({ name, size = 40, tone = INK, width = 2.4, className }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} fill="none" stroke={tone} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g filter="url(#pen)">{DOODLES[name]}</g>
    </svg>
  );
}

/** A captain drawn in ink: a face, a cap with a badge, and a moustache or a ponytail. Original, made for this page. */
export function Captain({ kind = 'captain', tone = INK, size = 52 }) {
  return (
    <svg viewBox="0 0 48 52" width={size} height={size * 1.08} fill="none" stroke={tone} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g filter="url(#pen)">
        <path d="M10 22c0 12 5 20 14 20s14-8 14-20" fill="#f8f3e5" />
        {kind === 'captain' ? (
          <>
            <path d="M8 20c0-9 6-14 16-14s16 5 16 14z" fill="#dfe3ff" />
            <path d="M6 22h36" />
            <circle cx="24" cy="14" r="3" stroke={RED} />
            <path d="M17 31c3-2 5-2 7 0 2-2 4-2 7 0" />
          </>
        ) : (
          <>
            <path d="M9 17c1-8 8-11 15-11s14 3 15 11c-8-2-22-2-30 0z" fill="#dfe3ff" />
            <path d="M39 22c4 3 4 9 1 13" />
            <path d="M20 35c2 1 6 1 8 0" />
          </>
        )}
        <circle cx="18.5" cy="26.5" r="1.4" fill={tone} />
        <circle cx="29.5" cy="26.5" r="1.4" fill={tone} />
      </g>
    </svg>
  );
}

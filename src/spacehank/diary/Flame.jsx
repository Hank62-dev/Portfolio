import { clsx } from '../../shared/lib/format';

/** How big the flame is for a streak: 1 for a few days, 2 from a week, 3 from a month. */
export const flameLevel = (days) => (days >= 30 ? 3 : days >= 7 ? 2 : 1);

/** A small flame that flickers, for the number of days written in a row. It grows (and glows) with the streak. */
export default function Flame({ days, className }) {
  const level = flameLevel(days);
  return (
    <svg
      viewBox="0 0 24 30"
      width={12 + level * 3}
      height={15 + level * 3.75}
      aria-hidden="true"
      className={clsx('shrink-0 overflow-visible', className)}
      style={{ filter: level > 1 ? `drop-shadow(0 0 ${level * 2.5}px rgb(255 140 60 / 0.75))` : undefined }}
    >
      <path className="flame" d="M12 1c1 5 7 8 7 16a7 7 0 0 1-14 0c0-3 1.5-5 3-7 .3 2 1 3 2 3.5C10 9 10.5 5 12 1z" fill="#ff7a2e" />
      <path className="flame-core" d="M12 14c.6 2.6 3.6 4 3.6 7.4a3.6 3.6 0 0 1-7.2 0c0-1.7.8-2.8 1.6-3.8.2 1 .6 1.6 1.2 1.9-.1-2 .2-3.6.8-5.5z" fill="#ffd36b" />
    </svg>
  );
}

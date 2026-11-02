import { useState } from 'react';
import { clsx } from '../../../lib/format';

const read = (key) => {
  try {
    const value = localStorage.getItem(`hank62.games.${key}`);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
};

/** A best score kept on this device. `report(value)` stores it when it beats the old one, and says whether it did. */
export const useBest = (key, lowerIsBetter = false) => {
  const [best, setBest] = useState(() => read(key));
  const report = (value) => {
    if (best !== null && (lowerIsBetter ? value >= best : value <= best)) return false;
    try {
      localStorage.setItem(`hank62.games.${key}`, String(value));
    } catch {
      /* the record just will not outlive this visit */
    }
    setBest(value);
    return true;
  };
  return [best, report];
};

export const seconds = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** A small labelled number above a game board. */
export const Stat = ({ label, value, tone }) => (
  <div className="min-w-0 flex-1 rounded-2xl border border-line bg-ink-1 px-3 py-2 text-center leading-tight">
    <b className={clsx('block font-display text-[1.35rem] font-normal tabular-nums', tone ?? 'text-bone')}>{value}</b>
    <small className="font-mono text-[0.6rem] tracking-[0.14em] text-bone-faint uppercase">{label}</small>
  </div>
);

/** The line a game shows when it ends. */
export const Result = ({ title, detail, children }) => (
  <div className="flex flex-col items-center gap-3 rounded-3xl border border-signal/30 bg-signal-soft p-5 text-center" role="status">
    <h3 className="font-display text-h3 leading-tight text-bone">{title}</h3>
    {detail && <p className="font-mono text-fine text-bone-dim">{detail}</p>}
    {children}
  </div>
);

import { useState } from 'react';

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

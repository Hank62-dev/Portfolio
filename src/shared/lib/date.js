/** "2026-11-10": the local calendar day of a moment, the key a day is kept under (a habit's day, a journal page). */
export const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

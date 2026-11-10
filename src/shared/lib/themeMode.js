// How the theme is chosen. Besides "light" and "dark" there is "auto": light by day, dark by night, following the clock.
// (index.html repeats the two hours below in a tiny script that runs before the first paint, so keep them in step.)

export const MODES = ['auto', 'light', 'dark'];
export const DAY_STARTS = 6; // from 06:00 …
export const DAY_ENDS = 18; // … until 18:00 the day theme is used

export const isMode = (value) => MODES.includes(value);

/** The theme that is on screen: a fixed mode is itself; "auto" depends on the hour. */
export const resolveTheme = (mode, now = new Date()) => {
  if (mode === 'light' || mode === 'dark') return mode;
  const hour = now.getHours();
  return hour >= DAY_STARTS && hour < DAY_ENDS ? 'light' : 'dark';
};

/** The next moment "auto" changes its mind (sunrise or sunset on the clock), as a Date. */
export const nextSwitch = (now = new Date()) => {
  const at = new Date(now);
  for (const hour of [DAY_STARTS, DAY_ENDS]) {
    at.setHours(hour, 0, 0, 0);
    if (at > now) return at;
  }
  at.setDate(at.getDate() + 1);
  at.setHours(DAY_STARTS, 0, 0, 0);
  return at;
};

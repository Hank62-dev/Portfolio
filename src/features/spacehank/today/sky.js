// The sky on the home screen: its colours follow the real time of day and the weather, so the screen is never quite the same twice.
// Plain functions: they return colours (as CSS text) and where the sun or moon is; the screen draws them.

// The sky at some hours, as [hue, saturation %, lightness %] for the top, the middle and the horizon. Between two hours the colours
// glide, so there is no moment where the sky jumps.
const KEYS = [
  { h: 0, top: [232, 55, 9], mid: [236, 50, 15], low: [248, 42, 24] }, // night
  { h: 5, top: [236, 50, 14], mid: [262, 42, 26], low: [14, 60, 40] }, // before dawn
  { h: 7, top: [214, 60, 38], mid: [28, 75, 58], low: [16, 85, 62] }, // sunrise
  { h: 10, top: [208, 70, 42], mid: [200, 65, 56], low: [196, 60, 70] }, // morning
  { h: 13, top: [212, 78, 44], mid: [206, 70, 58], low: [198, 62, 72] }, // noon
  { h: 16, top: [214, 66, 42], mid: [32, 70, 58], low: [38, 80, 66] }, // afternoon
  { h: 18, top: [236, 45, 26], mid: [330, 50, 42], low: [18, 86, 58] }, // dusk
  { h: 20, top: [240, 50, 16], mid: [250, 44, 24], low: [270, 40, 34] }, // evening
  { h: 24, top: [232, 55, 9], mid: [236, 50, 15], low: [248, 42, 24] },
];

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const lerp = (a, b, t) => a + (b - a) * t;
// hues go round a circle: 330 to 32 is a short way through red, not a long way through blue
const lerpHue = (a, b, t) => (a + ((((b - a + 540) % 360) - 180) * t) + 360) % 360;
const mix = (from, to, t) => [lerpHue(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];

/** Weather as how much it greys the sky (0 clear .. 1 heavy) and how much it darkens it. */
const WEATHER = {
  clear: { grey: 0, dark: 0 },
  partly: { grey: 0.18, dark: 0.02 },
  cloudy: { grey: 0.5, dark: 0.08 },
  fog: { grey: 0.65, dark: 0.04 },
  drizzle: { grey: 0.55, dark: 0.12 },
  rain: { grey: 0.7, dark: 0.18 },
  snow: { grey: 0.55, dark: 0.02 },
  storm: { grey: 0.8, dark: 0.3 },
};

const css = ([h, s, l]) => `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;

/** Where the sun (from 6 to 18) or the moon (the rest) is: x and y as percentages of the sky, y from the top. It rises, tops and sets in an arc. */
export const orbAt = (hour) => {
  const day = hour >= 6 && hour < 18;
  const t = day ? (hour - 6) / 12 : ((hour >= 18 ? hour - 18 : hour + 6) / 12);
  return { kind: day ? 'sun' : 'moon', x: 10 + t * 80, y: 80 - Math.sin(Math.PI * t) * 58 };
};

/** How many stars show: all of them at night, none by day, fading in and out around dusk and dawn. */
export const starsAt = (hour) => {
  if (hour < 5) return 1;
  if (hour < 7) return clamp((7 - hour) / 2);
  if (hour >= 20) return 1;
  if (hour > 18.5) return clamp((hour - 18.5) / 1.5);
  return 0;
};

/** The sky for an hour of the day (0 up to 24, with minutes as a fraction) and the weather ('clear', 'rain'…; none means clear). */
export const skyOf = (hour, condition = 'clear') => {
  const h = ((hour % 24) + 24) % 24;
  const next = KEYS.findIndex((k) => k.h > h);
  const a = KEYS[Math.max(0, next - 1)];
  const b = KEYS[next === -1 ? KEYS.length - 1 : next];
  const t = (h - a.h) / (b.h - a.h || 1);
  const weather = WEATHER[condition] ?? WEATHER.clear;
  const paint = (name) => {
    const [hue, sat, light] = mix(a[name], b[name], t);
    return css([hue, sat * (1 - 0.6 * weather.grey), light * (1 - weather.dark) + weather.grey * (name === 'low' ? 4 : 0)]);
  };
  return { top: paint('top'), mid: paint('mid'), low: paint('low'), orb: orbAt(h), stars: starsAt(h) * (1 - 0.7 * weather.grey), grey: weather.grey };
};

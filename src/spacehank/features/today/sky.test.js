import { describe, expect, it } from 'vitest';
import { orbAt, skyOf, starsAt } from './sky';

const lightness = (css) => Number(/(\d+(?:\.\d+)?)%\)$/.exec(css)[1]);
const saturation = (css) => Number(/(\d+(?:\.\d+)?)% \d+(?:\.\d+)?%\)$/.exec(css)[1]);

describe('the sun and the moon', () => {
  it('is the sun between six and six, and the moon the rest of the time', () => {
    expect(orbAt(12).kind).toBe('sun');
    expect(orbAt(6).kind).toBe('sun');
    expect(orbAt(18).kind).toBe('moon');
    expect(orbAt(2).kind).toBe('moon');
  });

  it('rises at the left, tops at noon and sets at the right', () => {
    const rise = orbAt(6);
    const noon = orbAt(12);
    const set = orbAt(17.99);
    expect(rise.x).toBeLessThan(15);
    expect(set.x).toBeGreaterThan(85);
    expect(noon.y).toBeLessThan(rise.y);
    expect(noon.y).toBeLessThan(set.y);
    expect(orbAt(0).x).toBeGreaterThan(40); // the moon is high at midnight
  });
});

describe('the stars', () => {
  it('are all out at night, gone by day, and fade at the edges', () => {
    expect(starsAt(2)).toBe(1);
    expect(starsAt(22)).toBe(1);
    expect(starsAt(12)).toBe(0);
    expect(starsAt(6)).toBeGreaterThan(0);
    expect(starsAt(6)).toBeLessThan(1);
    expect(starsAt(19)).toBeGreaterThan(0);
  });
});

describe('the sky', () => {
  it('is dark at night and brighter at noon', () => {
    expect(lightness(skyOf(0).top)).toBeLessThan(15);
    expect(lightness(skyOf(13).low)).toBeGreaterThan(60);
  });

  it('is the same at midnight from either side', () => {
    expect(skyOf(0)).toEqual(skyOf(24));
    expect(skyOf(-1)).toEqual(skyOf(23));
  });

  it('never jumps: a minute later is almost the same sky', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const a = skyOf(h);
      const b = skyOf(h + 1 / 60);
      for (const part of ['top', 'mid', 'low']) expect(Math.abs(lightness(a[part]) - lightness(b[part]))).toBeLessThan(1.2);
    }
  });

  it('is greyer and darker when it rains', () => {
    const clear = skyOf(13);
    const rain = skyOf(13, 'rain');
    expect(saturation(rain.mid)).toBeLessThan(saturation(clear.mid));
    expect(lightness(rain.top)).toBeLessThan(lightness(clear.top));
    expect(rain.stars).toBeLessThanOrEqual(clear.stars);
  });

  it('treats a condition it does not know as clear', () => {
    expect(skyOf(10, 'meteors')).toEqual(skyOf(10));
  });

  it('turns the shortest way round the colour wheel (dusk to evening does not pass through green)', () => {
    for (let h = 16; h <= 20; h += 0.5) {
      const hue = Number(/hsl\((\d+(?:\.\d+)?)/.exec(skyOf(h).mid)[1]);
      expect(hue < 100 || hue > 200).toBe(true);
    }
  });
});

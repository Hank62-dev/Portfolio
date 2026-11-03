import { describe, expect, it } from 'vitest';
import { findBars, squareFrom } from './coverCrop';

// RGBA pixels of a picture w by h, made by a function (x, y) -> [r, g, b]
const picture = (w, h, colourAt) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const [r, g, b] = colourAt(x, y);
      data.set([r, g, b, 255], (y * w + x) * 4);
    }
  }
  return data;
};
const noise = (x, y) => [(x * 37 + y * 11) % 256, (x * 13 + y * 71) % 256, (x * 5 + y * 29) % 256]; // a busy picture: no flat rows

describe('finding the bars around a picture', () => {
  it('finds black bars above and below a wide picture', () => {
    const data = picture(100, 100, (x, y) => (y < 22 || y >= 78 ? [0, 0, 0] : noise(x, y)));
    expect(findBars(data, 100, 100)).toEqual({ top: 22, bottom: 22, left: 0, right: 0 });
  });

  it('finds bars at the sides of a tall picture, and bars of another colour', () => {
    const data = picture(100, 100, (x, y) => (x < 30 || x >= 70 ? [250, 250, 250] : noise(x, y)));
    expect(findBars(data, 100, 100)).toEqual({ top: 0, bottom: 0, left: 30, right: 30 });
  });

  it('copes with bars of different thickness and with slightly noisy bars', () => {
    const data = picture(100, 100, (x, y) => (y < 10 ? [3, 2, 4] : y >= 70 ? [8, 8, 8] : noise(x, y)));
    expect(findBars(data, 100, 100)).toEqual({ top: 10, bottom: 30, left: 0, right: 0 });
  });

  it('finds nothing in a picture that fills its frame', () => {
    expect(findBars(picture(100, 100, noise), 100, 100)).toBeNull();
  });

  it('ignores an edge that is too thin to be a bar', () => {
    const data = picture(100, 100, (x, y) => (y < 2 ? [0, 0, 0] : noise(x, y)));
    expect(findBars(data, 100, 100)).toBeNull();
  });

  it('does not cut away a picture that is simply dark or plain all over', () => {
    expect(findBars(picture(100, 100, () => [0, 0, 0]), 100, 100)).toBeNull();
    const mostlyBar = picture(100, 100, (x, y) => (y < 40 || y >= 70 ? [0, 0, 0] : noise(x, y)));
    expect(findBars(mostlyBar, 100, 100)).toBeNull(); // what is left would be under a third of it
  });
});

describe('the square that is cut out', () => {
  it('takes the middle of a wide picture, as large as fits', () => {
    // 100 wide, bars of 22 above and below: 56 rows of picture, so a 56 square in the middle
    expect(squareFrom({ top: 22, bottom: 22, left: 0, right: 0 }, 100, 100)).toEqual({ x: 22, y: 22, side: 56 });
  });

  it('takes the middle of a tall picture', () => {
    expect(squareFrom({ top: 0, bottom: 0, left: 30, right: 30 }, 100, 100)).toEqual({ x: 30, y: 30, side: 40 });
  });

  it('is the whole picture when there are no bars, and never empty', () => {
    expect(squareFrom(null, 80, 80)).toEqual({ x: 0, y: 0, side: 80 });
    expect(squareFrom({ top: 0, bottom: 0, left: 0, right: 0 }, 200, 120)).toEqual({ x: 40, y: 0, side: 120 });
  });
});

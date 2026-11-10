import { describe, expect, it } from 'vitest';
import { bboxOf, clampZoom, cropData, defaultName, fitDoc, fitView, floodRegion, hexToRgba, layerAfterRemoving, moveLayer, newLayerMeta, paintMask, rgbaToHex, zoomAt } from './model';

// a w by h picture, all `fill`, as flat pixels
const pixels = (w, h, fill = [255, 255, 255, 255]) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i += 1) data.set(fill, i * 4);
  return data;
};
const put = (data, w, x, y, rgba) => data.set(rgba, (y * w + x) * 4);
const black = [0, 0, 0, 255];

describe('colours', () => {
  it('goes between hex and rgba, short hex included', () => {
    expect(hexToRgba('#ff8000')).toEqual([255, 128, 0, 255]);
    expect(hexToRgba('#fa0', 100)).toEqual([255, 170, 0, 100]);
    expect(rgbaToHex([255, 128, 0, 255])).toBe('#ff8000');
    expect(rgbaToHex([300, -4, 7.4])).toBe('#ff0007');
  });
});

describe('the size of a drawing', () => {
  it('shrinks a big picture to the largest side and never makes a small one bigger', () => {
    expect(fitDoc(4800, 2400, 2400)).toEqual({ width: 2400, height: 1200 });
    expect(fitDoc(800, 600, 2400)).toEqual({ width: 800, height: 600 });
  });
});

describe('the view', () => {
  it('fits the drawing in the middle of the view', () => {
    const fit = fitView({ width: 1000, height: 600 }, { width: 500, height: 500 }, 20);
    expect(fit.k).toBeCloseTo(1.12);
    expect(fit.x).toBeCloseTo((1000 - 500 * 1.12) / 2);
    expect(fit.y).toBeCloseTo(20);
  });

  it('zooms about a point and keeps that point still', () => {
    const view = { k: 1, x: 10, y: 20 };
    const next = zoomAt(view, 2, 110, 120);
    // the point of the drawing under (110, 120) is (100, 100); after the zoom it is still under (110, 120)
    expect(next.x + 100 * next.k).toBeCloseTo(110);
    expect(next.y + 100 * next.k).toBeCloseTo(120);
    expect(clampZoom(100)).toBe(8);
    expect(clampZoom(0)).toBe(0.1);
  });
});

describe('the box round a stroke', () => {
  it('is padded and kept inside the drawing', () => {
    expect(bboxOf([{ x: 10, y: 10 }, { x: 30, y: 20 }], 5, 100, 100)).toEqual({ x: 5, y: 5, w: 30, h: 20 });
    expect(bboxOf([{ x: 1, y: 1 }], 10, 50, 40)).toEqual({ x: 0, y: 0, w: 11, h: 11 });
    expect(bboxOf([], 5, 10, 10)).toBeNull();
  });

  it('crops pixels to a box', () => {
    const data = pixels(4, 4);
    put(data, 4, 2, 1, black);
    const part = cropData({ data, width: 4, height: 4 }, { x: 1, y: 1, w: 2, h: 2 });
    expect(part.width).toBe(2);
    expect([...part.data.slice(4, 8)]).toEqual(black); // the pixel at (2, 1) is now at (1, 0)
  });
});

describe('the flood fill', () => {
  it('fills the room a click is in and stops at the walls', () => {
    // a 6 by 3 picture with a wall of black down column 3: two rooms
    const data = pixels(6, 3);
    for (let y = 0; y < 3; y += 1) put(data, 6, 3, y, black);
    const left = floodRegion(data, 6, 3, 0, 0);
    expect(left.count).toBe(9);
    expect(left.rect).toEqual({ x: 0, y: 0, w: 3, h: 3 });
    expect(floodRegion(data, 6, 3, 5, 1).count).toBe(6);
    expect(floodRegion(data, 6, 3, 3, 1).count).toBe(3); // the wall itself
  });

  it('goes round a corner and takes in near colours up to the tolerance', () => {
    const data = pixels(3, 3);
    put(data, 3, 1, 0, black);
    put(data, 3, 1, 1, black);
    expect(floodRegion(data, 3, 3, 0, 0).count).toBe(7); // down the left, along the bottom, up the right
    put(data, 3, 2, 2, [250, 250, 250, 255]);
    expect(floodRegion(data, 3, 3, 0, 0, 4).count).toBe(4); // the grey corner is out, and it shuts the way to the two pixels above it
    expect(floodRegion(data, 3, 3, 0, 0, 10).count).toBe(7);
  });

  it('does nothing outside the drawing', () => {
    expect(floodRegion(pixels(2, 2), 2, 2, 5, 5)).toMatchObject({ count: 0, rect: null });
  });

  it('paints the region, and a pixel more round it when asked', () => {
    const data = pixels(5, 1);
    put(data, 5, 2, 0, black);
    const { mask } = floodRegion(data, 5, 1, 0, 0); // pixels 0 and 1
    const flat = new Uint8ClampedArray(data);
    paintMask(flat, 5, 1, mask, [255, 0, 0, 255], 0);
    expect([...flat.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...flat.slice(8, 12)]).toEqual(black);
    paintMask(data, 5, 1, mask, [255, 0, 0, 255], 1);
    expect([...data.slice(8, 12)]).toEqual([255, 0, 0, 255]); // the wall's own edge is covered, so no white line is left
  });
});

describe('layers', () => {
  const layers = ['a', 'b', 'c'].map((id) => newLayerMeta(id, id));

  it('moves a layer a step and stops at the ends', () => {
    expect(moveLayer(layers, 'b', -1).map((l) => l.id)).toEqual(['b', 'a', 'c']);
    expect(moveLayer(layers, 'a', -1)).toBe(layers);
    expect(moveLayer(layers, 'c', 1)).toBe(layers);
  });

  it('chooses the layer that takes the place of one taken out', () => {
    expect(layerAfterRemoving(layers, 'b')).toBe('c');
    expect(layerAfterRemoving(layers, 'c')).toBe('b');
    expect(layerAfterRemoving([layers[0]], 'a')).toBeNull();
  });

  it('gives each new layer its own id, visible and fully opaque', () => {
    const one = newLayerMeta('x');
    const two = newLayerMeta('y');
    expect(one.id).not.toBe(two.id);
    expect(one).toMatchObject({ visible: true, opacity: 1 });
  });
});

describe('a name for a new drawing', () => {
  it('has the word and the time', () => {
    expect(defaultName(new Date(2026, 10, 9, 10, 42))).toMatch(/^Drawing .*10[:.]42/);
  });
});

import { describe, expect, it } from 'vitest';
import { LAYER_IDS, TOP, clamp01, layerY, seeded } from './config';
import { createSceneState, hit } from './SceneContext';

describe('stack scene helpers', () => {
  it('stacks the layers top to bottom, centred on the beam, and spreads them out', () => {
    const ys = LAYER_IDS.map((_, i) => layerY(i, 1));
    expect(ys).toEqual([1.5, 0.5, -0.5, -1.5]);
    expect(layerY(0, 2)).toBe(3);
    expect(TOP).toBeCloseTo(0.05);
  });

  it('draws the same random layout every time for a seed', () => {
    const a = seeded(7);
    const b = seeded(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seeded(8)()).not.toBe(seeded(7)());
    const v = seeded(3)();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });

  it('clamps to 0..1', () => {
    expect([clamp01(-2), clamp01(0.4), clamp01(5)]).toEqual([0, 0.4, 1]);
  });

  it('lights a layer and restarts its ring, never dimming a brighter flash', () => {
    const scene = createSceneState();
    expect(Array.from(scene.ripple)).toEqual([1, 1, 1, 1]);
    hit(scene, 2, 1);
    expect(scene.flash[2]).toBe(1);
    expect(scene.ripple[2]).toBe(0);
    hit(scene, 2, 0.3);
    expect(scene.flash[2]).toBe(1);
  });
});

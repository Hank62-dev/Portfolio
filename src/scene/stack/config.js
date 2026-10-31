import * as THREE from 'three';

// Shared numbers for the four-layer stack. Used by the hero and by the Stack section's diagram.
export const PLATE = [3.4, 0.1, 2.3];
export const GAP = 1.12;
export const LAYER_IDS = ['interface', 'service', 'data', 'delivery'];
export const BEAM_HEIGHT = 5.8;

/** World y of a layer's centre; interface on top. `spread` is the gap between layers (it grows on scroll). */
export const layerY = (index, spread) => ((LAYER_IDS.length - 1) / 2 - index) * spread;

/** y of the top face of a plate: layer content sits here. */
export const TOP = PLATE[1] / 2;

// Colours above 1.0 on a toneMapped={false} material are what the Bloom pass picks up: only things we
// push past white will glow, everything else stays crisp.
export const HOT = new THREE.Color('#ff5b2e').multiplyScalar(3.4);
export const WARM = new THREE.Color('#ff7a4a').multiplyScalar(1.5);
export const EMBER = new THREE.Color('#ff5b2e');

export const PALETTE = {
  dark: { slab: '#15171b', card: '#1f2228', dim: '#8a8579', bone: '#ece6da', edge: '#ece6da', edgeOpacity: 0.5, ink: '#ece6da' },
  light: { slab: '#15171b', card: '#26292f', dim: '#8a8579', bone: '#ece6da', edge: '#d8d1c2', edgeOpacity: 0.6, ink: '#17140f' },
};

/** Small deterministic random generator, so the scene lays out the same way every time. */
export const seeded = (seed) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const clamp01 = (v) => Math.min(1, Math.max(0, v));

import { createContext, useContext } from 'react';

/**
 * State the layers share without going through React: `flash[i]` is how strongly layer i is lit by a packet
 * that just passed through it (decays to 0), `ripple[i]` the progress of its expanding ring (0..1),
 * and `spread` the current gap between layers.
 */
export const SceneContext = createContext(null);
export const useScene = () => useContext(SceneContext);

export const createSceneState = () => ({
  flash: new Float32Array(4),
  ripple: new Float32Array([1, 1, 1, 1]),
  spread: { current: 1.12 },
});

/** Light a layer: it glows and sends out a ring. */
export const hit = (scene, index, strength = 1) => {
  scene.flash[index] = Math.max(scene.flash[index], strength);
  scene.ripple[index] = 0;
};

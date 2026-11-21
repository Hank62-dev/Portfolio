// Whether a device should be given an effect. Every effect in shared/fx asks here first, so the rules are the same on the
// portfolio and in SpaceHank: nothing moves for people who asked for less motion, nothing heavy runs on weak hardware or when
// data is being saved, and a GPU effect needs WebGL.

import { lowPower } from './battery';

const media = (query) => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches);

// where the browser cannot be asked (a test, an old engine) nothing moves
export const reducedMotion = () => typeof window === 'undefined' || typeof window.matchMedia !== 'function' || media('(prefers-reduced-motion: reduce)');
export const finePointer = () => media('(hover: hover) and (pointer: fine)');

let webgl = null;
/** Whether WebGL can be had at all (asked once, on a throwaway canvas). */
export const hasWebGL = () => {
  if (webgl !== null) return webgl;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    webgl = Boolean(gl);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
};

/** Plain signals, so `weakDevice` can be tested with objects. */
export const readDevice = () => ({
  saveData: typeof navigator !== 'undefined' && Boolean(navigator.connection?.saveData),
  cores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined,
  memory: typeof navigator !== 'undefined' ? navigator.deviceMemory : undefined,
});

/** Too little to spare for a running GPU effect: few cores, little memory, or data being saved. */
export const weakDevice = ({ saveData, cores, memory } = readDevice()) => Boolean(saveData) || (cores != null && cores <= 2) || (memory != null && memory < 2);

/** Movement that costs little (CSS, a few DOM pieces): only the person's wish for less motion stops it. */
export const canMove = () => !reducedMotion();

/** A GPU effect that runs for a while (a shader, a simulation): motion welcome, WebGL there, a device that can spare it, and a battery that is not low. */
export const canGL = () => canMove() && hasWebGL() && !weakDevice() && !lowPower();

/** A pixel ratio for a canvas that is drawn every frame: sharp enough, never the full 3x of a phone. */
export const fxDpr = (max = 1.5) => Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, max);

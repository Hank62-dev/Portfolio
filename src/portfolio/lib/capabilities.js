// Decides whether this device should get the WebGL hero. Everything else on the page works without it.

const hasWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

/** Reads the signals we gate on from the browser. Kept separate so `can3D` can be tested with plain objects. */
export const readEnvironment = () => ({
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  saveData: Boolean(navigator.connection?.saveData),
  cores: navigator.hardwareConcurrency,
  memory: navigator.deviceMemory,
  width: window.innerWidth,
  webgl: hasWebGL(),
});

/** The hero's 3D needs room beside the text, so it is for wide screens only. */
export const HERO_3D_MIN_WIDTH = 1024;

/** False for people who asked for less motion or less data, for weak hardware, narrow screens and without WebGL. */
export const can3D = (env) =>
  env.width >= HERO_3D_MIN_WIDTH &&
  !env.reducedMotion &&
  !env.saveData &&
  env.webgl &&
  (env.cores == null || env.cores > 2) &&
  (env.memory == null || env.memory >= 2);

/** 'high' on capable desktops, 'low' otherwise: fewer particles and a lower pixel ratio. */
export const qualityTier = (env) => (env.width >= 1024 && (env.cores == null || env.cores >= 8) ? 'high' : 'low');

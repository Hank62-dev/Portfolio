import { createFluid } from '../../../shared/fx/fluid.js';
import { canGL } from '../../../shared/fx/gate.js';
import { hexToRgba } from './model.js';

// The ink brush: a stroke drops ink into a real fluid (shared/fx/fluid) laid over the drawing, so it bleeds, curls and feathers
// out from where the brush went, like ink on wet paper. When the hand lifts, the ink is given a moment to spread and is then
// printed onto the layer, where it stays put.

const SIDE = 900; // the fluid's longest side: ink is soft, it does not need the drawing's full size
const SETTLE_MS = 900;

/** Whether this device can have the ink brush (it needs WebGL 2 with float targets). */
export const canInk = () => {
  if (!canGL()) return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ok = Boolean(gl?.getExtension('EXT_color_buffer_float'));
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return ok;
  } catch {
    return false;
  }
};

/**
 * A pool of ink over a drawing of `width` by `height`, shown in `host` above the layers. `stroke(from, to, size)` pushes ink
 * along a piece of the stroke (drawing coordinates), `settle(print)` lets it spread and then hands the ink's canvas to `print`
 * (to draw onto the layer) and goes away. Null where there is no fluid to be had.
 */
export const createInk = ({ width, height, host, color }) => {
  const k = Math.min(1, SIDE / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(32, Math.round(width * k));
  canvas.height = Math.max(32, Math.round(height * k));
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:3';
  const [r, g, b] = hexToRgba(color);
  const fluid = createFluid(canvas, [r / 255, g / 255, b / 255], { sim: 112, dye: Math.max(canvas.width, canvas.height) * 0.6, curl: 14, fade: 0.06, drag: 1.2, radius: 1, maxAlpha: 0.92 });
  if (!fluid) return null;
  host?.appendChild(canvas);
  let raf = 0;
  let prev = performance.now();
  let settleUntil = 0;
  let onSettled = null;
  let gone = false;
  const frame = (now) => {
    raf = 0;
    if (gone) return;
    const dt = Math.min(0.033, (now - prev) / 1000);
    prev = now;
    fluid.step(dt);
    fluid.display(1.4);
    if (onSettled && now >= settleUntil) {
      // printed in the same frame it was drawn, while the picture is still in the canvas
      const print = onSettled;
      onSettled = null;
      print(canvas);
      dispose();
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  const run = () => {
    if (!raf && !gone) {
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  function dispose() {
    gone = true;
    cancelAnimationFrame(raf);
    fluid.dispose();
    canvas.remove();
  }
  return {
    stroke(from, to, size) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      // the fluid's grid is y up, 0..1 across
      const x = to.x / width;
      const y = 1 - to.y / height;
      const push = 40 + size * 6;
      fluid.splat(x, y, (dx / width) * push * 60, (-dy / height) * push * 60, 0.35 + Math.min(0.5, size / 60));
      run();
    },
    settle(print) {
      settleUntil = performance.now() + SETTLE_MS;
      onSettled = print;
      run();
    },
    /** Prints whatever is there now (another stroke has started before this one settled). */
    flush() {
      if (!onSettled) return;
      fluid.display(1.4);
      const print = onSettled;
      onSettled = null;
      print(canvas);
      dispose();
    },
    dispose,
  };
};

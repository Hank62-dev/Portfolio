import { blip, chime, makeContext, whoosh } from '../../shared/fx/tones';
import { createStore } from './store';

// The workspace's sounds, made in the browser (shared/fx/tones): a tick when the pointer reaches a place in the menu, a soft
// whoosh when the tab changes, a chime when something is done. Off until the owner turns it on in the theme menu (browsers only
// play after a click anyway); the choice is kept on this device.

const KEY = 'hank62.sound';
const read = () => {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
};

export const soundState = createStore({ on: read() });

let ctx = null;
let out = null;
let lastTick = 0;

const ready = () => {
  if (!soundState.get().on) return null;
  if (!ctx) {
    ctx = makeContext();
    if (!ctx) return null;
    out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx.state === 'closed' ? null : ctx;
};

export const sound = {
  set(on) {
    soundState.set({ on });
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      /* the choice lasts for this visit */
    }
    if (on && ready()) chime(ctx, out, [660, 880], { volume: 0.04 });
  },
  tick() {
    const now = performance.now();
    if (now - lastTick < 60 || !ready()) return;
    lastTick = now;
    blip(ctx, out, 2300, 1800, 0.045, 0.025);
  },
  tap() {
    if (ready()) blip(ctx, out, 620, 260, 0.1, 0.05, 'triangle');
  },
  /** The tab changing: a short, quiet sweep. */
  move() {
    if (ready()) whoosh(ctx, out, { length: 0.45, from: 1800, to: 420, volume: 0.05 });
  },
  /** Something finished: three rising notes. */
  done() {
    if (ready()) chime(ctx, out, [784, 988, 1319]);
  },
};

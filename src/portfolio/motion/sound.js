// The site's sound, made in the browser with Web Audio: no files to download. A soft, slowly breathing
// pad underneath, a tick when the pointer reaches something clickable, a blip on a click and a whoosh on
// a page change. Off until the visitor turns it on (browsers only allow audio after a gesture anyway);
// the choice is remembered in this browser.

import { blip, makeContext, whoosh } from '../../shared/fx/tones';

const KEY = 'portfolio-sound';
const listeners = new Set();

const readStored = () => {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
};

let enabled = false;
let ctx = null;
let master = null;
let pad = null;
let lastTick = 0;

const ensureContext = () => {
  if (ctx) return ctx;
  ctx = makeContext();
  if (!ctx) return null;
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  return ctx;
};

/** Two detuned voices through a slowly opening filter, with a breath on the volume. */
const startPad = () => {
  if (pad || !ctx) return;
  const out = ctx.createGain();
  out.gain.value = 0.05;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  filter.Q.value = 0.6;
  filter.connect(out);
  out.connect(master);

  const voices = [110, 164.81, 220.6].map((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = i === 2 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    osc.detune.value = (i - 1) * 7;
    const g = ctx.createGain();
    g.gain.value = i === 2 ? 0.25 : 0.5;
    osc.connect(g).connect(filter);
    osc.start();
    return osc;
  });

  // slow movement: the filter opens and closes, the volume breathes
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 260;
  lfo.connect(lfoDepth).connect(filter.frequency);
  const breath = ctx.createOscillator();
  breath.frequency.value = 0.11;
  const breathDepth = ctx.createGain();
  breathDepth.gain.value = 0.018;
  breath.connect(breathDepth).connect(out.gain);
  lfo.start();
  breath.start();
  pad = { stop: () => [...voices, lfo, breath].forEach((o) => o.stop()) };
};

const fadeMaster = (to, seconds) => {
  if (!ctx) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(to, now + seconds);
};

const play = (fn) => {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  fn(ctx, master);
};

export const sound = {
  isOn: () => enabled,

  /** Turns the sound on or off. Must be called from a click or key press the first time. */
  set(on) {
    enabled = on;
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {
      /* private mode: the choice lasts for this visit only */
    }
    if (on) {
      if (!ensureContext()) {
        enabled = false;
      } else {
        void ctx.resume();
        startPad();
        fadeMaster(1, 1.2);
      }
    } else {
      fadeMaster(0, 0.4);
    }
    listeners.forEach((fn) => fn(enabled));
  },

  /** Whether the visitor chose sound on a previous visit (it still waits for a gesture to start). */
  wanted: readStored,

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  tick() {
    const now = performance.now();
    if (now - lastTick < 70) return;
    lastTick = now;
    play((c, out) => blip(c, out, 2400, 1800, 0.05, 0.035));
  },

  click() {
    play((c, out) => blip(c, out, 620, 240, 0.12, 0.08, 'triangle'));
  },

  /** Filtered noise sweeping down: the page changing. */
  whoosh() {
    play((c, out) => whoosh(c, out));
  },
};

import { useRef } from 'react';
import ShaderCanvas from '../../../shared/fx/ShaderCanvas';

// A light that moves with the sound, behind the player: three soft pools of colour (the cover's, a violet and the tab's
// ember) that flow into each other like oil on water. The bass swells them, the middle of the sound stirs them, the high end
// makes them shimmer. Where the sound cannot be analysed (a phone keeps its audio off Web Audio so it plays with the screen
// locked), it flows slowly by itself while something is playing.

const FRAGMENT = `
uniform vec3 uTint;
uniform vec3 uSecond;
uniform vec3 uThird;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uFlow;

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  float t = uFlow;
  // the surface is pushed around by noise, more as the middle of the sound gets busy
  vec2 q = vec2(fbm(p * 1.6 + vec2(t * 0.12, -t * 0.08)), fbm(p * 1.6 + vec2(-t * 0.1, t * 0.14) + 4.0));
  vec2 w = p + (q - 0.5) * (0.6 + uMid * 0.9);
  vec2 c1 = vec2(sin(t * 0.21) * 0.45 * aspect, cos(t * 0.17) * 0.25 + 0.12);
  vec2 c2 = vec2(cos(t * 0.15 + 2.0) * 0.5 * aspect, sin(t * 0.19 + 1.0) * 0.3 - 0.1);
  vec2 c3 = vec2(sin(t * 0.13 + 4.0) * 0.35 * aspect, cos(t * 0.23 + 3.0) * 0.28);
  float r = 0.32 + uBass * 0.22;
  float a1 = exp(-dot(w - c1, w - c1) / (r * r));
  float a2 = exp(-dot(w - c2, w - c2) / (r * r * 0.9));
  float a3 = exp(-dot(w - c3, w - c3) / (r * r * 0.6)) * 0.8;
  vec3 col = uTint * a1 + uSecond * a2 + uThird * a3;
  // the high end: a fine shimmer on the brightest parts
  float sparkle = noise(p * 40.0 + t * 3.0) * uHigh * 0.35;
  col += col * sparkle;
  float alpha = clamp((a1 + a2 + a3) * (0.42 + uBass * 0.35), 0.0, 0.85);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

const band = (data, from, to) => {
  let sum = 0;
  for (let i = from; i < to; i += 1) sum += data[i];
  return sum / ((to - from) * 255);
};

/**
 * The aura. `tint` is the cover's colour as "r g b" (0..255, as the player passes it around), `playing` whether there is
 * sound, `analyser()` the Web Audio analyser when there is one (or null).
 */
export default function SoundAura({ tint = '255 91 46', playing, analyser, className = '' }) {
  const level = useRef({ bass: 0, mid: 0, high: 0, flow: 0, data: null });
  const rgb = tint.split(/\s+/).map((v) => Number(v) / 255);
  const uniforms = (_, dt) => {
    const l = level.current;
    const node = playing ? analyser?.() : null;
    let bass = 0;
    let mid = 0;
    let high = 0;
    if (node) {
      if (!l.data || l.data.length !== node.frequencyBinCount) l.data = new Uint8Array(node.frequencyBinCount);
      node.getByteFrequencyData(l.data);
      const n = l.data.length;
      bass = band(l.data, 0, Math.max(2, Math.floor(n * 0.08)));
      mid = band(l.data, Math.floor(n * 0.08), Math.floor(n * 0.4));
      high = band(l.data, Math.floor(n * 0.4), n);
    } else if (playing) {
      // no analyser: a slow, steady breath instead
      const t = performance.now() / 1000;
      bass = 0.35 + Math.sin(t * 1.7) * 0.12;
      mid = 0.3 + Math.sin(t * 0.9 + 1) * 0.1;
      high = 0.15;
    }
    const k = Math.min(1, dt * 10);
    l.bass += (bass - l.bass) * k;
    l.mid += (mid - l.mid) * k * 0.6;
    l.high += (high - l.high) * k;
    l.flow += dt * (0.25 + l.mid * 1.4);
    return { uTint: rgb, uSecond: [0.54, 0.23, 1], uThird: [1, 0.36, 0.18], uBass: l.bass, uMid: l.mid, uHigh: l.high, uFlow: l.flow };
  };
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      <ShaderCanvas fragment={FRAGMENT} uniforms={uniforms} running={playing} fps={45} scale={0.5} />
    </div>
  );
}

import { useEffect, useRef } from 'react';
import ShaderCanvas from '../../../shared/fx/ShaderCanvas';

// Hank's face as a drop of something molten: a round blob whose edge ripples with noise and burns (a rim of ember going to
// violet), with a soft highlight and a dark side, like the CSS orb it replaces. While Hank thinks it churns faster and
// wider; when an answer comes in, a wave runs out from its middle. The ripple slows to a crawl when nothing is happening.

const FRAGMENT = `
uniform float uBusy;
uniform float uPulse;
uniform float uPhase;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float a = atan(p.y, p.x);
  float d = length(p);
  float t = uPhase;
  float wobble = noise(vec2(cos(a) * 1.6 + t, sin(a) * 1.6 - t * 0.7)) - 0.5;
  wobble += (noise(vec2(cos(a) * 3.4 - t * 1.3, sin(a) * 3.4 + t)) - 0.5) * 0.5;
  float r = 0.7 + wobble * (0.1 + uBusy * 0.14) + uPulse * 0.08 * sin(d * 18.0 - uPulse * 10.0);
  float inside = smoothstep(r + 0.015, r - 0.015, d);
  // the body: a hot highlight up and to the left, ember, then violet into a deep shadow
  vec2 lightAt = vec2(-0.32, 0.36);
  float l = length(p - lightAt) / 1.3;
  float swirl = fbm(p * 2.2 + vec2(t * 0.6, -t * 0.4));
  vec3 hot = vec3(1.0, 0.84, 0.74);
  vec3 ember = vec3(1.0, 0.48, 0.3);
  vec3 violet = vec3(0.54, 0.23, 1.0);
  vec3 deep = vec3(0.17, 0.1, 0.4);
  vec3 col = mix(hot, ember, smoothstep(0.0, 0.38, l + swirl * 0.18));
  col = mix(col, violet, smoothstep(0.32, 0.78, l + swirl * 0.22));
  col = mix(col, deep, smoothstep(0.7, 1.05, l));
  // the burning edge: a thin bright rim just inside the surface, flickering with the noise
  float rim = smoothstep(0.1, 0.0, abs(d - r + 0.03)) * (0.55 + 0.45 * noise(vec2(a * 4.0, t * 3.0)));
  col += vec3(1.0, 0.5, 0.22) * rim * (0.6 + uBusy * 0.6);
  // a glow round it, stronger while it thinks
  // it fades to nothing before the edge of the canvas, so no square shows round it
  float glow = exp(-max(0.0, d - r) * 9.0) * (0.3 + uBusy * 0.25 + uPulse * 0.35) * (1.0 - inside) * smoothstep(0.98, 0.78, d);
  vec3 outColor = col * inside + vec3(1.0, 0.38, 0.2) * glow;
  gl_FragColor = vec4(outColor, clamp(inside + glow, 0.0, 1.0));
}`;

/**
 * The orb at `size` px. `busy` while Hank is thinking; `answers` is how many answers there are (a new one sends a wave). Where
 * a shader cannot run, `fallback` (the CSS orb) is shown.
 */
export default function LiquidOrb({ size, busy, answers = 0, fallback }) {
  const state = useRef({ phase: 0, busy: 0, pulse: 0 });
  const seen = useRef(answers);
  useEffect(() => {
    if (answers > seen.current) state.current.pulse = 1;
    seen.current = answers;
  }, [answers]);
  const uniforms = (_, dt) => {
    const s = state.current;
    s.busy += ((busy ? 1 : 0) - s.busy) * Math.min(1, dt * 3);
    s.pulse = Math.max(0, s.pulse - dt * 0.9);
    s.phase += dt * (0.25 + s.busy * 1.1 + s.pulse);
    return { uBusy: s.busy, uPulse: s.pulse, uPhase: s.phase };
  };
  // the glow runs past the drop, so the canvas is larger than the orb it stands for
  const box = size * 1.5;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} aria-hidden="true">
      <span className="pointer-events-none absolute" style={{ width: box, height: box, left: (size - box) / 2, top: (size - box) / 2 }}>
        <ShaderCanvas fragment={FRAGMENT} uniforms={uniforms} fps={busy ? 60 : 30} fallback={<span className="absolute inset-0 grid place-items-center">{fallback}</span>} />
      </span>
    </span>
  );
}

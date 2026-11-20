import { useEffect, useRef, useState } from 'react';
import ShaderCanvas from '../../../shared/fx/ShaderCanvas';
import { toRgb } from '../../../shared/fx/shader';

// A picture developing: laid over it, a veil the colour of the panel burns away in patches of noise, with a glowing edge
// where it is burning, until the whole picture is there. Mount it keyed by the picture; it takes itself away when done.

const FRAGMENT = `
uniform float uProgress;
uniform vec3 uVeil;
uniform vec3 uEdge;
void main() {
  vec2 p = vUv * vec2(uRes.x / uRes.y, 1.0) * 3.0;
  float n = fbm(p) * 0.75 + noise(p * 6.0) * 0.25;
  // the threshold sweeps past the noise, from its lowest to its highest values
  float cut = uProgress * 1.3 - 0.15;
  float gone = smoothstep(cut - 0.02, cut + 0.02, n);
  float edge = smoothstep(0.09, 0.0, abs(n - cut)) * (1.0 - smoothstep(0.92, 1.0, uProgress));
  vec3 col = uVeil * gone + uEdge * edge * 1.4;
  float a = clamp(gone + edge, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a);
}`;

const DURATION = 1400;

export default function Develop() {
  const [done, setDone] = useState(false);
  const start = useRef(0);
  const colors = useRef(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), DURATION + 100);
    return () => window.clearTimeout(timer);
  }, []);
  if (done) return null;
  const uniforms = () => {
    if (!colors.current) {
      const css = getComputedStyle(document.documentElement);
      colors.current = { veil: toRgb(css.getPropertyValue('--color-ink-1').trim() || '#121317'), edge: toRgb(css.getPropertyValue('--color-signal').trim() || '#ff5b2e') };
    }
    if (!start.current) start.current = performance.now();
    const t = Math.min(1, (performance.now() - start.current) / DURATION);
    return { uProgress: 1 - (1 - t) ** 2, uVeil: colors.current.veil, uEdge: colors.current.edge };
  };
  return <ShaderCanvas fragment={FRAGMENT} uniforms={uniforms} scale={0.6} className="z-[1]" />;
}

/** The filter that turns a picture to rippling water under the pointer (applied by the .liquid-hover class). Render it once. */
export function LiquidFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
      <filter id="liquid-ripple" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="3" result="noise">
          <animate attributeName="baseFrequency" dur="6s" values="0.012 0.02;0.018 0.012;0.012 0.02" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

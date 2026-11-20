import { useEffect, useMemo, useRef } from 'react';
import ShaderCanvas from '../../../shared/fx/ShaderCanvas';
import { finePointer } from '../../../shared/fx/gate';
import { toRgb } from '../../../shared/fx/shader';

// The home screen's sky, computed per pixel: two layers of cloud made of noise that drift with the wind (as many as the
// weather says: a few wisps on a clear day, a lid of grey when it is overcast), lit by the colour of the horizon and shaded by
// the top of the sky; rain as slanting streaks, snow as flakes that sway down; and all of it leaning a little with the pointer.
// It is drawn over the CSS sky (the gradient, the sun or moon, the stars and the ridges stay); the CSS clouds and rain step
// aside while it runs.

const FRAGMENT = `
uniform float uCover;
uniform float uDay;
uniform vec3 uLight;
uniform vec3 uShade;
uniform float uRain;
uniform float uSnow;
uniform vec2 uPointer;

float rain(vec2 uv, float aspect) {
  vec2 q = vec2((uv.x + uv.y * 0.14) * aspect * 70.0, uv.y);
  float col = floor(q.x);
  float h = hash(vec2(col, 3.1));
  float y = fract(q.y * 2.4 + uTime * (1.3 + h) + h * 10.0);
  float x = abs(fract(q.x) - 0.5);
  return step(1.0 - uRain * 0.55, h) * smoothstep(0.1, 0.0, x) * smoothstep(0.0, 0.04, y) * smoothstep(0.3, 0.04, y);
}

float snow(vec2 uv, float aspect) {
  float s = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float scale = 9.0 + fi * 7.0;
    vec2 q = vec2(uv.x * aspect, uv.y) * scale;
    q.y += uTime * (0.5 + fi * 0.25);
    q.x += sin(uTime * 0.6 + q.y * 0.45 + fi * 2.0) * 0.35;
    vec2 id = floor(q);
    vec2 f = fract(q) - 0.5;
    vec2 o = vec2(hash(id + 3.0), hash(id + 7.0)) - 0.5;
    float d = length(f - o * 0.6);
    s += step(0.62, hash(id + fi)) * smoothstep(0.09 - fi * 0.02, 0.0, d) * (0.6 + fi * 0.2);
  }
  return s;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y) + uPointer * vec2(0.04, 0.02);
  float t = uTime * 0.018;
  float n = fbm(p * vec2(1.6, 3.2) + vec2(t * 1.6, 0.0));
  float n2 = fbm(p * vec2(3.4, 6.0) + vec2(t * 3.0, t * 0.4) + n * 1.4);
  float shape = n * 0.65 + n2 * 0.5;
  float edge = 1.05 - uCover * 0.75;
  float cloud = smoothstep(edge - 0.18, edge + 0.22, shape);
  // the clouds thin out toward the horizon, where the ridges stand
  cloud *= smoothstep(0.12, 0.5, uv.y);
  vec3 color = mix(uShade, uLight, smoothstep(0.3, 0.9, n2 + (1.0 - uv.y) * 0.25));
  float alpha = cloud * (0.32 + 0.5 * uDay) * (0.55 + uCover * 0.45);
  vec3 outColor = color * alpha;
  float r = uRain > 0.0 ? rain(uv + uPointer * 0.01, aspect) * 0.38 : 0.0;
  float s = uSnow > 0.0 ? snow(uv + uPointer * 0.015, aspect) * 0.85 : 0.0;
  float drop = clamp(r + s, 0.0, 1.0);
  outColor = outColor * (1.0 - drop) + vec3(0.92, 0.95, 1.0) * drop;
  gl_FragColor = vec4(outColor, clamp(alpha + drop, 0.0, 1.0));
}`;

const WET = { drizzle: 0.35, rain: 0.7, storm: 1 };

/** Draws the sky's clouds and weather. `sky` is today/sky.js's sky of the hour; `kind` the weather's condition. */
export default function SkyShader({ sky, kind, onReady }) {
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const colors = useMemo(() => {
    const low = toRgb(sky.low);
    const top = toRgb(sky.top);
    // clouds are lit by the horizon's light (paler) and shaded by the top of the sky (greyer when it is overcast)
    const light = low.map((c) => c * 0.45 + 0.55 * (1 - sky.grey * 0.35));
    const shade = top.map((c, i) => c * 0.7 + (low[i] * 0.3) * (1 - sky.grey) + 0.25 * sky.grey);
    return { light, shade };
  }, [sky.low, sky.top, sky.grey]);

  useEffect(() => {
    if (!finePointer()) return undefined;
    const onMove = (event) => {
      pointer.current.tx = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.ty = (event.clientY / window.innerHeight - 0.5) * -2;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const uniforms = (_, dt) => {
    const p = pointer.current;
    p.x += (p.tx - p.x) * Math.min(1, dt * 2.5);
    p.y += (p.ty - p.y) * Math.min(1, dt * 2.5);
    return {
      // even a clear day has a few wisps drifting by
      uCover: Math.max(0.12, sky.grey),
      uDay: 1 - sky.stars,
      uLight: colors.light,
      uShade: colors.shade,
      uRain: WET[kind] ?? 0,
      uSnow: kind === 'snow' ? 1 : 0,
      uPointer: [p.x, p.y],
    };
  };

  return <ShaderCanvas fragment={FRAGMENT} uniforms={uniforms} fps={30} scale={0.6} onReady={onReady} />;
}

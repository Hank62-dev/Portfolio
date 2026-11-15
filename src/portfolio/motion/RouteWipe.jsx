import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap, prefersReducedMotion } from './gsap';
import { sound } from './sound';

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// The accent colour covers the screen and burns away: noise decides which part goes first, biased so
// the burn climbs from the bottom, with a hot bone-coloured rim on the edge that is going.
const FRAGMENT = `
precision mediump float;
uniform vec2 uRes;
uniform float uProgress;
uniform float uSeed;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 3.0 + uSeed;
  float n = fbm(p + fbm(p * 0.7) * 1.2);
  float field = n * 0.55 + uv.y * 0.45;            // 0..1, low at the bottom: that is where it burns first
  float edge = uProgress * 1.25 - 0.12;            // sweeps past both ends so the screen ends fully clear
  float cover = smoothstep(edge - 0.015, edge + 0.015, field);
  float rim = smoothstep(edge - 0.06, edge, field) - smoothstep(edge, edge + 0.05, field);
  vec3 signal = vec3(1.0, 0.357, 0.18);
  vec3 bone = vec3(0.925, 0.902, 0.855);
  vec3 color = mix(signal, bone, clamp(rim * 1.4, 0.0, 1.0));
  float alpha = clamp(cover + rim, 0.0, 1.0);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

/** A full-screen canvas that draws the burn at a given progress, or null when WebGL is not there. */
const createBurn = (canvas) => {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(program, 'uRes');
  const uProgress = gl.getUniformLocation(program, 'uProgress');
  const uSeed = gl.getUniformLocation(program, 'uSeed');

  return {
    draw(progress, seed) {
      const scale = 0.5; // the edge is soft anyway: half the pixels is plenty
      const w = Math.max(1, Math.floor(window.innerWidth * scale));
      const h = Math.max(1, Math.floor(window.innerHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uProgress, progress);
      gl.uniform1f(uSeed, seed);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
};

/**
 * Covers the screen as the new route renders, then burns away from the bottom up (WebGL), or peels away
 * as a plain curtain where WebGL is missing. Runs on route changes only, not on first load (the intro
 * handles that), and never with reduced motion.
 */
export default function RouteWipe() {
  const { pathname } = useLocation();
  const curtain = useRef(null);
  const canvas = useRef(null);
  const burn = useRef(undefined); // undefined: not tried yet; null: no WebGL
  const first = useRef(true);

  useEffect(() => () => burn.current?.dispose(), []);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }
    if (prefersReducedMotion()) return undefined;
    sound.whoosh();

    if (burn.current === undefined) burn.current = createBurn(canvas.current);
    const fx = burn.current;
    if (fx) {
      const el = canvas.current;
      const state = { p: 0 };
      const seed = Math.random() * 40;
      fx.draw(0, seed); // fully covered before the first paint of the new page
      el.style.visibility = 'visible';
      // The new page's first frames are heavy (its effects, its scenes): start the clock only once two
      // frames have gone by, or the whole burn would be spent inside one long frame and never be seen.
      let tween = null;
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          tween = gsap.to(state, {
            p: 1,
            duration: 1.1,
            ease: 'power2.inOut',
            onUpdate: () => fx.draw(state.p, seed),
            onComplete: () => {
              el.style.visibility = 'hidden';
            },
          });
        });
      });
      return () => {
        cancelAnimationFrame(raf);
        tween?.kill();
        el.style.visibility = 'hidden';
      };
    }

    const el = curtain.current;
    gsap.set(el, { scaleY: 1, transformOrigin: 'top' });
    const tween = gsap.to(el, { scaleY: 0, transformOrigin: 'bottom', duration: 0.9, ease: 'expo.inOut', delay: 0.05 });
    return () => tween.kill();
  }, [pathname]);

  return (
    <>
      <canvas ref={canvas} className="pointer-events-none invisible fixed inset-0 z-[95] size-full" aria-hidden="true" />
      <div ref={curtain} className="pointer-events-none fixed inset-0 z-[95] origin-top scale-y-0 bg-signal" aria-hidden="true" />
    </>
  );
}

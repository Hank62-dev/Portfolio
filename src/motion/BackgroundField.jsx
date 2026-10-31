import { useCallback, useEffect, useRef, useState } from 'react';
import { can3D, readEnvironment } from '../lib/capabilities';
import { useTheme } from '../lib/theme';
import { motionStore } from './store';

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Domain-warped fractal noise: slow, liquid, warm smoke. Scroll speed and the pointer lift the glow.
// Every edge pair passed to smoothstep() is ascending (the GLSL spec leaves edge0 >= edge1 undefined,
// and some GPUs turn that into garbage), and the output is clamped so it can never blow out to white.
const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uVel;
uniform float uProgress;
uniform float uLight;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 1.7;
  float t = uTime * 0.045;

  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + uProgress * 2.0), fbm(p + 3.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 3.0 * r);

  vec2 m = vec2(uMouse.x * aspect, 1.0 - uMouse.y);
  float glow = 1.0 - smoothstep(0.0, 0.55, distance(uv * vec2(aspect, 1.0), m));

  float vel = clamp(uVel, 0.0, 12.0);
  float heat = smoothstep(0.5, 0.95, f) * (0.075 + vel * 0.02) + glow * 0.07;
  heat = clamp(heat, 0.0, 0.3);
  float sheen = smoothstep(0.72, 1.0, f) * 0.018;

  // night: ink with embers; day: paper warmed by the same shapes
  vec3 night = vec3(0.043, 0.047, 0.055) + vec3(1.0, 0.357, 0.18) * heat + vec3(0.925, 0.902, 0.855) * sheen;
  vec3 day = mix(vec3(0.957, 0.941, 0.910), vec3(1.0, 0.74, 0.6), heat * 1.7) - vec3(0.02) * sheen * 10.0;

  gl_FragColor = vec4(clamp(mix(night, day, uLight), 0.0, 1.0), 1.0);
}
`;

const compile = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

const SCALE = 0.5;

/**
 * The centre pixel must be roughly the background colour for the current theme. If a GPU or driver
 * renders something wildly different (NaN, blown-out white), the shader is dropped and the plain
 * theme background shows instead: a decorative layer must never be able to hide the page.
 */
export const looksSane = (pixel, light) => {
  const [r, g, b] = pixel;
  return light ? r > 170 && g > 160 && b > 140 : r < 110 && g < 110 && b < 110;
};

/** Draws the shader on a fixed canvas behind the page at a quarter of the pixels, at ~30fps. */
function Field({ light, onFail }) {
  const canvasRef = useRef(null);
  const lightTarget = useRef(light ? 1 : 0);
  lightTarget.current = light ? 1 : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) {
      onFail();
      return undefined;
    }

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      onFail();
      return undefined;
    }
    gl.useProgram(program);

    // One oversized triangle covers the screen.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = Object.fromEntries(
      ['uRes', 'uTime', 'uMouse', 'uVel', 'uProgress', 'uLight'].map((name) => [name, gl.getUniformLocation(program, name)])
    );

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * SCALE));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let frame = 0;
    let mouseX = 0.5;
    let mouseY = 0.5;
    let lightNow = lightTarget.current;
    let checked = false;
    const start = performance.now();
    const pixel = new Uint8Array(4);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      frame += 1;
      if (frame % 2 || document.hidden) return;
      mouseX += (motionStore.pointerX - mouseX) * 0.06;
      mouseY += (motionStore.pointerY - mouseY) * 0.06;
      lightNow += (lightTarget.current - lightNow) * 0.1; // the theme switch fades rather than snaps
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, (performance.now() - start) / 1000);
      gl.uniform2f(u.uMouse, mouseX, mouseY);
      gl.uniform1f(u.uVel, Math.abs(motionStore.velocity));
      gl.uniform1f(u.uProgress, motionStore.progress);
      gl.uniform1f(u.uLight, lightNow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!checked && frame > 6 && Math.abs(lightNow - lightTarget.current) < 0.01) {
        checked = true;
        gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        if (!looksSane(pixel, lightTarget.current === 1)) {
          cancelAnimationFrame(raf);
          onFail();
        }
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [onFail]);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 -z-10 size-full bg-ink-0" aria-hidden="true" />;
}

/** Mounted only where the hero's 3D would also run (see lib/capabilities.js). */
export default function BackgroundField() {
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  useEffect(() => setEnabled(can3D(readEnvironment())), []);
  return enabled && !failed ? <Field light={theme === 'light'} onFail={fail} /> : null;
}

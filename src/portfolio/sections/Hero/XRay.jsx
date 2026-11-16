import { useEffect, useRef } from 'react';
import { useTheme } from '../../../shared/lib/theme';
import { FINE_POINTER, MOTION } from '../../motion/gsap';
// the code that moves the hero: what the X-ray shows under the page
import source from './useHeroMotion.js?raw';

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Metaballs: each point of the pointer's recent path is a blob, their fields add up, and wherever the sum
// passes 1 the page turns to code. Near the edge the code bends like it is seen through a lens, and the
// edge itself burns in the accent colour.
const FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uCode;
uniform vec2 uRes;
uniform vec3 uBlobs[BLOBS];
uniform vec3 uSignal;
uniform float uTime;

void main() {
  vec2 p = vUv * uRes;
  float field = 0.0;
  for (int i = 0; i < BLOBS; i++) {
    vec3 b = uBlobs[i];
    vec2 d = p - b.xy;
    field += (b.z * b.z) / (dot(d, d) + 1.0);
  }
  float inside = smoothstep(0.96, 1.04, field);
  if (inside <= 0.001 && field < 0.7) discard;
  float rim = smoothstep(0.72, 0.98, field) * (1.0 - smoothstep(1.0, 1.5, field));
  // the lens: near the rim the code is pulled toward the inside
  float lens = (1.0 - smoothstep(1.0, 2.4, field)) * 0.012;
  vec2 uv = vUv + vec2(sin(vUv.y * 40.0 + uTime * 2.0), cos(vUv.x * 40.0 - uTime * 2.0)) * lens;
  vec4 code = texture2D(uCode, uv);
  vec3 wash = uSignal * 0.08;
  vec3 color = wash + code.rgb;
  float alpha = inside * (0.86 + code.a * 0.14);
  color = mix(color, uSignal, rim * 0.9);
  alpha = max(alpha, rim * 0.85);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

const BLOBS = 14;

const KEYWORDS = /\b(import|from|export|default|const|let|return|if|else|map|filter|new|function|async|await|true|false|null|undefined)\b/g;

/** Paints the source onto a canvas in columns, coloured like an editor: keywords, strings, comments. */
const paintCode = (w, h, dpr, colors) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.fillStyle = colors.ink;
  ctx.fillRect(0, 0, w, h);
  const size = w > 1400 ? 13 : 12;
  const line = size * 1.6;
  ctx.font = `${size}px ${colors.mono}`;
  ctx.textBaseline = 'top';
  const lines = source.split('\n');
  const colWidth = 640;
  const cols = Math.max(1, Math.ceil(w / colWidth));
  let n = 0;
  for (let col = 0; col < cols; col += 1) {
    for (let y = 16; y < h; y += line) {
      const text = lines[n % lines.length].replace(/\t/g, '  ');
      const x0 = 24 + col * colWidth;
      ctx.fillStyle = colors.faint;
      ctx.fillText(String((n % lines.length) + 1).padStart(3, ' '), x0, y);
      // one pass for the plain text, then the keywords, strings and comments painted over it
      const x = x0 + size * 3;
      const trimmed = text.trimStart();
      if (trimmed.startsWith('//') || trimmed.startsWith('{/*') || trimmed.startsWith('*')) {
        ctx.fillStyle = colors.faint;
        ctx.fillText(text, x, y);
      } else {
        ctx.fillStyle = colors.dim;
        ctx.fillText(text, x, y);
        const paint = (re, color) => {
          ctx.fillStyle = color;
          for (const m of text.matchAll(re)) ctx.fillText(m[0], x + ctx.measureText(text.slice(0, m.index)).width, y);
        };
        paint(KEYWORDS, colors.signal);
        paint(/(['"`])(?:(?!\1).)*\1/g, colors.ok);
        paint(/<\/?[A-Za-z][\w.]*/g, colors.bone);
      }
      n += 1;
    }
  }
  return canvas;
};

const token = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
const toVec = (hex) => {
  const h = hex.replace('#', '');
  return h.length === 6 ? [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) : [1, 0.36, 0.18];
};

/**
 * X-ray: under the pointer, the hero turns into the code it is made of, through a liquid blob that trails
 * the pointer and swells with its speed. A mouse-only flourish over the hero (never with reduced motion).
 */
export default function XRay({ sectionRef }) {
  const host = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!window.matchMedia(`${MOTION} and ${FINE_POINTER}`).matches) return undefined;
    const section = sectionRef.current;
    if (!section || !host.current) return undefined;
    // a canvas of its own each time: a context that was let go cannot be had again from the same element
    const el = document.createElement('canvas');
    el.className = 'size-full';
    const gl = el.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return undefined;
    host.current.appendChild(el);
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `#define BLOBS ${BLOBS}\n${FRAGMENT}`));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const u = Object.fromEntries(['uCode', 'uRes', 'uBlobs', 'uSignal', 'uTime'].map((k) => [k, gl.getUniformLocation(program, k)]));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    const colors = {
      ink: token('--color-ink-1', '#101114'),
      bone: token('--color-bone', '#ece6da'),
      dim: token('--color-bone-dim', '#a8a396'),
      faint: token('--color-bone-faint', '#8f8b7f'),
      signal: token('--color-signal', '#ff5b2e'),
      ok: token('--color-ok', '#7fd6a2'),
      mono: token('--font-mono', 'monospace'),
    };
    gl.uniform3fv(u.uSignal, toVec(colors.signal));

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      const r = section.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      el.width = Math.max(1, Math.round(w * dpr));
      el.height = Math.max(1, Math.round(h * dpr));
      gl.viewport(0, 0, el.width, el.height);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paintCode(w, h, dpr, colors));
    };
    resize();
    document.fonts?.ready.then(resize);
    const ro = new ResizeObserver(resize);
    ro.observe(section);

    // the trail: newest point first; each point's radius shrinks as it ages
    const blobs = new Float32Array(BLOBS * 3);
    const pointer = { x: -999, y: -999, inside: false, speed: 0 };
    let last = { x: -999, y: -999 };
    let raf = 0;
    let running = false;
    let time = 0;
    let prev = performance.now();

    const frame = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      time += dt;
      // shift the trail along when the pointer has moved
      const moved = Math.hypot(pointer.x - last.x, pointer.y - last.y);
      pointer.speed += (Math.min(60, moved) - pointer.speed) * 0.2;
      if (moved > 2 && pointer.inside) {
        blobs.copyWithin(3, 0, (BLOBS - 1) * 3);
        last = { x: pointer.x, y: pointer.y };
      }
      const head = pointer.inside ? 56 + pointer.speed * 1.6 : 0;
      blobs[0] = pointer.x * dpr;
      blobs[1] = (h - pointer.y) * dpr;
      blobs[2] += (head * dpr - blobs[2]) * 0.18;
      let alive = blobs[2] > 0.5;
      for (let i = 1; i < BLOBS; i += 1) {
        blobs[i * 3 + 2] *= 0.9;
        if (blobs[i * 3 + 2] > 0.5) alive = true;
      }
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1i(u.uCode, 0);
      gl.uniform2f(u.uRes, el.width, el.height);
      gl.uniform3fv(u.uBlobs, blobs);
      gl.uniform1f(u.uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (alive || pointer.inside) raf = requestAnimationFrame(frame);
      else running = false;
    };
    const wake = () => {
      if (running) return;
      running = true;
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e) => {
      const r = section.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      if (!pointer.inside) {
        last = { x: pointer.x, y: pointer.y };
        for (let i = 0; i < BLOBS; i += 1) {
          blobs[i * 3] = pointer.x * dpr;
          blobs[i * 3 + 1] = (h - pointer.y) * dpr;
        }
      }
      pointer.inside = true;
      wake();
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    section.addEventListener('pointermove', onMove);
    section.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      section.removeEventListener('pointermove', onMove);
      section.removeEventListener('pointerleave', onLeave);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      el.remove();
    };
  }, [sectionRef, theme]);

  return <div ref={host} className="pointer-events-none absolute inset-0 max-lg:hidden" aria-hidden="true" />;
}

import { forwardRef, useEffect, useRef } from 'react';
import { FINE_POINTER, MOTION, gsap } from './gsap';

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// The picture as a surface of water: rings run out from the pointer, the surface bulges toward it and
// stretches along its movement, and the colour channels part a little where it moves fastest.
const FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform vec2 uCover;      // how much of the picture shows on each axis (object-fit: cover)
uniform vec2 uAnchor;     // object-position, 0..1
uniform vec2 uPointer;    // 0..1, origin bottom-left
uniform vec2 uVelocity;   // the pointer's recent movement, in the box's units
uniform float uHover;     // 0..1
uniform float uTime;
uniform float uAspect;

vec2 cover(vec2 uv) { return uAnchor * (1.0 - uCover) + uv * uCover; }

void main() {
  vec2 uv = vUv;
  vec2 d = (uv - uPointer) * vec2(uAspect, 1.0);
  float dist = length(d);
  // bulge: the surface swells toward the pointer
  uv -= (uv - uPointer) * 0.08 * uHover * exp(-dist * 3.5);
  // rings
  float ring = sin(dist * 34.0 - uTime * 7.0) * exp(-dist * 4.5) * 0.008 * uHover;
  uv += normalize(d + 0.0001) / vec2(uAspect, 1.0) * ring;
  // drag: the picture is pulled along with the pointer near it
  uv -= uVelocity * exp(-dist * 5.0) * 0.6 * uHover;
  float split = length(uVelocity) * 1.6 * uHover + ring * 0.4;
  vec2 dir = normalize(uVelocity + 0.0001) * split;
  vec2 c = cover(clamp(uv, 0.0, 1.0));
  float r = texture2D(uImage, cover(clamp(uv + dir, 0.0, 1.0))).r;
  vec4 g = texture2D(uImage, c);
  float b = texture2D(uImage, cover(clamp(uv - dir, 0.0, 1.0))).b;
  // a warm light where the pointer is
  vec3 color = vec3(r, g.g, b) + vec3(1.0, 0.36, 0.18) * exp(-dist * 6.0) * 0.12 * uHover;
  gl_FragColor = vec4(color, 1.0);
}
`;

const parsePosition = (value) => {
  const [x = '50%', y = '50%'] = value.split(' ');
  const num = (v) => (v === 'left' || v === 'top' ? 0 : v === 'right' || v === 'bottom' ? 1 : v === 'center' ? 0.5 : parseFloat(v) / 100);
  return [num(x), num(y)];
};

/**
 * Starts the liquid on `img` while the pointer is over `host`. A WebGL canvas is laid over the picture
 * only for as long as it is needed (one context at a time, dropped a moment after the pointer leaves),
 * so a page full of pictures costs nothing until one is touched.
 */
const attach = (img, host) => {
  let canvas = null;
  let gl = null;
  let u = null;
  let raf = 0;
  let removeTimer = 0;
  const state = { hover: 0, x: 0.5, y: 0.5, vx: 0, vy: 0, lx: 0.5, ly: 0.5, t: 0 };
  let tween = null;

  const setup = () => {
    if (canvas) return true;
    if (!img.complete || !img.naturalWidth) return false;
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'pointer-events-none absolute inset-0 size-full';
    gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) {
      canvas = null;
      return false;
    }
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
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas = null;
      return false;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    u = Object.fromEntries(['uImage', 'uCover', 'uAnchor', 'uPointer', 'uVelocity', 'uHover', 'uTime', 'uAspect'].map((k) => [k, gl.getUniformLocation(program, k)]));
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    } catch {
      canvas = null;
      return false;
    }
    img.insertAdjacentElement('afterend', canvas);
    return true;
  };

  const frame = () => {
    raf = 0;
    if (!canvas) return;
    const w = img.clientWidth;
    const h = img.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    const boxAspect = w / h;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const coverX = boxAspect < imgAspect ? boxAspect / imgAspect : 1;
    const coverY = boxAspect < imgAspect ? 1 : imgAspect / boxAspect;
    const [ax, ay] = parsePosition(getComputedStyle(img).objectPosition);
    state.t += 1 / 60;
    state.vx += (state.x - state.lx - state.vx) * 0.2;
    state.vy += (state.y - state.ly - state.vy) * 0.2;
    state.lx = state.x;
    state.ly = state.y;
    gl.uniform1i(u.uImage, 0);
    gl.uniform2f(u.uCover, coverX, coverY);
    gl.uniform2f(u.uAnchor, ax, 1 - ay);
    gl.uniform2f(u.uPointer, state.x, state.y);
    gl.uniform2f(u.uVelocity, state.vx, state.vy);
    gl.uniform1f(u.uHover, state.hover);
    gl.uniform1f(u.uTime, state.t);
    gl.uniform1f(u.uAspect, boxAspect);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (state.hover > 0.001) raf = requestAnimationFrame(frame);
  };

  const remove = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    canvas?.remove();
    canvas = null;
    gl = null;
  };

  const onMove = (e) => {
    const r = img.getBoundingClientRect();
    state.x = (e.clientX - r.left) / r.width;
    state.y = 1 - (e.clientY - r.top) / r.height;
  };
  const onEnter = (e) => {
    clearTimeout(removeTimer);
    onMove(e);
    state.lx = state.x;
    state.ly = state.y;
    if (!setup()) return;
    tween?.kill();
    tween = gsap.to(state, { hover: 1, duration: 0.9, ease: 'power3.out' });
    if (!raf) raf = requestAnimationFrame(frame);
  };
  const onLeave = () => {
    tween?.kill();
    tween = gsap.to(state, { hover: 0, duration: 0.7, ease: 'power3.out', onComplete: () => (removeTimer = setTimeout(remove, 400)) });
  };

  host.addEventListener('pointerenter', onEnter);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerleave', onLeave);
  return () => {
    clearTimeout(removeTimer);
    tween?.kill();
    host.removeEventListener('pointerenter', onEnter);
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerleave', onLeave);
    remove();
  };
};

/**
 * An <img> that turns to liquid under the pointer (see attach). `hostSelector` names an ancestor that
 * should count as "over the picture" (a whole card, say); by default it is the picture's own box.
 * Without a mouse, or with reduced motion, it is a plain image. Its parent must be positioned.
 */
const LiquidImage = forwardRef(function LiquidImage({ hostSelector, ...props }, outer) {
  const ref = useRef(null);

  useEffect(() => {
    const img = ref.current;
    if (!img || !window.matchMedia(`${MOTION} and ${FINE_POINTER}`).matches) return undefined;
    const host = (hostSelector && img.closest(hostSelector)) || img.parentElement;
    return attach(img, host);
  }, [hostSelector]);

  return (
    <img
      {...props}
      ref={(node) => {
        ref.current = node;
        if (typeof outer === 'function') outer(node);
        else if (outer) outer.current = node;
      }}
    />
  );
});

export default LiquidImage;

// A canvas that is one fragment shader, drawn over the whole of it: the smallest WebGL there can be (one triangle that covers
// the screen, no library). Effects that are a picture computed per pixel (a sky, a blob, a glow under the music) use it.
// The shader gets `vUv` (0..1), `uRes` (pixels), `uTime` (seconds) and whatever uniforms the caller passes each frame.

const VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/** The head every fragment shader starts with, and a few helpers (hash, value noise, fbm) most of them need. */
export const GLSL_HEAD = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
`;

const setUniform = (gl, loc, value) => {
  if (loc == null) return;
  if (typeof value === 'number') gl.uniform1f(loc, value);
  else if (value.length === 2) gl.uniform2f(loc, value[0], value[1]);
  else if (value.length === 3) gl.uniform3f(loc, value[0], value[1], value[2]);
  else if (value.length === 4) gl.uniform4f(loc, value[0], value[1], value[2], value[3]);
};

/**
 * Sets a canvas up to draw `fragment` (written after GLSL_HEAD). Returns null where WebGL or the shader is not to be had, so
 * the caller keeps its plain look. `draw(uniforms, time)` paints one frame at the canvas's current size.
 */
export const createShader = (canvas, fragment, { alpha = true } = {}) => {
  const gl = canvas.getContext('webgl', { alpha, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
  if (!gl) return null;
  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      if (import.meta.env?.DEV) console.warn(gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, GLSL_HEAD + fragment);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, 'aPos');
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const locations = new Map();
  const at = (name) => {
    if (!locations.has(name)) locations.set(name, gl.getUniformLocation(program, name));
    return locations.get(name);
  };

  return {
    draw(uniforms = {}, time = 0) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      setUniform(gl, at('uRes'), [canvas.width, canvas.height]);
      setUniform(gl, at('uTime'), time);
      for (const [name, value] of Object.entries(uniforms)) setUniform(gl, at(name), value);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
};

/** '#ff5b2e', 'rgb(…)' or 'hsl(…)' as [r, g, b] in 0..1, read through the browser (so any CSS colour works). */
export const toRgb = (color) => {
  if (typeof document === 'undefined' || !color) return [1, 1, 1];
  const probe = document.createElement('canvas').getContext('2d');
  probe.fillStyle = '#000';
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
};

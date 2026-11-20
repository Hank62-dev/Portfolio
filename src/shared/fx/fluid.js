// A small real-time fluid (the stable-fluids method: advect, add swirl back, make it incompressible). It carries ink in one
// colour that spreads and curls where it is pushed and fades. Velocity runs at a coarse grid, the ink at a finer one.
// The portfolio's background ink, SpaceHank's voice memos and its ink brush are all this.

const BASE_VERTEX = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv; out vec2 vL; out vec2 vR; out vec2 vT; out vec2 vB;
uniform vec2 uTexel;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(uTexel.x, 0.0); vR = vUv + vec2(uTexel.x, 0.0);
  vT = vUv + vec2(0.0, uTexel.y); vB = vUv - vec2(0.0, uTexel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
out vec4 outColor;
`;

const SHADERS = {
  splat: `${HEAD}
uniform sampler2D uTarget; uniform float uAspect; uniform vec3 uColor; uniform vec2 uPoint; uniform float uRadius;
void main() {
  vec2 p = vUv - uPoint; p.x *= uAspect;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  outColor = vec4(texture(uTarget, vUv).xyz + splat, 1.0);
}`,
  advect: `${HEAD}
uniform sampler2D uVelocity; uniform sampler2D uSource; uniform vec2 uTexel; uniform float uDt; uniform float uDissipation;
void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexel;
  outColor = texture(uSource, coord) / (1.0 + uDissipation * uDt);
}`,
  curl: `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float l = texture(uVelocity, vL).y; float r = texture(uVelocity, vR).y;
  float t = texture(uVelocity, vT).x; float b = texture(uVelocity, vB).x;
  outColor = vec4(0.5 * (r - l - t + b), 0.0, 0.0, 1.0);
}`,
  vorticity: `${HEAD}
uniform sampler2D uVelocity; uniform sampler2D uCurl; uniform float uCurlAmount; uniform float uDt;
void main() {
  float l = texture(uCurl, vL).x; float r = texture(uCurl, vR).x;
  float t = texture(uCurl, vT).x; float b = texture(uCurl, vB).x;
  float c = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
  force /= length(force) + 0.0001;
  force *= uCurlAmount * c; force.y *= -1.0;
  vec2 v = texture(uVelocity, vUv).xy + force * uDt;
  outColor = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
}`,
  divergence: `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float l = texture(uVelocity, vL).x; float r = texture(uVelocity, vR).x;
  float t = texture(uVelocity, vT).y; float b = texture(uVelocity, vB).y;
  vec2 c = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) l = -c.x; if (vR.x > 1.0) r = -c.x;
  if (vT.y > 1.0) t = -c.y; if (vB.y < 0.0) b = -c.y;
  outColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
}`,
  clear: `${HEAD}
uniform sampler2D uTexture; uniform float uValue;
void main() { outColor = uValue * texture(uTexture, vUv); }`,
  pressure: `${HEAD}
uniform sampler2D uPressure; uniform sampler2D uDivergence;
void main() {
  float l = texture(uPressure, vL).x; float r = texture(uPressure, vR).x;
  float t = texture(uPressure, vT).x; float b = texture(uPressure, vB).x;
  float d = texture(uDivergence, vUv).x;
  outColor = vec4((l + r + b + t - d) * 0.25, 0.0, 0.0, 1.0);
}`,
  gradient: `${HEAD}
uniform sampler2D uPressure; uniform sampler2D uVelocity;
void main() {
  float l = texture(uPressure, vL).x; float r = texture(uPressure, vR).x;
  float t = texture(uPressure, vT).x; float b = texture(uPressure, vB).x;
  vec2 v = texture(uVelocity, vUv).xy - vec2(r - l, t - b);
  outColor = vec4(v, 0.0, 1.0);
}`,
  display: `${HEAD}
uniform sampler2D uDye; uniform vec3 uInk; uniform float uStrength; uniform float uMax;
void main() {
  vec3 d = texture(uDye, vUv).rgb;
  float a = clamp(max(d.r, max(d.g, d.b)) * uStrength, 0.0, uMax);
  // the hottest ink goes a little paler, like a flame's core
  vec3 color = mix(uInk, vec3(1.0, 0.86, 0.72), clamp(a * 1.4 - 0.35, 0.0, 0.5));
  outColor = vec4(color * a, a);
}`,
};

/**
 * A fluid on a canvas (WebGL 2 with float targets; null where that is not to be had). `splat(x, y, dx, dy, strength)` pushes
 * the fluid at a point (0..1, y up) and drops ink there, `step(dt)` moves it on, `display(strength)` draws the ink.
 * `ink` is the colour as [r, g, b] in 0..1 (it can be changed with `setInk`); `sim` and `dye` are the sizes of the velocity
 * and the ink grids (the short side), `curl` how much it swirls, `fade` how fast the ink goes, `radius` how wide a splat is.
 */
export const createFluid = (canvas, ink, { sim: SIM = 128, dye: DYE = 512, curl: CURL = 22, fade = 0.9, drag = 0.6, radius = 1, maxAlpha = 0.42 } = {}) => {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
  gl.getExtension('OES_texture_float_linear');

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vertex = compile(gl.VERTEX_SHADER, BASE_VERTEX);
  const programs = {};
  for (const [name, src] of Object.entries(SHADERS)) {
    const frag = compile(gl.FRAGMENT_SHADER, src);
    if (!vertex || !frag) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vertex);
    gl.attachShader(p, frag);
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    const uniforms = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i += 1) {
      const info = gl.getActiveUniform(p, i);
      uniforms[info.name] = gl.getUniformLocation(p, info.name);
    }
    programs[name] = { p, u: uniforms };
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const target = (w, h, internal, format) => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h };
  };
  const double = (w, h, internal, format) => {
    let a = target(w, h, internal, format);
    let b = target(w, h, internal, format);
    return {
      get read() {
        return a;
      },
      get write() {
        return b;
      },
      swap() {
        [a, b] = [b, a];
      },
      w,
      h,
    };
  };

  const size = (res) => {
    const aspect = canvas.width / canvas.height || 1;
    return aspect > 1 ? [Math.round(res * aspect), res] : [res, Math.round(res / aspect)];
  };
  const [sw, sh] = size(SIM);
  const [dw, dh] = size(DYE);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;
  const velocity = double(sw, sh, gl.RG16F, gl.RG);
  const dye = double(dw, dh, gl.RGBA16F, gl.RGBA);
  const pressure = double(sw, sh, gl.R16F, gl.RED);
  const divergence = target(sw, sh, gl.R16F, gl.RED);
  const curl = target(sw, sh, gl.R16F, gl.RED);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) return null;

  let unit = 0;
  const bindTex = (tex) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    return unit++;
  };
  const run = (name, out, set) => {
    const { p, u } = programs[name];
    gl.useProgram(p);
    unit = 0;
    const texel = out ? [1 / out.w, 1 / out.h] : [1 / sw, 1 / sh];
    if (u.uTexel) gl.uniform2f(u.uTexel, ...texel);
    set(u);
    if (out) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.fbo);
      gl.viewport(0, 0, out.w, out.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const splat = (x, y, dx, dy, strength) => {
    const aspect = canvas.width / canvas.height;
    run('splat', velocity.write, (u) => {
      gl.uniform1i(u.uTarget, bindTex(velocity.read.tex));
      gl.uniform1f(u.uAspect, aspect);
      gl.uniform2f(u.uPoint, x, y);
      gl.uniform3f(u.uColor, dx, dy, 0);
      gl.uniform1f(u.uRadius, 0.0016 * radius);
    });
    velocity.swap();
    run('splat', dye.write, (u) => {
      gl.uniform1i(u.uTarget, bindTex(dye.read.tex));
      gl.uniform1f(u.uAspect, aspect);
      gl.uniform2f(u.uPoint, x, y);
      gl.uniform3f(u.uColor, strength, strength, strength);
      gl.uniform1f(u.uRadius, 0.0011 * radius);
    });
    dye.swap();
  };

  const step = (dt) => {
    gl.disable(gl.BLEND);
    run('curl', curl, (u) => gl.uniform1i(u.uVelocity, bindTex(velocity.read.tex)));
    run('vorticity', velocity.write, (u) => {
      gl.uniform1i(u.uVelocity, bindTex(velocity.read.tex));
      gl.uniform1i(u.uCurl, bindTex(curl.tex));
      gl.uniform1f(u.uCurlAmount, CURL);
      gl.uniform1f(u.uDt, dt);
    });
    velocity.swap();
    run('divergence', divergence, (u) => gl.uniform1i(u.uVelocity, bindTex(velocity.read.tex)));
    run('clear', pressure.write, (u) => {
      gl.uniform1i(u.uTexture, bindTex(pressure.read.tex));
      gl.uniform1f(u.uValue, 0.8);
    });
    pressure.swap();
    for (let i = 0; i < 16; i += 1) {
      run('pressure', pressure.write, (u) => {
        gl.uniform1i(u.uPressure, bindTex(pressure.read.tex));
        gl.uniform1i(u.uDivergence, bindTex(divergence.tex));
      });
      pressure.swap();
    }
    run('gradient', velocity.write, (u) => {
      gl.uniform1i(u.uPressure, bindTex(pressure.read.tex));
      gl.uniform1i(u.uVelocity, bindTex(velocity.read.tex));
    });
    velocity.swap();
    run('advect', velocity.write, (u) => {
      gl.uniform1i(u.uVelocity, bindTex(velocity.read.tex));
      gl.uniform1i(u.uSource, bindTex(velocity.read.tex));
      gl.uniform1f(u.uDt, dt);
      gl.uniform1f(u.uDissipation, drag);
    });
    velocity.swap();
    run('advect', dye.write, (u) => {
      gl.uniform1i(u.uVelocity, bindTex(velocity.read.tex));
      gl.uniform1i(u.uSource, bindTex(dye.read.tex));
      gl.uniform2f(u.uTexel, 1 / sw, 1 / sh);
      gl.uniform1f(u.uDt, dt);
      gl.uniform1f(u.uDissipation, fade);
    });
    dye.swap();
  };

  const display = (strength) => {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    run('display', null, (u) => {
      gl.uniform1i(u.uDye, bindTex(dye.read.tex));
      gl.uniform3f(u.uInk, ...color);
      gl.uniform1f(u.uStrength, strength);
      gl.uniform1f(u.uMax, maxAlpha);
    });
  };
  let color = ink;

  return {
    splat,
    step,
    display,
    setInk: (next) => {
      color = next;
    },
    dispose: () => gl.getExtension('WEBGL_lose_context')?.loseContext(),
  };
};

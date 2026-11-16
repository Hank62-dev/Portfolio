import * as THREE from 'three';
import { SECTION_SHAPES, SHAPES, fromSamples, sampleText } from './shapes';

const VERTEX = `
attribute vec3 aFrom;
attribute vec3 aTo;
attribute float aSeed;
uniform float uMorph;
uniform float uTime;
uniform float uSize;
uniform float uWave;
uniform vec3 uMouse;
uniform float uPixelRatio;
uniform float uBoost;
varying float vHeat;
varying float vDepth;

float easeInOut(float t) { return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }

void main() {
  // each grain sets off a little after the one before it, so a change of shape travels as a wave
  float t = clamp(uMorph * 1.6 - aSeed * 0.6, 0.0, 1.0);
  float e = easeInOut(t);
  vec3 p = mix(aFrom, aTo, e);
  float flight = sin(t * 3.14159);
  // on the way the grains swirl about the vertical axis, and every grain breathes a little all the time
  float swirl = flight * (1.2 + aSeed);
  p.xz = mat2(cos(swirl), -sin(swirl), sin(swirl), cos(swirl)) * p.xz;
  p += vec3(sin(uTime * 0.7 + aSeed * 40.0), cos(uTime * 0.6 + aSeed * 31.0), sin(uTime * 0.5 + aSeed * 17.0)) * (0.035 + flight * 0.5);
  // the sheet rolls
  p.y += (sin(p.x * 1.3 + uTime * 1.1) * 0.22 + cos(p.z * 1.7 + uTime * 0.8) * 0.16) * uWave;
  // the pointer pushes grains aside
  vec3 away = p - uMouse;
  float d = length(away.xy);
  float push = smoothstep(1.3, 0.0, d);
  p.xy += normalize(away.xy + 0.0001) * push * 0.7;
  vHeat = clamp(max(flight * 0.55, push * 1.2) + uBoost * 0.03, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vDepth = clamp(-mv.z / 14.0, 0.0, 1.0);
  gl_PointSize = uSize * uPixelRatio * (1.0 + vHeat * 1.4) * (8.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = `
precision mediump float;
uniform vec3 uCold;
uniform vec3 uHot;
uniform float uAlpha;
varying float vHeat;
varying float vDepth;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c);
  if (r > 0.25) discard;
  float soft = smoothstep(0.25, 0.0, r);
  vec3 color = mix(uCold, uHot, vHeat);
  gl_FragColor = vec4(color, soft * uAlpha * (1.0 - vDepth * 0.55));
}
`;

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * The page's dust as one three.js scene: a few thousand points that gather into a shape for each section
 * (see SECTION_SHAPES) and travel between shapes in a swirling wave, pushed aside by the pointer and
 * warmed by scroll speed. Drawn on a transparent canvas behind the content.
 *
 * Returns { setSection(id), setWord(word), setColors(colors), frame(dt, input), resize(), dispose() }.
 */
export const createParticles = ({ canvas, count, word, font, colors }) => {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 10);

  const geometry = new THREE.BufferGeometry();
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) seeds[i] = Math.random();
  const start = SHAPES.dust(count);
  const from = new THREE.BufferAttribute(start.slice(), 3);
  const to = new THREE.BufferAttribute(start.slice(), 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(start.slice(), 3));
  geometry.setAttribute('aFrom', from);
  geometry.setAttribute('aTo', to);
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uMorph: { value: 1 },
    uTime: { value: 0 },
    uSize: { value: 2.2 },
    uWave: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uBoost: { value: 0 },
    uCold: { value: new THREE.Color(colors.cold) },
    uHot: { value: new THREE.Color(colors.hot) },
    uAlpha: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: colors.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  const cache = new Map();
  let text = null;
  const shapeOf = (name) => {
    if (name === 'text') {
      text ??= sampleText(word, font);
      return fromSamples(count, text.samples, text.aspect);
    }
    if (!cache.has(name)) cache.set(name, SHAPES[name](count));
    return cache.get(name);
  };

  // where the group is heading (position, scale, opacity, waves), eased toward every frame
  const goal = { x: 0, y: 0, scale: 1, alpha: 0.35, wave: 0, spin: 1 };
  const now = { ...goal, alpha: 0 };
  let current = 'top';
  let morph = null;

  const setSection = (id) => {
    const cfg = SECTION_SHAPES[id] ?? SECTION_SHAPES.top;
    if (id === current) return;
    current = id;
    // freeze every grain where it is now, then send it to the new shape
    const t = uniforms.uMorph.value;
    const f = from.array;
    const g = to.array;
    for (let i = 0; i < count; i += 1) {
      const e = easeInOut(Math.min(1, Math.max(0, t * 1.6 - seeds[i] * 0.6)));
      for (let k = 0; k < 3; k += 1) f[i * 3 + k] += (g[i * 3 + k] - f[i * 3 + k]) * e;
    }
    g.set(shapeOf(cfg.shape));
    from.needsUpdate = true;
    to.needsUpdate = true;
    uniforms.uMorph.value = 0;
    morph = { t: 0, duration: 2.4 };
    Object.assign(goal, { x: cfg.x, y: cfg.y, scale: cfg.scale, alpha: cfg.alpha, wave: cfg.shape === 'wave' ? 1 : 0, spin: cfg.spin ? 1 : 0 });
  };

  const setWord = (next) => {
    if (next === word) return;
    word = next;
    text = null;
    if (current === 'contact') {
      current = '';
      setSection('contact');
    }
  };

  const setColors = (next) => {
    uniforms.uCold.value.set(next.cold);
    uniforms.uHot.value.set(next.hot);
    material.blending = next.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
    material.needsUpdate = true;
  };

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  let time = 0;
  let turn = 0; // how far the shape has turned on its own; only the round shapes keep turning

  const frame = (dt, input) => {
    time += dt;
    if (morph) {
      morph.t = Math.min(1, morph.t + dt / morph.duration);
      uniforms.uMorph.value = morph.t;
      if (morph.t >= 1) morph = null;
    }
    const k = Math.min(1, dt * 2.2);
    for (const key of Object.keys(goal)) now[key] += (goal[key] - now[key]) * k;
    // wide screens only: keep the shape from sliding off a narrow window
    const room = Math.min(1, camera.aspect / 1.6);
    group.position.set(now.x * room, now.y, 0);
    group.scale.setScalar(now.scale * (0.75 + room * 0.25));
    turn += dt * 0.12 * now.spin;
    // a word or a sheet only sways, so it is never seen from behind
    if (now.spin < 0.5) turn += (Math.round(turn / (Math.PI * 2)) * Math.PI * 2 - turn) * Math.min(1, dt * 2);
    group.rotation.y = turn + Math.sin(time * 0.3) * 0.18 + (input.pointerX - 0.5) * 0.4;
    group.rotation.x = 0.18 + (input.pointerY - 0.5) * 0.25;
    uniforms.uTime.value = time;
    uniforms.uWave.value = now.wave;
    uniforms.uAlpha.value = now.alpha * input.visibility;
    uniforms.uBoost.value = Math.min(12, Math.abs(input.velocity));

    // the pointer, on the plane through the shape, in the shape's own coordinates
    ndc.set(input.pointerX * 2 - 1, -(input.pointerY * 2 - 1));
    ray.setFromCamera(ndc, camera);
    group.updateMatrixWorld();
    if (ray.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.copy(group.worldToLocal(hit));
    renderer.render(scene, camera);
  };

  return {
    setSection,
    setWord,
    setColors,
    frame,
    resize,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};

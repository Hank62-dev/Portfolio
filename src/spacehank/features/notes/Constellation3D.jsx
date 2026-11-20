import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Sparkles, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, Object3D, Vector3 } from 'three';
import { radiusOf } from './graph';

// The sky of notes in depth: the same stars as the flat map (their places come from its layout, which keeps settling) set
// out in space, each tag's cluster at its own distance, the threads between them as faint lines; a nebula behind it all
// and dust drifting through. What is bright blooms. Tap a star to fly to it; drag to turn the sky, pinch or scroll to come
// closer. Loaded only when the 3D switch is on, so three.js downloads then.

const SCALE = 1 / 34;
const hashOf = (id) => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};
/** A note's place in space: the flat map's x and y, and a depth from its tag's colour (a cluster shares a layer) and itself. */
const placeOf = (n, out) => out.set(n.x * SCALE, -n.y * SCALE, ((n.hue / 360) - 0.5) * 9 + (hashOf(n.id) - 0.5) * 2.2);

const NEBULA = {
  vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    varying vec3 vDir;
    uniform float uTime;
    float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float noise(vec3 x) {
      vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    float fbm(vec3 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; } return v; }
    void main() {
      vec3 d = vDir * 2.4 + vec3(uTime * 0.01, 0.0, uTime * 0.006);
      float n = fbm(d);
      float m = fbm(d * 1.7 + n * 2.0);
      vec3 violet = vec3(0.32, 0.14, 0.55);
      vec3 ember = vec3(0.6, 0.2, 0.12);
      vec3 teal = vec3(0.06, 0.28, 0.36);
      vec3 col = mix(violet, teal, smoothstep(0.35, 0.7, n));
      col = mix(col, ember, smoothstep(0.55, 0.85, m) * 0.6);
      float a = smoothstep(0.38, 0.82, m) * 0.32;
      gl_FragColor = vec4(col * a, 1.0);
    }`,
};

function Nebula() {
  const material = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
  });
  return (
    <mesh scale={90}>
      <sphereGeometry args={[1, 48, 32]} />
      <shaderMaterial ref={material} args={[NEBULA]} uniforms={uniforms} side={BackSide} depthWrite={false} />
    </mesh>
  );
}

function Sky({ nodes, edges, selected, onSelect, dimmed }) {
  const mesh = useRef();
  const lines = useRef();
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const at = useMemo(() => new Vector3(), []);
  const [hover, setHover] = useState(null);
  const lit = useMemo(() => ({ current: new Float32Array(nodes.length) }), [nodes]);
  const index = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);
  const near = useMemo(() => {
    const set = new Set(selected ? [selected] : []);
    for (const e of edges) if (e.a === selected || e.b === selected) set.add(e.a).add(e.b);
    return set;
  }, [edges, selected]);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(edges.length * 6), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(edges.length * 6), 3));
    return g;
  }, [edges]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  // the colours of the instances exist from the start, so the material is built to use them
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < nodes.length; i += 1) m.setColorAt(i, color.set('#ffffff'));
    m.material.needsUpdate = true;
  }, [nodes, color]);

  useFrame((_, dt) => {
    if (!mesh.current) return;
    const k = Math.min(1, dt * 6);
    nodes.forEach((n, i) => {
      placeOf(n, at);
      const on = (selected ? near.has(n.id) : !dimmed(n)) ? 1 : 0;
      lit.current[i] += (on - lit.current[i]) * k;
      const l = lit.current[i];
      const size = (0.09 + radiusOf(n) * 0.012) * (n.id === selected ? 1.8 : n.id === hover ? 1.4 : 1);
      dummy.position.copy(at);
      dummy.scale.setScalar(size * (0.6 + 0.4 * l));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      // bright enough to bloom when it is lit, a dim ember when it is not
      color.setHSL(n.hue / 360, 0.85, 0.62).multiplyScalar(0.25 + l * (n.id === selected ? 2.6 : 1.5));
      mesh.current.setColorAt(i, color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    const pos = geometry.attributes.position.array;
    const col = geometry.attributes.color.array;
    edges.forEach((e, i) => {
      const a = nodes[index.get(e.a)];
      const b = nodes[index.get(e.b)];
      if (!a || !b) return;
      placeOf(a, at).toArray(pos, i * 6);
      placeOf(b, at).toArray(pos, i * 6 + 3);
      const glow = selected ? (e.a === selected || e.b === selected ? 0.9 : 0.06) : 0.28;
      color.setHSL(a.hue / 360, 0.6, 0.6).multiplyScalar(glow);
      color.toArray(col, i * 6);
      color.setHSL(b.hue / 360, 0.6, 0.6).multiplyScalar(glow);
      color.toArray(col, i * 6 + 3);
    });
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.computeBoundingSphere();
  });

  const label = hover ?? selected;
  const labelled = label ? nodes[index.get(label)] : null;
  return (
    <>
      <lineSegments ref={lines} geometry={geometry}>
        <lineBasicMaterial vertexColors transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <instancedMesh
        key={nodes.length}
        ref={mesh}
        args={[undefined, undefined, nodes.length]}
        onClick={(event) => {
          event.stopPropagation();
          const n = nodes[event.instanceId];
          if (n) onSelect(n.id === selected ? null : n.id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHover(nodes[event.instanceId]?.id ?? null);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(null);
          document.body.style.cursor = '';
        }}
      >
        <sphereGeometry args={[1, 18, 14]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {labelled && (
        <Html position={placeOf(labelled, new Vector3()).add(new Vector3(0, 0.35, 0))} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <span className="block max-w-[14rem] truncate rounded-full border border-wash/15 bg-shade/70 px-2.5 py-1 font-mono text-[0.68rem] whitespace-nowrap text-bone backdrop-blur-md">{labelled.title}</span>
        </Html>
      )}
    </>
  );
}

/** Flies the camera to the chosen star (and back to the whole sky when none is chosen), then lets the hand take over. */
function Flight({ nodes, selected }) {
  const { camera, controls } = useThree();
  const goal = useRef(null);
  useEffect(() => {
    const n = nodes.find((node) => node.id === selected);
    const target = n ? placeOf(n, new Vector3()) : new Vector3(0, 0, 0);
    const back = n ? camera.position.clone().sub(controls?.target ?? new Vector3()).setLength(5.5) : new Vector3(0, 2, 22);
    goal.current = { target, position: target.clone().add(back), t: 0 };
  }, [selected, nodes, camera, controls]);
  useFrame((_, dt) => {
    const g = goal.current;
    if (!g || !controls) return;
    g.t += dt;
    const k = Math.min(1, dt * 3.2);
    controls.target.lerp(g.target, k);
    camera.position.lerp(g.position, k);
    controls.update();
    if (g.t > 1.6) goal.current = null;
  });
  return null;
}

/** The 3D sky, filling its box. `dimmed(node)` says which stars a tag or a search leaves out. */
export default function Constellation3D({ nodes, edges, selected, onSelect, dimmed, phone }) {
  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, phone ? 1.25 : 1.6]}
      camera={{ position: [0, 2, 22], fov: 50, near: 0.1, far: 300 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#05050a']} />
      <Nebula />
      <Stars radius={70} depth={30} count={phone ? 1500 : 3000} factor={3} saturation={0.3} fade speed={0.4} />
      <Sparkles count={phone ? 60 : 140} scale={[40, 24, 24]} size={1.6} speed={0.18} opacity={0.4} color="#c9b8ff" />
      <Sky nodes={nodes} edges={edges} selected={selected} onSelect={onSelect} dimmed={dimmed} />
      <Flight nodes={nodes} selected={selected} />
      <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={2} maxDistance={60} autoRotate={!selected} autoRotateSpeed={0.3} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.6} luminanceSmoothing={0.25} levels={phone ? 4 : 6} />
        <Vignette offset={0.25} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}

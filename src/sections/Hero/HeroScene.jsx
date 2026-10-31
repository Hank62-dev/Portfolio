import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LAYERS } from '../../data/projects';
import { heroStore } from './heroStore';

// The four layers every project in the portfolio is described by, drawn as plates a signal line runs through.
const PLATE = [3.4, 0.1, 2.3];
const GAP = 0.95;
const TOP = (LAYERS.length - 1) / 2;
const BEAM_HEIGHT = 5.6;
const SIGNAL = '#ff5b2e';
const PALETTE = {
  dark: { dust: '#ece6da', edge: '#ece6da' },
  light: { dust: '#17140f', edge: '#d8d1c2' },
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Plates drift apart as the hero scrolls out of view. */
function Layers({ labels, edge }) {
  const plates = useRef([]);
  const nodes = useRef([]);

  useFrame(() => {
    const spread = GAP + heroStore.scroll * 1.3;
    LAYERS.forEach((_, i) => {
      const y = (TOP - i) * spread;
      if (plates.current[i]) plates.current[i].position.y = y;
      if (nodes.current[i]) nodes.current[i].position.y = y + PLATE[1] / 2 + 0.02;
    });
  });

  return (
    <>
      {LAYERS.map((layer, i) => (
        <group key={layer}>
          <group ref={(el) => (plates.current[i] = el)}>
            <mesh>
              <boxGeometry args={PLATE} />
              <meshStandardMaterial color="#1a1c21" roughness={0.55} metalness={0.25} transparent opacity={0.94} />
              <Edges threshold={20} color={edge} transparent opacity={0.55} />
            </mesh>
            <Html position={[PLATE[0] / 2 + 0.2, 0, PLATE[2] / 2 - 0.1]} style={{ pointerEvents: 'none' }} zIndexRange={[5, 0]}>
              <span className="font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-bone-dim uppercase">
                <b className="mr-1.5 font-normal text-signal">{String(i + 1).padStart(2, '0')}</b>
                {labels[layer]}
              </span>
            </Html>
          </group>
          <mesh ref={(el) => (nodes.current[i] = el)}>
            <sphereGeometry args={[0.07, 16, 12]} />
            <meshBasicMaterial color={SIGNAL} />
          </mesh>
        </group>
      ))}
      <mesh>
        <cylinderGeometry args={[0.012, 0.012, BEAM_HEIGHT, 8]} />
        <meshBasicMaterial color={SIGNAL} />
      </mesh>
    </>
  );
}

/** Specks of "data" rising through the stack along the beam. */
function Flow({ count, dust }) {
  const points = useRef();
  const { positions, colors, speeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const signal = new THREE.Color(SIGNAL);
    const bone = new THREE.Color(dust);
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = (Math.random() - 0.5) * PLATE[0] * 0.95;
      pos[i * 3 + 1] = (Math.random() - 0.5) * BEAM_HEIGHT;
      pos[i * 3 + 2] = (Math.random() - 0.5) * PLATE[2] * 0.95;
      (Math.random() < 0.3 ? signal : bone).toArray(col, i * 3);
      spd[i] = 0.25 + Math.random() * 0.55;
    }
    return { positions: pos, colors: col, speeds: spd };
  }, [count, dust]);

  useFrame((_, delta) => {
    const attr = points.current?.geometry.attributes.position;
    if (!attr) return;
    const half = BEAM_HEIGHT / 2;
    for (let i = 0; i < count; i += 1) {
      let y = attr.array[i * 3 + 1] + speeds[i] * delta;
      if (y > half) y = -half;
      attr.array[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.035} vertexColors transparent opacity={0.85} depthWrite={false} sizeAttenuation />
    </points>
  );
}

/** Idle spin + pointer tilt, then lift, shrink and extra turn as the hero scrolls away. */
function Rig({ children }) {
  const group = useRef();
  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const s = clamp01(heroStore.scroll);
    const targetY = clock.elapsedTime * 0.12 + heroStore.pointerX * 0.45 + s * 1.2;
    const targetX = 0.38 + heroStore.pointerY * 0.12;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 3, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 3, delta);
    g.position.y = s * 0.9;
    g.scale.setScalar(1 - s * 0.25);
  });
  return (
    <group position={[-0.3, 0, 0]}>
      <group ref={group}>{children}</group>
    </group>
  );
}

export default function HeroScene({ labels, active, quality, theme, onReady }) {
  const high = quality === 'high';
  const colors = PALETTE[theme] ?? PALETTE.dark;
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={high ? [1, 1.75] : [1, 1.25]}
      camera={{ position: [0, 0.3, 11.8], fov: 34 }}
      gl={{ antialias: high, alpha: true, powerPreference: 'high-performance' }}
      onCreated={onReady}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#ffe2d0" />
      <pointLight position={[0, 0, 0.5]} intensity={3.5} distance={6} color={SIGNAL} />
      <Rig>
        <Layers labels={labels} edge={colors.edge} />
        <Flow count={high ? 220 : 90} dust={colors.dust} />
      </Rig>
    </Canvas>
  );
}

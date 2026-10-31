import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { BEAM_HEIGHT, GAP, LAYER_IDS, PALETTE, PLATE, clamp01, seeded } from './config';
import Halo from './Halo';
import Packets from './Packets';
import Plate from './Plate';
import { SceneContext, createSceneState } from './SceneContext';
import DataLayer from './layers/DataLayer';
import DeliveryLayer from './layers/DeliveryLayer';
import InterfaceLayer from './layers/InterfaceLayer';
import ServiceLayer from './layers/ServiceLayer';

const LAYER_CONTENT = [InterfaceLayer, ServiceLayer, DataLayer, DeliveryLayer];

/** Specks of dust rising along the beam. */
function Dust({ count, color }) {
  const points = useRef();
  const { positions, colors, speeds } = useMemo(() => {
    const rand = seeded(11);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const hot = new THREE.Color('#ff5b2e');
    const dust = new THREE.Color(color);
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = (rand() - 0.5) * PLATE[0] * 1.1;
      pos[i * 3 + 1] = (rand() - 0.5) * BEAM_HEIGHT;
      pos[i * 3 + 2] = (rand() - 0.5) * PLATE[2] * 1.1;
      (rand() < 0.3 ? hot : dust).toArray(col, i * 3);
      spd[i] = 0.2 + rand() * 0.5;
    }
    return { positions: pos, colors: col, speeds: spd };
  }, [count, color]);

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

/**
 * Everything that moves the whole stack: idle spin, pointer tilt, and (in the hero) the scroll-away.
 * `mode` 'hero' follows the hero's pointer/scroll; 'stack' keeps a calmer, fixed angle.
 */
function Rig({ mode, scene, getInput, children }) {
  const group = useRef();
  const hero = mode === 'hero';
  useFrame(({ clock }, delta) => {
    const g = group.current;
    const input = getInput();
    const s = clamp01(input.scroll);
    // the hero swings like a pendulum rather than turning full circle: it never shows the layers edge-on
    const targetY = hero ? -0.3 + Math.sin(clock.elapsedTime * 0.3) * 0.62 + input.pointerX * 0.45 + s * 1.2 : -0.62 + input.pointerX * 0.3 + Math.sin(clock.elapsedTime * 0.25) * 0.08;
    const targetX = (hero ? 0.38 : 0.46) + input.pointerY * 0.12;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 3, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 3, delta);
    g.position.y = s * 0.9;
    g.scale.setScalar(1 - s * 0.25);
    scene.spread.current = GAP + s * 1.3;
  });
  return (
    <group position={[hero ? 0.1 : 0, 0, 0]}>
      <group ref={group}>{children}</group>
    </group>
  );
}

/**
 * The four-layer stack, alive: each layer shows what it does (a screen being clicked, a network passing
 * requests, a data store being queried, a pipeline shipping builds), requests fall through all four, and
 * technology names orbit the whole thing.
 *
 *   mode         'hero' | 'stack'
 *   labels       { interface, service, data, delivery } display names
 *   techs        words for the halo (hero: all layers; stack: the active layer's)
 *   getInput     () => { pointerX, pointerY, scroll }   each in -1..1 / 0..1
 *   getBurst     () => number   rises when a volley of requests should be sent
 *   getActive    () => layer index to feature, or -1   (stack mode)
 */
export default function StackScene({ mode = 'hero', labels, techs, theme, quality, active = true, onReady, getInput, getBurst = () => 0, getActive = () => -1 }) {
  const high = quality === 'high';
  const palette = PALETTE[theme] ?? PALETTE.dark;
  const scene = useMemo(createSceneState, []);

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={high ? [1, 1.5] : [1, 1.25]}
      camera={{ position: [0, 0.3, mode === 'hero' ? 12.3 : 12.4], fov: 34 }}
      gl={{ antialias: high, alpha: true, powerPreference: 'high-performance' }}
      onCreated={onReady}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#ffe2d0" />
      <pointLight position={[0, 0, 0.5]} intensity={3.5} distance={6} color="#ff5b2e" />
      <SceneContext.Provider value={scene}>
        <Rig mode={mode} scene={scene} getInput={getInput}>
          {LAYER_IDS.map((id, i) => {
            const Content = LAYER_CONTENT[i];
            return (
              <Plate key={id} index={i} label={labels[id]} palette={palette} mode={mode} getFeatured={getActive}>
                <Content index={i} palette={palette} />
              </Plate>
            );
          })}
          <Packets getBurst={getBurst} />
          <Dust count={high ? 150 : 70} color={palette.ink} />
          <Halo items={techs} color={palette.ink} radius={mode === 'hero' ? 3.0 : 2.15} height={mode === 'hero' ? 3.8 : 2.2} getBoost={() => getInput().boost ?? 0} />
        </Rig>
      </SceneContext.Provider>
      {high && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={theme === 'light' ? 0.55 : 0.95} luminanceThreshold={1} luminanceSmoothing={0.15} levels={4} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

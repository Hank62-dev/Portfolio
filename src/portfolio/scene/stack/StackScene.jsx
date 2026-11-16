import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, ChromaticAberration, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import Bodies from './Bodies';
import StackModel from './StackModel';
import { createSceneState } from './SceneContext';
import { GAP, PALETTE, clamp01 } from './config';

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
 * The hero's camera: it flies in from far away when the scene first appears, follows the pointer a
 * little, and dives toward the stack as the hero scrolls away.
 */
function CameraRig({ getInput }) {
  const { camera } = useThree();
  const start = useRef(null);
  useFrame(({ clock }, delta) => {
    start.current ??= clock.elapsedTime;
    const input = getInput();
    const s = clamp01(input.scroll);
    const intro = Math.min(1, (clock.elapsedTime - start.current) / 2.2);
    const fly = 1 - (1 - intro) ** 4;
    const z = 12.3 + (1 - fly) * 14 - s * 4.2;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, input.pointerX * 0.5, 2.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, 0.3 - input.pointerY * 0.35 - s * 0.6, 2.5, delta);
    camera.position.z = intro < 1 ? z : THREE.MathUtils.damp(camera.position.z, z, 4, delta);
    camera.lookAt(0, s * 0.5, 0);
    camera.rotation.z += (1 - fly) * 0.4 + s * 0.12;
  });
  return null;
}

/** Colour fringes that open up with the scroll speed, like a lens moving fast. */
function SpeedFringe({ getInput }) {
  const offset = useMemo(() => new THREE.Vector2(0, 0), []);
  useFrame(() => {
    const v = Math.min(1, Math.abs(getInput().boost ?? 0) / 30);
    offset.x = THREE.MathUtils.lerp(offset.x, 0.0006 + v * 0.006, 0.15);
    offset.y = offset.x * 0.6;
  });
  return <ChromaticAberration offset={offset} radialModulation modulationOffset={0.2} />;
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
      {/* a studio of soft light panels, made on the spot (no file to load), for the reflections */}
      <Environment resolution={high ? 256 : 64} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffe2d0" position={[0, 5, -6]} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={4} color="#ff5b2e" position={[-6, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={2.5} color="#ece6da" position={[5, 2, 3]} scale={3} />
        <Lightformer form="rect" intensity={1.2} color="#6a7cff" position={[4, -4, -4]} scale={[6, 2, 1]} />
      </Environment>
      {mode === 'hero' && <CameraRig getInput={getInput} />}
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#ffe2d0" />
      <pointLight position={[0, 0, 0.5]} intensity={3.5} distance={6} color="#ff5b2e" />
      <Rig mode={mode} scene={scene} getInput={getInput}>
        <StackModel
          scene={scene}
          labels={labels}
          palette={palette}
          mode={mode}
          techs={techs}
          high={high}
          haloRadius={mode === 'hero' ? 3.0 : 2.15}
          haloHeight={mode === 'hero' ? 3.8 : 2.2}
          getActive={getActive}
          getBurst={getBurst}
          getBoost={() => getInput().boost ?? 0}
        />
      </Rig>
      {mode === 'hero' && <Bodies theme={theme} quality={quality} getInput={getInput} getBurst={getBurst} />}
      {high && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={theme === 'light' ? 0.55 : 0.95} luminanceThreshold={1} luminanceSmoothing={0.15} levels={4} />
          <SpeedFringe getInput={getInput} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

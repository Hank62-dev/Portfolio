import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
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
      {high && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={theme === 'light' ? 0.55 : 0.95} luminanceThreshold={1} luminanceSmoothing={0.15} levels={4} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { XR, createXRStore, useXR } from '@react-three/xr';
import CenterPiece from './CenterPiece';
import Frame from './Frame';
import InfoBoard from './InfoBoard';
import Room, { Signs } from './Room';
import ViewRig from './ViewRig';
import XRRig from './XRRig';
import { HUB, NAVE_START, buildExhibition } from './layout';
import { loadGalleryFonts, makePoolTexture } from './textures';

/**
 * The XR store: the one object that starts and ends a headset session. Emulation is switched off, so a
 * headset is used only when the browser really has one.
 */
export const createGalleryStore = () =>
  createXRStore({
    emulate: false,
    // the controller's ray and teleport arc are on by default; a hand shows when the headset tracks hands
    foveation: 0,
  });

// Bloom needs a post-processing pass, which cannot run inside a headset, so it is drawn on screen only.
function Glow({ enabled }) {
  const inXR = useXR((state) => Boolean(state.session));
  if (inXR || !enabled) return null;
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.8} luminanceThreshold={1} luminanceSmoothing={0.15} levels={4} />
    </EffectComposer>
  );
}

/**
 * The exhibition. `projects` (each with a `wing`) are what hangs on the walls, grouped into zones in the
 * order given; `details` is the text for the reading boards, `signs` / `endNote` the words on the banners.
 * The visitor walks it (`interactive`), or the camera just sways on the plaza (`autoPan`). `selected` is the
 * frame being read (-1: none) and `goto` ({ index, nonce }) sends the visitor to one (-1: back to the plaza).
 * `onSelect` is called when a frame is picked in the scene, `onNear` when the visitor walks up to one.
 */
export default function GalleryScene({ store, projects, details, layerNames, techs, signs, endNote, selected, goto, onSelect, onNear, interactive, autoPan, hint, active, quality = 'high', onReady }) {
  const high = quality === 'high';
  const [fontsReady, setFontsReady] = useState(false);
  const pool = useMemo(makePoolTexture, []);
  const exhibition = useMemo(() => buildExhibition(projects.map((p) => p.wing)), [projects]);
  const { slots, zones, length } = exhibition;
  const target = useMemo(() => {
    if (!goto) return null;
    return goto.index < 0 ? HUB : slots[goto.index]?.station ?? null;
  }, [goto, slots]);
  const lampZs = useMemo(() => {
    const count = Math.max(2, Math.floor(length / 14));
    return Array.from({ length: count }, (_, i) => NAVE_START - 6 - i * ((length + NAVE_START - 12) / Math.max(1, count - 1)));
  }, [length]);

  useEffect(() => {
    let live = true;
    loadGalleryFonts().finally(() => live && setFontsReady(true));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => () => pool.dispose(), [pool]);

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={high ? [1, 1.5] : [1, 1.25]}
      camera={{ fov: 72, near: 0.05, far: 140, position: HUB.position }}
      gl={{ antialias: high, powerPreference: 'high-performance' }}
      onCreated={onReady}
    >
      <XR store={store}>
        <color attach="background" args={['#0b0c0e']} />
        <fog attach="fog" args={['#0b0c0e', 9, 36]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 8, 4]} intensity={1.1} color="#ffe2d0" />
        <pointLight position={[0, 4.2, 0]} intensity={14} distance={12} color="#ff8a5c" />
        {lampZs.map((z) => (
          <pointLight key={z} position={[0, 4, z]} intensity={16} distance={16} color="#ffb08a" />
        ))}

        <Room length={length} />
        <CenterPiece layerNames={layerNames} techs={techs} />
        {fontsReady && (
          <Suspense fallback={null}>
            {projects.map((project, i) => (
              <Frame key={project.slug} project={project} slot={slots[i]} total={projects.length} pool={pool} selected={selected === i} onSelect={onSelect} />
            ))}
            <InfoBoard slot={slots[selected]} details={details} hint={hint} />
            <Signs zones={zones} signs={signs} endNote={endNote} length={length} />
          </Suspense>
        )}

        <ViewRig target={target} interactive={interactive} autoPan={autoPan} slots={slots} length={length} onNear={onNear} />
        <XRRig length={length} target={target} />
        <Glow enabled={high} />
      </XR>
    </Canvas>
  );
}

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { INNER_RADIUS, START, STEP, TEXT_GAP, TEXT_SIZE, VIEW_ASIDE, WALL_HEIGHT, WALL_RADIUS, alongWall, arcOf, distanceFor, focusView, hang, onCircle, railView } from './layout';
import { loadPrintFonts, makePrint, makeWallText, makeWallTitle } from './prints';

const PAPER = '#f5f3ef';
const PORTRAIT = [1.08, 1.44];
const LANDSCAPE = [1.76, 1.1];

/** A soft round shadow or wash of light, drawn once and shared. */
const useGlowTexture = (inner, outer) =>
  useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [inner, outer]);

/** The walls, the floor and the ceiling with its line of light, all following the curve. */
function Hall({ count, reflect }) {
  const arc = useMemo(() => arcOf(count), [count]);
  // three's cylinders and rings measure their angle from another axis: these turn ours into theirs
  const cylStart = arc.from + Math.PI;
  const ringStart = arc.from + Math.PI / 2;
  return (
    <group>
      <mesh position={[0, WALL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[WALL_RADIUS + 0.06, WALL_RADIUS + 0.06, WALL_HEIGHT, 160, 1, true, cylStart, arc.length]} />
        <meshStandardMaterial color={PAPER} roughness={0.92} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[INNER_RADIUS, INNER_RADIUS, WALL_HEIGHT, 96, 1, true, cylStart, arc.length]} />
        <meshStandardMaterial color="#efece6" roughness={0.95} side={THREE.FrontSide} />
      </mesh>
      {/* a skirting line of oak along the foot of the wall */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[WALL_RADIUS - 0.01, WALL_RADIUS - 0.01, 0.08, 160, 1, true, cylStart, arc.length]} />
        <meshStandardMaterial color="#cdb28a" roughness={0.6} side={THREE.BackSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[INNER_RADIUS, WALL_RADIUS + 0.1, 160, 1, ringStart, arc.length]} />
        {reflect ? (
          <MeshReflectorMaterial color="#d8d4cc" roughness={0.75} metalness={0.05} mirror={0.4} blur={[420, 120]} mixBlur={1.2} mixStrength={1.4} resolution={1024} depthScale={0.6} minDepthThreshold={0.6} maxDepthThreshold={1.3} />
        ) : (
          <meshStandardMaterial color="#d8d4cc" roughness={0.6} />
        )}
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT, 0]}>
        <ringGeometry args={[INNER_RADIUS, WALL_RADIUS + 0.1, 160, 1, -ringStart - arc.length, arc.length]} />
        <meshStandardMaterial color="#fbfaf8" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* the cove of light in the ceiling that runs the length of the curve */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WALL_HEIGHT - 0.02, 0]}>
        <ringGeometry args={[WALL_RADIUS - 1.5, WALL_RADIUS - 1.32, 160, 1, ringStart, arc.length]} />
        <meshBasicMaterial color="#fffaf0" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** The art itself: a picture when the work has one, a print drawn for it when not. */
function Art({ work, number, size }) {
  const drawn = useMemo(() => (work.cover ? null : makePrint(work, number)), [work, number]);
  useEffect(() => () => drawn?.dispose(), [drawn]);
  if (work.cover) return <Picture src={work.cover} size={size} />;
  return (
    <mesh position={[0, 0, 0.032]}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={drawn} toneMapped={false} />
    </mesh>
  );
}

function Picture({ src, size }) {
  const map = useTexture(src);
  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
  }, [map]);
  return (
    <mesh position={[0, 0, 0.032]}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

/**
 * One work on the wall: a thin frame (black or oak), a wide white mount, the art, a soft shadow behind and a wash of light from
 * above; its wall text printed beside it. Pointing at it lifts it a little; choosing it sends the camera to stand in front of
 * it, and once there the wall text leads on to the case study.
 */
function Work({ work, index, total, focused, onPick, onOpen, shadow, wash, labels }) {
  const { position, rotationY } = hang(index);
  const landscape = Boolean(work.cover);
  const [aw, ah] = landscape ? LANDSCAPE : PORTRAIT;
  const mount = 0.16;
  const fw = aw + mount * 2 + 0.06;
  const fh = ah + mount * 2 + 0.06;
  const oak = index % 3 === 1;
  const [hovered, setHovered] = useState(false);
  const [onText, setOnText] = useState(false);
  const lift = useRef();
  const text = useMemo(() => makeWallText(work, index + 1, total, labels), [work, index, total, labels]);
  useEffect(() => () => text.dispose(), [text]);
  const pointing = hovered || onText;
  // the wall curves away from a flat plane, so the text is set on the curve and the frame stands a little off the wall
  const textAt = alongWall(fw / 2 + TEXT_GAP + TEXT_SIZE[0] / 2, 0.012);
  useEffect(() => {
    document.body.style.cursor = pointing ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [pointing]);
  useFrame((_, dt) => {
    if (!lift.current) return;
    const goal = hovered || focused ? 0.06 : 0;
    lift.current.position.z = THREE.MathUtils.damp(lift.current.position.z, goal, 8, dt);
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group position={[0, 0, 0.05]}>
        {/* the wash of light from the ceiling, then the shadow the frame throws on the wall */}
        <mesh position={[0, 0.3, 0.004]}>
          <planeGeometry args={[fw * 1.7, fh * 1.55]} />
          <meshBasicMaterial map={wash} transparent depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0.05, -0.12, 0.008]}>
          <planeGeometry args={[fw * 1.25, fh * 1.22]} />
          <meshBasicMaterial map={shadow} transparent depthWrite={false} />
        </mesh>
        <group
          ref={lift}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta > 6) return; // the end of a drag along the wall is not a choice
            onPick(index);
          }}
        >
          <mesh position={[0, 0, 0.02]}>
            <boxGeometry args={[fw, fh, 0.05]} />
            <meshStandardMaterial color={oak ? '#8c6a43' : '#161513'} roughness={oak ? 0.55 : 0.35} metalness={oak ? 0 : 0.2} />
          </mesh>
          <mesh position={[0, 0, 0.0455]}>
            <planeGeometry args={[aw + mount * 2, ah + mount * 2]} />
            <meshBasicMaterial color="#f8f6f1" toneMapped={false} />
          </mesh>
          <group position={[0, 0, 0.015]}>
            <Suspense fallback={null}>
              <Art work={work} number={index + 1} size={[aw, ah]} />
            </Suspense>
          </group>
        </group>
      </group>
      {/* the wall text, printed on the wall: once the work is chosen, it is the way on to the case study */}
      <mesh
        position={[textAt.position[0], 0, textAt.position[1]]}
        rotation={[0, textAt.rotationY, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setOnText(true);
        }}
        onPointerOut={() => setOnText(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 6) return;
          if (focused) onOpen?.(index);
          else onPick(index);
        }}
      >
        <planeGeometry args={TEXT_SIZE} />
        <meshBasicMaterial map={text} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** The title painted on the wall at the entrance, before the first work. */
function WallTitle({ words }) {
  const texture = useMemo(() => makeWallTitle(words), [words]);
  useEffect(() => () => texture.dispose(), [texture]);
  const a = START - STEP * 1.15;
  const [x, , z] = onCircle(a, WALL_RADIUS - 0.02);
  return (
    <mesh position={[x, 2.05, z]} rotation={[0, a, 0]}>
      <planeGeometry args={[3.6, 1.35]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

const tmpTarget = new THREE.Vector3();

/**
 * The camera: on the rail it rides the curve (`rail.current.t`, set by the section from the wheel, a drag or the keys); with a
 * work chosen it glides to stand square in front of it. The pointer turns the head a little, and before the visitor steps in
 * the camera drifts slowly along the first works by itself.
 */
function Rig({ rail, focus, drift, count }) {
  const { camera, pointer, size } = useThree();
  const fov = camera.fov;
  const look = useRef(new THREE.Vector3(...railView(0).target));
  useFrame((state, dt) => {
    if (drift) rail.current.t = 1.2 + Math.sin(state.clock.elapsedTime * 0.12) * 1.4;
    rail.current.shown = THREE.MathUtils.damp(rail.current.shown ?? rail.current.t, rail.current.t, 3.2, dt);
    // a chosen work and its wall text share the screen; a narrow screen stands further back to fit both
    const view = focus >= 0 && focus < count ? focusView(focus, VIEW_ASIDE, distanceFor(3.9, size.width / size.height, fov)) : railView(rail.current.shown);
    const k = focus >= 0 ? 2.6 : 5;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, view.position[0], k, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, view.position[1], k, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, view.position[2], k, dt);
    tmpTarget.set(view.target[0], view.target[1], view.target[2]);
    // the head follows the pointer a little (less when looking at one work)
    const sway = focus >= 0 ? 0.12 : 0.45;
    tmpTarget.x += pointer.x * sway;
    tmpTarget.y += pointer.y * sway * 0.5;
    look.current.lerp(tmpTarget, 1 - Math.exp(-k * dt));
    camera.lookAt(look.current);
  });
  return null;
}

/** Tells the section the hall is drawn once its first frame is out. */
function Ready({ onReady }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady?.();
  });
  return null;
}

/**
 * The exhibition hall: a white gallery that curves away to the left, every work hung along its wall in a frame with a mount and a
 * label, a polished floor that reflects them, and a line of light in the ceiling. `rail` ({ t }) is where the visitor stands,
 * `focus` the work being looked at (-1: none), `onPick(i)` is called when a work is chosen.
 */
export default function ExhibitScene({ works, rail, focus, onPick, onOpen, drift, words, labels, quality = 'high', active = true, onReady }) {
  const high = quality === 'high';
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let live = true;
    loadPrintFonts().finally(() => live && setFontsReady(true));
    return () => {
      live = false;
    };
  }, []);

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={high ? [1, 1.75] : [1, 1.25]}
      camera={{ fov: 54, near: 0.1, far: 60, position: railView(0).position }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.35 }}
      onPointerMissed={() => undefined}
    >
      <color attach="background" args={['#f6f4f0']} />
      <fog attach="fog" args={['#f6f4f0', 16, 42]} />
      <hemisphereLight args={['#ffffff', '#e4ddd0', 2.1]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[0, 10, 0]} intensity={0.8} />
      {fontsReady && <Exhibits works={works} focus={focus} onPick={onPick} onOpen={onOpen} words={words} labels={labels} />}
      <Hall count={works.length} reflect={high} />
      <Rig rail={rail} focus={focus} drift={drift} count={works.length} />
      <Ready onReady={onReady} />
    </Canvas>
  );
}

function Exhibits({ works, focus, onPick, onOpen, words, labels }) {
  const shadow = useGlowTexture('rgba(40,30,20,0.32)', 'rgba(40,30,20,0)');
  const wash = useGlowTexture('rgba(255,246,226,0.32)', 'rgba(255,246,226,0)');
  return (
    <>
      <WallTitle words={words} />
      {works.map((work, i) => (
        <Work key={work.slug} work={work} index={i} total={works.length} focused={focus === i} onPick={onPick} onOpen={onOpen} shadow={shadow} wash={wash} labels={labels} />
      ))}
    </>
  );
}


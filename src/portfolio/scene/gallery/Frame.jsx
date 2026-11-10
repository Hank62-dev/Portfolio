import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { FRAME_HEIGHT, FRAME_SIZE } from './layout';
import { makeCoverTexture, makePlaqueTexture } from './textures';

const [W, H] = FRAME_SIZE;

/** A picture that already has a screenshot. */
function CoverImage({ src }) {
  const map = useTexture(src);
  return (
    <mesh position={[0, 0, 0.045]}>
      <planeGeometry args={[W, H]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

/** A picture drawn for a project that has none. */
function DrawnCover({ project }) {
  const map = useMemo(() => makeCoverTexture(project), [project]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh position={[0, 0, 0.045]}>
      <planeGeometry args={[W, H]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}

/**
 * One framed project on a wall of the nave: picture, a frame that glows when pointed at, a plaque, and a
 * pool of light on the floor. Pointing at it (mouse, touch or a controller's ray) highlights it; selecting
 * it walks you up to it.
 */
export default function Frame({ project, slot, total, pool, selected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const edge = useRef();
  const glow = useRef(0);

  const plaque = useMemo(
    () => makePlaqueTexture({ index: slot.index, count: total, name: project.name, year: project.year, kind: project.kind }),
    [slot.index, total, project]
  );
  useEffect(() => () => plaque.dispose(), [plaque]);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  useFrame((_, delta) => {
    const target = selected ? 1 : hovered ? 0.7 : 0;
    glow.current += (target - glow.current) * Math.min(1, delta * 6);
    if (edge.current) edge.current.material.opacity = 0.18 + glow.current * 0.82;
  });

  return (
    <group position={slot.position} rotation={[0, slot.yaw, 0]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 6) return; // that was a drag to look around, not a click
          onSelect(slot.index);
        }}
      >
        <boxGeometry args={[W + 0.2, H + 0.2, 0.08]} />
        <meshStandardMaterial color="#0d0e11" roughness={0.6} metalness={0.3} />
        <Edges ref={edge} threshold={20} color="#ff5b2e" transparent opacity={0.18} />
      </mesh>
      {project.cover ? <CoverImage src={project.cover} /> : <DrawnCover project={project} />}

      <mesh position={[0, -(H / 2 + 0.42), 0.04]}>
        <planeGeometry args={[W, 0.44]} />
        <meshBasicMaterial map={plaque} toneMapped={false} />
      </mesh>

      <mesh position={[0, -(FRAME_HEIGHT - 0.01), 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 3.4]} />
        <meshBasicMaterial map={pool} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}

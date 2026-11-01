import { useEffect, useMemo } from 'react';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { HOT } from '../stack/config';
import { NAVE, NAVE_START, PLAZA_RADIUS } from './layout';
import { makeSignTexture } from './textures';

const WALL = NAVE.height;
const HALF = NAVE.halfWidth;
// the plaza's wall is a cylinder with a gap where the nave opens out of it
const GAP = Math.asin(HALF / PLAZA_RADIUS);

/**
 * The building. A round plaza open to the sky (stars above) that opens into a long covered nave. Glowing
 * lines are laid into the floor and run along the walls and ceiling: they are the only things pushed past
 * white, so on screen bloom lights them.
 */
export default function Room({ length }) {
  const hot = useMemo(() => new THREE.MeshBasicMaterial({ color: HOT, toneMapped: false }), []);
  const dim = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff5b2e', transparent: true, opacity: 0.22 }), []);
  const span = length + NAVE_START; // from the nave mouth to the end wall (NAVE_START is negative)
  const naveCentre = (NAVE_START - length) / 2;
  const stripCount = Math.max(2, Math.floor(length / 7));

  return (
    <group>
      {/* floors */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
        <circleGeometry args={[PLAZA_RADIUS, 96]} />
        <meshStandardMaterial color="#101216" roughness={0.38} metalness={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, naveCentre]}>
        <planeGeometry args={[HALF * 2, span]} />
        <meshStandardMaterial color="#101216" roughness={0.38} metalness={0.55} />
      </mesh>

      {/* plaza: a bright ring at the wall, fainter ones leading in to the plinth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} material={hot}>
        <ringGeometry args={[PLAZA_RADIUS - 0.34, PLAZA_RADIUS - 0.3, 128, 1, Math.PI / 2 + GAP, Math.PI * 2 - GAP * 2]} />
      </mesh>
      {[2.4, 3.6, 4.8].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} material={dim}>
          <ringGeometry args={[r, r + 0.012, 128]} />
        </mesh>
      ))}
      <mesh position={[0, WALL / 2, 0]}>
        <cylinderGeometry args={[PLAZA_RADIUS, PLAZA_RADIUS, WALL, 96, 1, true, Math.PI + GAP, Math.PI * 2 - GAP * 2]} />
        <meshStandardMaterial color="#0e1013" roughness={0.9} side={THREE.BackSide} />
      </mesh>

      {/* nave: side walls, end wall, ceiling */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * HALF, WALL / 2, naveCentre]} rotation={[0, -side * (Math.PI / 2), 0]}>
            <planeGeometry args={[span, WALL]} />
            <meshStandardMaterial color="#0e1013" roughness={0.9} />
          </mesh>
          {/* glowing skirting along the foot of the wall, and a lamp rail at the top */}
          <mesh position={[side * (HALF - 0.04), 0.05, naveCentre]} material={hot}>
            <boxGeometry args={[0.05, 0.05, span]} />
          </mesh>
          <mesh position={[side * (HALF - 0.04), WALL - 0.05, naveCentre]} material={hot}>
            <boxGeometry args={[0.05, 0.05, span]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, WALL / 2, -length]}>
        <planeGeometry args={[HALF * 2, WALL]} />
        <meshStandardMaterial color="#0e1013" roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, WALL, naveCentre]}>
        <planeGeometry args={[HALF * 2, span]} />
        <meshStandardMaterial color="#0a0b0d" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: stripCount }, (_, i) => (
        <mesh key={i} position={[0, WALL - 0.03, NAVE_START - 3 - i * ((span - 6) / Math.max(1, stripCount - 1))]} material={hot}>
          <boxGeometry args={[2.4, 0.04, 0.12]} />
        </mesh>
      ))}

      <Stars radius={40} depth={20} count={1100} factor={3.2} fade speed={0.35} />
    </group>
  );
}

function Sign({ spec, position, width = 4.4 }) {
  const texture = useMemo(() => makeSignTexture(spec), [spec]);
  useEffect(() => () => texture.dispose(), [texture]);
  const height = width * (360 / 1600);
  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

/**
 * What tells you where you are: a banner hung across the nave at the start of each zone (with a glowing line
 * across the floor under it), and a note on the end wall. Drawn onto textures, so it needs the fonts loaded.
 */
export function Signs({ zones, signs, endNote, length }) {
  const hot = useMemo(() => new THREE.MeshBasicMaterial({ color: HOT, toneMapped: false }), []);
  return (
    <group>
      {zones.map((zone) => (
        <group key={zone.wing}>
          <Sign spec={signs[zone.wing]} position={[0, WALL - 1.25, zone.z]} />
          {[-1.9, 1.9].map((x) => (
            <mesh key={x} position={[x, WALL - 0.45, zone.z]} material={hot}>
              <boxGeometry args={[0.025, 0.9, 0.025]} />
            </mesh>
          ))}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, zone.z]} material={hot}>
            <planeGeometry args={[HALF * 2 - 0.1, 0.05]} />
          </mesh>
        </group>
      ))}
      <Sign spec={endNote} position={[0, WALL / 2 + 0.2, -length + 0.03]} width={6} />
    </group>
  );
}

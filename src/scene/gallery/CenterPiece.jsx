import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOT, LAYER_IDS, PALETTE } from '../stack/config';
import { createSceneState } from '../stack/SceneContext';
import StackModel from '../stack/StackModel';

const SCALE = 0.3;

/**
 * The same living four-layer stack as the landing page, small, on a plinth in the middle of the room,
 * turning slowly. It is the one thing in the hall that moves on its own.
 */
export default function CenterPiece({ layerNames, techs }) {
  const scene = useMemo(createSceneState, []);
  const spin = useRef();
  const palette = PALETTE.dark;
  const ring = useMemo(() => new THREE.MeshBasicMaterial({ color: HOT, toneMapped: false }), []);

  useFrame((_, delta) => {
    spin.current.rotation.y += delta * 0.22;
  });

  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.95, 1.1, 0.4, 48]} />
        <meshStandardMaterial color="#14161a" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.405, 0]} material={ring}>
        <ringGeometry args={[0.86, 0.9, 64]} />
      </mesh>
      <group position={[0, 0.4 + 1.95 * SCALE + 0.35, 0]} scale={SCALE}>
        <group ref={spin}>
          <StackModel
            scene={scene}
            labels={Object.fromEntries(LAYER_IDS.map((id) => [id, layerNames?.[id] ?? id]))}
            palette={palette}
            techs={techs}
            high={false}
            showLabels={false}
            haloRadius={2.7}
            haloHeight={3.2}
          />
        </group>
      </group>
    </group>
  );
}

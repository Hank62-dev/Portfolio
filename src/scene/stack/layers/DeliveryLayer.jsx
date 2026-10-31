import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOT, TOP } from '../config';
import { hit, useScene } from '../SceneContext';

// Delivery: a pipeline. Builds slide along a track and light up when they pass the release gate.
const CRATES = 8;
const LENGTH = 3.0;
const GATE_X = 0.85;

export default function DeliveryLayer({ index, palette }) {
  const scene = useScene();
  const crates = useRef();
  const gate = useRef([]);
  const progress = useRef();
  const state = useRef({ flash: 0, passed: new Array(CRATES).fill(false) });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const before = useMemo(() => new THREE.Color(palette.dim).multiplyScalar(0.8), [palette.dim]);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }, delta) => {
    const s = state.current;
    const t = clock.elapsedTime;
    s.flash = Math.max(0, s.flash - delta * 2.4);

    for (let i = 0; i < CRATES; i += 1) {
      const phase = (t * 0.32 + i / CRATES) % 1;
      const x = (phase - 0.5) * LENGTH;
      const afterGate = x > GATE_X;
      if (afterGate && !s.passed[i]) {
        s.passed[i] = true;
        s.flash = 1;
        hit(scene, index, 0.65);
      }
      if (phase < 0.05) s.passed[i] = false;
      const lift = afterGate ? Math.min(1, (x - GATE_X) * 3) * 0.05 : 0;
      dummy.position.set(x, 0.1 + lift, 0);
      dummy.scale.setScalar(afterGate ? 1.15 : 1);
      dummy.updateMatrix();
      crates.current.setMatrixAt(i, dummy.matrix);
      color.copy(before).lerp(HOT, afterGate ? 1 : 0);
      crates.current.setColorAt(i, color);
    }
    crates.current.instanceMatrix.needsUpdate = true;
    crates.current.instanceColor.needsUpdate = true;

    gate.current.forEach((post) => {
      post.material.color.copy(before).lerp(HOT, s.flash);
    });
    // a deploy bar fills along the front edge, then starts again
    const filled = Math.max(0.001, (t * 0.32) % 1);
    progress.current.scale.x = filled;
    progress.current.position.x = (LENGTH * filled) / 2;
  });

  return (
    <group position={[0, TOP, 0]}>
      <mesh position={[0, 0.006, 0]}>
        <boxGeometry args={[LENGTH + 0.3, 0.012, 0.3]} />
        <meshStandardMaterial color={palette.card} roughness={0.7} />
      </mesh>
      <instancedMesh ref={crates} args={[undefined, undefined, CRATES]} frustumCulled={false}>
        <boxGeometry args={[0.2, 0.14, 0.2]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {[-0.2, 0.2].map((z, k) => (
        <mesh key={z} ref={(el) => (gate.current[k] = el)} position={[GATE_X + 0.2, 0.17, z]}>
          <boxGeometry args={[0.035, 0.34, 0.035]} />
          <meshBasicMaterial color={palette.dim} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[GATE_X + 0.2, 0.34, 0]}>
        <boxGeometry args={[0.035, 0.035, 0.44]} />
        <meshBasicMaterial color={HOT} toneMapped={false} />
      </mesh>
      <group position={[-LENGTH / 2, 0.012, 0.75]}>
        <mesh position={[LENGTH / 2, 0, 0]}>
          <boxGeometry args={[LENGTH, 0.008, 0.02]} />
          <meshBasicMaterial color={palette.dim} transparent opacity={0.35} />
        </mesh>
        <mesh ref={progress} position={[0, 0.002, 0]} scale={[0.001, 1, 1]}>
          <boxGeometry args={[LENGTH, 0.012, 0.03]} />
          <meshBasicMaterial color={HOT} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

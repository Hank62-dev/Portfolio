import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HOT, TOP } from '../config';
import { hit, useScene } from '../SceneContext';

// Data: a field of bars that rolls like a live histogram, and a query line that sweeps across it.
const COLS = 13;
const ROWS = 5;
const COUNT = COLS * ROWS;
const SPAN_X = 2.9;
const SPAN_Z = 1.5;

export default function DataLayer({ index, palette }) {
  const scene = useScene();
  const bars = useRef();
  const scan = useRef();
  const sweep = useRef({ last: 0 });
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const base = useMemo(() => new THREE.Color(palette.dim).multiplyScalar(0.7), [palette.dim]);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const scanX = Math.sin(t * 0.75) * (SPAN_X / 2);
    scan.current.position.x = scanX;

    // each pass of the scan line over the middle counts as a query landing on this layer
    if (Math.sign(Math.cos(t * 0.75)) !== sweep.current.last && Math.abs(scanX) < 0.3) {
      sweep.current.last = Math.sign(Math.cos(t * 0.75));
      hit(scene, index, 0.7);
    }

    let n = 0;
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const x = (c / (COLS - 1) - 0.5) * SPAN_X;
        const z = (r / (ROWS - 1) - 0.5) * SPAN_Z;
        const wave = Math.sin(t * 1.2 + c * 0.55) * 0.5 + 0.5;
        const drift = 0.65 + 0.35 * Math.sin(r * 1.3 + t * 0.5);
        const near = Math.exp(-((x - scanX) ** 2) / 0.06); // the query lights what it passes
        const h = 0.05 + 0.2 * wave * drift + near * 0.32;
        dummy.position.set(x, h / 2, z);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        bars.current.setMatrixAt(n, dummy.matrix);
        color.copy(base).lerp(HOT, Math.min(1, near * 1.15));
        bars.current.setColorAt(n, color);
        n += 1;
      }
    }
    bars.current.instanceMatrix.needsUpdate = true;
    bars.current.instanceColor.needsUpdate = true;
  });

  return (
    <group position={[0, TOP, 0]}>
      <instancedMesh ref={bars} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <boxGeometry args={[0.13, 1, 0.13]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <mesh ref={scan} position={[0, 0.2, 0]}>
        <boxGeometry args={[0.012, 0.4, SPAN_Z + 0.4]} />
        <meshBasicMaterial color={HOT} toneMapped={false} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

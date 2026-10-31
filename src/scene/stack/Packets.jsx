import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BEAM_HEIGHT, HOT, LAYER_IDS, TOP, layerY } from './config';
import { hit, useScene } from './SceneContext';

const MAX = 10;
const HALF = BEAM_HEIGHT / 2;

/**
 * The beam through the stack, and requests travelling down it: each one lights every layer it passes,
 * from interface to delivery. `getBurst` returns a counter; whenever it rises, a volley is sent at once.
 */
export default function Packets({ getBurst }) {
  const scene = useScene();
  const heads = useRef();
  const trails = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const packets = useMemo(() => Array.from({ length: MAX }, () => ({ y: HALF + 1, speed: 0, live: false, x: 0, z: 0 })), []);
  const timer = useRef(0.4);
  const lastBurst = useRef(getBurst());

  const launch = (delay = 0) => {
    const free = packets.find((p) => !p.live);
    if (!free) return;
    free.live = true;
    free.y = HALF + delay * 1.8; // a delay is just a higher starting point
    free.speed = 1.5 + Math.random() * 1.1;
    free.x = (Math.random() - 0.5) * 0.04;
    free.z = (Math.random() - 0.5) * 0.04;
  };

  useFrame((_, delta) => {
    timer.current -= delta;
    if (timer.current <= 0) {
      launch();
      timer.current = 0.9 + Math.random() * 1.3;
    }
    const burst = getBurst();
    if (burst !== lastBurst.current) {
      lastBurst.current = burst;
      for (let i = 0; i < 5; i += 1) launch(i * 0.35);
    }

    packets.forEach((p, i) => {
      if (p.live) {
        const before = p.y;
        p.y -= p.speed * delta;
        for (let layer = 0; layer < LAYER_IDS.length; layer += 1) {
          const at = layerY(layer, scene.spread.current) + TOP;
          if (before > at && p.y <= at) hit(scene, layer, 1);
        }
        if (p.y < -HALF - 0.3) p.live = false;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(p.live ? 1 : 0.0001);
      dummy.updateMatrix();
      heads.current.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x, p.y + 0.34, p.z);
      dummy.scale.set(1, p.live ? 1 : 0.0001, 1);
      dummy.updateMatrix();
      trails.current.setMatrixAt(i, dummy.matrix);
    });
    heads.current.instanceMatrix.needsUpdate = true;
    trails.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <mesh>
        <cylinderGeometry args={[0.012, 0.012, BEAM_HEIGHT, 8]} />
        <meshBasicMaterial color={HOT} toneMapped={false} />
      </mesh>
      <instancedMesh ref={heads} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <sphereGeometry args={[0.075, 16, 12]} />
        <meshBasicMaterial color={HOT} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={trails} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <boxGeometry args={[0.02, 0.62, 0.02]} />
        <meshBasicMaterial color={HOT} toneMapped={false} transparent opacity={0.5} />
      </instancedMesh>
    </>
  );
}

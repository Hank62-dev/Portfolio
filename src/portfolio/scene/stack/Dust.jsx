import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BEAM_HEIGHT, PLATE, seeded } from './config';

/** Specks of dust rising along the beam. */
export default function Dust({ count, color }) {
  const points = useRef();
  const { positions, colors, speeds } = useMemo(() => {
    const rand = seeded(11);
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const hot = new THREE.Color('#ff5b2e');
    const dust = new THREE.Color(color);
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = (rand() - 0.5) * PLATE[0] * 1.1;
      pos[i * 3 + 1] = (rand() - 0.5) * BEAM_HEIGHT;
      pos[i * 3 + 2] = (rand() - 0.5) * PLATE[2] * 1.1;
      (rand() < 0.3 ? hot : dust).toArray(col, i * 3);
      spd[i] = 0.2 + rand() * 0.5;
    }
    return { positions: pos, colors: col, speeds: spd };
  }, [count, color]);

  useFrame((_, delta) => {
    const attr = points.current?.geometry.attributes.position;
    if (!attr) return;
    const half = BEAM_HEIGHT / 2;
    for (let i = 0; i < count; i += 1) {
      let y = attr.array[i * 3 + 1] + speeds[i] * delta;
      if (y > half) y = -half;
      attr.array[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={colors} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.035} vertexColors transparent opacity={0.85} depthWrite={false} sizeAttenuation />
    </points>
  );
}

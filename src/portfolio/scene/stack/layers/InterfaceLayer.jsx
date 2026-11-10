import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { HOT, TOP } from '../config';
import { hit, useScene } from '../SceneContext';

// Interface: a screen of cards and a cursor that wanders between them, clicking.
const COLS = [-1.05, 0, 1.05];
const ROWS = [-0.52, 0.52];
const CARD = [0.78, 0.04, 0.78];
const CARD_COUNT = COLS.length * ROWS.length;

export default function InterfaceLayer({ index, palette }) {
  const scene = useScene();
  const cards = useRef([]);
  const lines = useRef();
  const cursor = useRef();
  const state = useRef({ target: 0, from: new THREE.Vector3(), timer: 0, lift: new Float32Array(CARD_COUNT) });

  const slots = useMemo(
    () => Array.from({ length: CARD_COUNT }, (_, i) => new THREE.Vector3(COLS[i % 3], 0, ROWS[Math.floor(i / 3)])),
    []
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }, delta) => {
    const s = state.current;
    const t = clock.elapsedTime;

    // The cursor glides to the next card; on arrival the card lifts and the whole layer pulses.
    s.timer += delta;
    const dest = slots[s.target];
    const c = cursor.current;
    c.position.x += (dest.x + 0.12 - c.position.x) * Math.min(1, delta * 4.5);
    c.position.z += (dest.z + 0.1 - c.position.z) * Math.min(1, delta * 4.5);
    c.position.y = 0.1 + Math.sin(t * 6) * 0.01;
    if (s.timer > 1.5) {
      s.timer = 0;
      s.lift[s.target] = 1;
      hit(scene, index, 0.6);
      s.target = (s.target + 1 + Math.floor(Math.random() * 3)) % CARD_COUNT;
    }

    let n = 0;
    cards.current.forEach((card, i) => {
      s.lift[i] = Math.max(0, s.lift[i] - delta * 1.6);
      card.position.y = 0.045 + Math.sin(t * 1.3 + i) * 0.006 + s.lift[i] * 0.09;
      card.material.emissiveIntensity = s.lift[i] * 1.6;
      // two "text lines" ride on each card
      for (let k = 0; k < 2; k += 1) {
        dummy.position.set(slots[i].x, card.position.y + 0.03, slots[i].z - 0.12 + k * 0.17);
        dummy.scale.set(k === 0 ? 0.52 : 0.34, 1, 1);
        dummy.updateMatrix();
        lines.current.setMatrixAt(n, dummy.matrix);
        n += 1;
      }
    });
    lines.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[0, TOP, 0]}>
      {slots.map((p, i) => (
        <mesh key={i} ref={(el) => (cards.current[i] = el)} position={[p.x, 0.045, p.z]}>
          <boxGeometry args={CARD} />
          <meshStandardMaterial color={palette.card} roughness={0.5} metalness={0.2} emissive="#ff5b2e" emissiveIntensity={0} />
          <Edges threshold={20} color="#ff7a4a" transparent opacity={0.55} />
        </mesh>
      ))}
      <instancedMesh ref={lines} args={[undefined, undefined, CARD_COUNT * 2]} frustumCulled={false}>
        <boxGeometry args={[1, 0.012, 0.045]} />
        <meshBasicMaterial color={HOT} toneMapped={false} transparent opacity={0.7} />
      </instancedMesh>
      <mesh ref={cursor} rotation={[Math.PI, 0, 0.5]}>
        <coneGeometry args={[0.06, 0.16, 3]} />
        <meshBasicMaterial color={HOT} toneMapped={false} />
      </mesh>
    </group>
  );
}

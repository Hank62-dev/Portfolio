import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import { HOT, PLATE, layerY } from './config';
import { useScene } from './SceneContext';

/**
 * One slab of the stack: the glass-black plate, its outline, a label, and a ring that spreads out
 * across it each time something lights the layer up. The layer's own content is passed as children.
 * In `stack` mode the layer chosen by `getFeatured()` rises and the others quieten.
 */
export default function Plate({ index, label, palette, mode, getFeatured, children }) {
  const scene = useScene();
  const group = useRef();
  const material = useRef();
  const ring = useRef();
  const ringMaterial = useRef();
  const lift = useRef(0);

  useFrame((_, delta) => {
    const featured = getFeatured();
    const lifted = mode === 'stack' && featured === index;
    const active = mode !== 'stack' || featured < 0 || featured === index;
    lift.current += ((lifted ? 0.32 : 0) - lift.current) * Math.min(1, delta * 5);
    group.current.position.y = layerY(index, scene.spread.current) + lift.current;

    scene.flash[index] = Math.max(0, scene.flash[index] - delta * 2.4);
    material.current.emissiveIntensity = scene.flash[index] * 0.22 + (lifted ? 0.1 : 0);
    material.current.opacity = active ? 0.97 : 0.62;

    if (scene.ripple[index] < 1) scene.ripple[index] = Math.min(1, scene.ripple[index] + delta * 0.8);
    const r = scene.ripple[index];
    ring.current.scale.setScalar(0.25 + r * 1.55);
    ring.current.visible = r < 1;
    ringMaterial.current.opacity = (1 - r) * 0.85;
  });

  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={PLATE} />
        <meshStandardMaterial ref={material} color={palette.slab} roughness={0.55} metalness={0.25} transparent emissive="#ff5b2e" emissiveIntensity={0} />
        <Edges threshold={20} color={palette.edge} transparent opacity={palette.edgeOpacity} />
      </mesh>
      <mesh ref={ring} position={[0, PLATE[1] / 2 + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.3, 0.9, 1]}>
        <ringGeometry args={[0.95, 1, 64]} />
        <meshBasicMaterial ref={ringMaterial} color={HOT} toneMapped={false} transparent depthWrite={false} />
      </mesh>
      {children}
      <Html position={[PLATE[0] / 2 + 0.2, 0, PLATE[2] / 2 - 0.1]} style={{ pointerEvents: 'none' }} zIndexRange={[5, 0]}>
        <span className="font-mono text-[10px] tracking-[0.12em] whitespace-nowrap text-bone-dim uppercase">
          <b className="mr-1.5 font-normal text-signal">{String(index + 1).padStart(2, '0')}</b>
          {label}
        </span>
      </Html>
    </group>
  );
}

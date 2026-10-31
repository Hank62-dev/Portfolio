import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { AGENT_ROUTES } from './layout';

const WALK_SPEED = 0.85;
const ARRIVAL_DISTANCE = 0.08;

function RobotModel({ color }) {
  return (
    <group scale={0.82}>
      <RoundedBox args={[0.48, 0.55, 0.36]} radius={0.1} position={[0, 0.82, 0]}>
        <meshStandardMaterial color="#d9d3c6" roughness={0.38} metalness={0.18} />
      </RoundedBox>
      <RoundedBox args={[0.58, 0.48, 0.42]} radius={0.14} position={[0, 1.28, 0]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.16} roughness={0.3} />
      </RoundedBox>
      <mesh position={[-0.12, 1.3, 0.215]}>
        <sphereGeometry args={[0.052, 12, 8]} />
        <meshBasicMaterial color="#0b0c0e" />
      </mesh>
      <mesh position={[0.12, 1.3, 0.215]}>
        <sphereGeometry args={[0.052, 12, 8]} />
        <meshBasicMaterial color="#0b0c0e" />
      </mesh>
      <mesh position={[0, 1.54, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.16, 8]} />
        <meshStandardMaterial color="#a8a396" />
      </mesh>
      <mesh position={[0, 1.64, 0]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[-0.35, 0.91, 0]} rotation={[0, 0, -0.32]}>
        <capsuleGeometry args={[0.065, 0.28, 5, 10]} />
        <meshStandardMaterial color="#a8a396" roughness={0.4} />
      </mesh>
      <mesh position={[0.35, 0.91, 0]} rotation={[0, 0, 0.32]}>
        <capsuleGeometry args={[0.065, 0.28, 5, 10]} />
        <meshStandardMaterial color="#a8a396" roughness={0.4} />
      </mesh>
      <mesh position={[-0.14, 0.4, 0]}>
        <capsuleGeometry args={[0.075, 0.38, 5, 10]} />
        <meshStandardMaterial color="#7d786c" roughness={0.42} />
      </mesh>
      <mesh position={[0.14, 0.4, 0]}>
        <capsuleGeometry args={[0.075, 0.38, 5, 10]} />
        <meshStandardMaterial color="#7d786c" roughness={0.42} />
      </mesh>
      <pointLight color={color} intensity={0.18} distance={1.4} />
    </group>
  );
}

/** Agents only walk their route after finishing a task; while working or offline they stay at their desk. */
const shouldRoam = (agent) => agent.status === 'completed';

export function Character({ agent, selected, onSelect, paused }) {
  const route = AGENT_ROUTES[agent.id];
  const ref = useRef();
  const waypoint = useRef(Math.floor(Math.random() * route.length));

  useFrame((_, delta) => {
    if (paused || !shouldRoam(agent)) return;
    const target = new THREE.Vector3(...route[waypoint.current]);
    const position = ref.current.position;
    const distance = position.distanceTo(target);
    if (distance < ARRIVAL_DISTANCE) {
      waypoint.current = (waypoint.current + 1) % route.length;
      return;
    }
    const step = Math.min(distance, delta * WALK_SPEED);
    position.lerp(target, step / Math.max(distance, 0.001));
    ref.current.rotation.y = Math.atan2(target.x - position.x, target.z - position.z);
  });

  const select = (event) => {
    event.stopPropagation();
    onSelect(agent.id);
  };

  return (
    <group ref={ref} position={route[0]} onClick={select}>
      <RobotModel color={agent.color} />
      {selected && <pointLight color={agent.color} intensity={2} distance={2.2} position={[0, 1, 0]} />}
      <Html position={[0, 2, 0]} center distanceFactor={9}>
        <button
          onClick={select}
          aria-pressed={selected}
          className="flex min-w-28 flex-col rounded-sm border bg-ink-1/90 px-2.5 py-1.5 text-left font-mono whitespace-nowrap backdrop-blur-sm transition-shadow"
          style={{ borderColor: agent.color, boxShadow: selected ? `0 0 0 2px ${agent.color}` : 'none' }}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-bone">
            <i className="size-1.5 rounded-full" style={{ background: agent.color }} aria-hidden="true" />
            {agent.name}
          </span>
          <small className="text-[9px] text-bone-dim">
            {agent.role} · {agent.status}
          </small>
        </button>
      </Html>
    </group>
  );
}

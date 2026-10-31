import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text, useGLTF } from '@react-three/drei';
import { MODEL_BASE, SERVER_ROOM } from './layout';

const DOOR_WIDTH = 1.55;
const WALL_HEIGHT = 1.45;

/** Four walls (one with a door gap), a glowing door lintel, corner posts and the room labels. */
export function Room({ position, size, title, color, number }) {
  const [width, depth] = size;
  const wallY = WALL_HEIGHT / 2;
  const segmentWidth = (width - DOOR_WIDTH) / 2;
  const wall = <meshStandardMaterial color="#263640" transparent opacity={0.42} roughness={0.72} />;
  const posts = [-width / 2, width / 2, -DOOR_WIDTH / 2, DOOR_WIDTH / 2];

  return (
    <group position={position}>
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[width, 0.05, depth]} />
        <meshStandardMaterial color="#13222c" roughness={0.8} />
      </mesh>
      <mesh position={[0, wallY, -depth / 2]}>
        <boxGeometry args={[width, WALL_HEIGHT, 0.12]} />
        {wall}
      </mesh>
      <mesh position={[-width / 2, wallY, 0]}>
        <boxGeometry args={[0.12, WALL_HEIGHT, depth]} />
        {wall}
      </mesh>
      <mesh position={[width / 2, wallY, 0]}>
        <boxGeometry args={[0.12, WALL_HEIGHT, depth]} />
        {wall}
      </mesh>
      <mesh position={[-(width + DOOR_WIDTH) / 4, wallY, depth / 2]}>
        <boxGeometry args={[segmentWidth, WALL_HEIGHT, 0.12]} />
        {wall}
      </mesh>
      <mesh position={[(width + DOOR_WIDTH) / 4, wallY, depth / 2]}>
        <boxGeometry args={[segmentWidth, WALL_HEIGHT, 0.12]} />
        {wall}
      </mesh>
      <mesh position={[0, WALL_HEIGHT, depth / 2]}>
        <boxGeometry args={[DOOR_WIDTH, 0.08, 0.12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
      </mesh>
      {posts.map((x) => (
        <mesh key={x} position={[x, wallY, Math.abs(x) === DOOR_WIDTH / 2 ? depth / 2 : 0]}>
          <boxGeometry args={[0.08, WALL_HEIGHT, 0.08]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
        </mesh>
      ))}
      <Text position={[-width / 2 + 0.18, WALL_HEIGHT - 0.12, -depth / 2 + 0.05]} fontSize={0.14} color="#d4faf4" anchorX="left">
        {title}
      </Text>
      <Text position={[width / 2 - 0.2, WALL_HEIGHT - 0.12, -depth / 2 + 0.05]} fontSize={0.1} color={color} anchorX="right">
        {number}
      </Text>
      <Text position={[0, 0.58, depth / 2 + 0.05]} rotation={[0, Math.PI, 0]} fontSize={0.08} color="#8fb8b5" anchorX="center">
        DOOR / OPEN
      </Text>
    </group>
  );
}

function OfficeAsset({ file, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const { scene } = useGLTF(`${MODEL_BASE}/${file}`);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = false;
      }
    });
    return clone;
  }, [scene]);
  return <primitive object={model} position={position} rotation={rotation} scale={scale} />;
}

/** A monitor face with a pulsing status bar. */
function WorkScreen({ position, color }) {
  const pulse = useRef(null);
  useFrame(({ clock }) => {
    if (pulse.current) pulse.current.scale.x = 0.72 + Math.sin(clock.elapsedTime * 2.4 + position[0]) * 0.12;
  });
  return (
    <group position={position}>
      <mesh rotation={[-0.06, 0, 0]}>
        <planeGeometry args={[0.42, 0.28]} />
        <meshBasicMaterial color="#071116" />
      </mesh>
      <mesh ref={pulse} position={[0, -0.07, 0.006]} rotation={[-0.06, 0, 0]}>
        <planeGeometry args={[0.3, 0.018]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.015, 0.006]} rotation={[-0.06, 0, 0]}>
        <planeGeometry args={[0.22, 0.014]} />
        <meshBasicMaterial color="#397482" />
      </mesh>
      <mesh position={[0, 0.04, 0.006]} rotation={[-0.06, 0, 0]}>
        <planeGeometry args={[0.34, 0.012]} />
        <meshBasicMaterial color="#234b59" />
      </mesh>
      <pointLight color={color} intensity={0.18} distance={1.2} />
    </group>
  );
}

export function Desk({ position, color = '#27424d' }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.95, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>
      <OfficeAsset file="desk.glb" position={[0.36, 0, 0]} scale={1.35} />
      <OfficeAsset file="vector-office-chair.glb" position={[0, 0, 0.78]} rotation={[0, Math.PI, 0]} scale={0.72} />
      <OfficeAsset file="monitor.glb" position={[-0.24, 0.64, 0.14]} rotation={[0, 0.035, 0]} scale={0.55} />
      <OfficeAsset file="monitor.glb" position={[0.24, 0.64, 0.14]} rotation={[0, -0.035, 0]} scale={0.55} />
      <WorkScreen position={[-0.24, 0.75, 0.26]} color="#62e7d3" />
      <WorkScreen position={[0.24, 0.75, 0.26]} color="#c9a5ff" />
      <OfficeAsset file="desk_lamp.glb" position={[-0.42, 0.66, 0.36]} rotation={[0, Math.PI, 0]} scale={0.52} />
      <pointLight position={[-0.42, 1.02, 0.36]} color="#ffd28a" intensity={0.46} distance={2.1} />
    </group>
  );
}

function ServerRack({ position, accent }) {
  const unitYs = [-0.85, -0.48, -0.11, 0.26, 0.63, 1];
  return (
    <group position={position}>
      <RoundedBox args={[0.92, 2.5, 0.68]} radius={0.06}>
        <meshStandardMaterial color="#101b24" metalness={0.6} roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 1.29, 0]}>
        <boxGeometry args={[0.72, 0.04, 0.54]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
      </mesh>
      {unitYs.map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0.36]}>
            <boxGeometry args={[0.68, 0.22, 0.025]} />
            <meshStandardMaterial color="#091118" />
          </mesh>
          <mesh position={[-0.25, y, 0.39]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color={accent} />
          </mesh>
          <mesh position={[-0.15, y, 0.39]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#ffb76b" />
          </mesh>
          <mesh position={[0.18, y, 0.39]}>
            <boxGeometry args={[0.22, 0.025, 0.01]} />
            <meshBasicMaterial color="#335461" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function ServerRoom() {
  const wall = <meshStandardMaterial color="#234651" transparent opacity={0.3} roughness={0.7} />;
  return (
    <group position={SERVER_ROOM.position}>
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[8.4, 0.05, 7.2]} />
        <meshStandardMaterial color="#10232c" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.2, -3.6]}>
        <boxGeometry args={[8.4, 2.4, 0.1]} />
        {wall}
      </mesh>
      <mesh position={[-4.2, 1.2, 0]}>
        <boxGeometry args={[0.1, 2.4, 7.2]} />
        {wall}
      </mesh>
      <mesh position={[4.2, 1.2, 0]}>
        <boxGeometry args={[0.1, 2.4, 7.2]} />
        {wall}
      </mesh>
      {SERVER_ROOM.rackXs.map((x, index) => (
        <group key={x}>
          <ServerRack position={[x, 0, -0.75]} accent={index % 2 ? '#c9a5ff' : '#62e7d3'} />
          <ServerRack position={[x, 0, 0.75]} accent={index % 2 ? '#ffb76b' : '#62e7d3'} />
        </group>
      ))}
      <Text position={[-3.95, 2.05, -3.52]} fontSize={0.18} color="#d4faf4" anchorX="left">
        CONTROL / SERVER ROOM
      </Text>
      <Text position={[-3.95, 1.78, -3.52]} fontSize={0.1} color="#6eafb0" anchorX="left">
        24 NODES · LIVE INFERENCE · 24/7
      </Text>
      <pointLight position={[0, 2, 0]} color="#62e7d3" intensity={2.5} distance={7} />
    </group>
  );
}

import { tr } from '../../core/i18n/lang';
import { Component, Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text, useGLTF } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import { MODEL_BASE, SERVER_ROOM } from './layout';

const DOOR_WIDTH = 1.55;
const WALL_HEIGHT = 1.45;

/** Four walls (one with a door gap), a glowing door lintel, corner posts and the room labels. */
export function Room({ position, size, title, color, number }) {
  const [width, depth] = size;
  const wallY = WALL_HEIGHT / 2;
  const segmentWidth = (width - DOOR_WIDTH) / 2;
  const wall = <meshStandardMaterial color="#2b2e34" transparent opacity={0.42} roughness={0.72} />;
  const posts = [-width / 2, width / 2, -DOOR_WIDTH / 2, DOOR_WIDTH / 2];

  return (
    <group position={position}>
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[width, 0.05, depth]} />
        <meshStandardMaterial color="#14161a" roughness={0.8} />
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
      <Label position={[-width / 2 + 0.18, WALL_HEIGHT - 0.12, -depth / 2 + 0.05]} fontSize={0.14} color="#ece6da" anchorX="left">
        {title}
      </Label>
      <Label position={[width / 2 - 0.2, WALL_HEIGHT - 0.12, -depth / 2 + 0.05]} fontSize={0.1} color={color} anchorX="right">
        {number}
      </Label>
      <Label position={[0, 0.58, depth / 2 + 0.05]} rotation={[0, Math.PI, 0]} fontSize={0.08} color="#a8a396" anchorX="center">
        {tr('DOOR / OPEN')}
      </Label>
    </group>
  );
}

/** Draws nothing, and does not take the rest of the floor down with it, when what is inside fails (a model that did not download, a font). */
class Fallible extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('3D floor: left out a part that failed to load', error?.message ?? error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** A part of the floor that loads by itself: the floor draws at once and the part appears when it is ready. */
const Part = ({ children }) => (
  <Fallible>
    <Suspense fallback={null}>{children}</Suspense>
  </Fallible>
);

/** Text on the floor. Its font comes from the network, so it is a Part: a slow font never holds the floor back. */
export const Label = (props) => (
  <Part>
    <Text {...props} />
  </Part>
);

function OfficeModel({ file, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, height }) {
  const { scene } = useGLTF(`${MODEL_BASE}/${file}`);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = false;
      }
    });
    if (!height) return clone;
    // some models come in their own units (a chair 35,000 wide): stand it on the floor, centred, at the height asked for
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    if (!(size.y > 0)) return clone;
    const holder = clone;
    holder.scale.multiplyScalar(height / size.y);
    const fitted = new Box3().setFromObject(holder);
    const middle = fitted.getCenter(new Vector3());
    holder.position.set(holder.position.x - middle.x, holder.position.y - fitted.min.y, holder.position.z - middle.z);
    return holder;
  }, [scene, height]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={model} />
    </group>
  );
}

const OfficeAsset = (props) => (
  <Part>
    <OfficeModel {...props} />
  </Part>
);

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
        <meshBasicMaterial color="#0b0c0e" />
      </mesh>
      <mesh ref={pulse} position={[0, -0.07, 0.006]} rotation={[-0.06, 0, 0]}>
        <planeGeometry args={[0.3, 0.018]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.015, 0.006]} rotation={[-0.06, 0, 0]}>
        <planeGeometry args={[0.22, 0.014]} />
        <meshBasicMaterial color="#6a6658" />
      </mesh>
      <mesh position={[0, 0.04, 0.006]} rotation={[-0.06, 0, 0]}>
        <planeGeometry args={[0.34, 0.012]} />
        <meshBasicMaterial color="#3a3d44" />
      </mesh>
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
      <OfficeAsset file="chair_office.glb" position={[0, 0, 0.78]} rotation={[0, Math.PI, 0]} height={1} />
      <OfficeAsset file="monitor.glb" position={[-0.24, 0.64, 0.14]} rotation={[0, 0.035, 0]} scale={0.55} />
      <OfficeAsset file="monitor.glb" position={[0.24, 0.64, 0.14]} rotation={[0, -0.035, 0]} scale={0.55} />
      <WorkScreen position={[-0.24, 0.75, 0.26]} color="#62e7d3" />
      <WorkScreen position={[0.24, 0.75, 0.26]} color="#c9a5ff" />
      <OfficeAsset file="desk_lamp.glb" position={[-0.42, 0.66, 0.36]} rotation={[0, Math.PI, 0]} scale={0.52} />
    </group>
  );
}

function ServerRack({ position, accent }) {
  const unitYs = [-0.85, -0.48, -0.11, 0.26, 0.63, 1];
  return (
    <group position={position}>
      <RoundedBox args={[0.92, 2.5, 0.68]} radius={0.06}>
        <meshStandardMaterial color="#1a1c21" metalness={0.6} roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 1.29, 0]}>
        <boxGeometry args={[0.72, 0.04, 0.54]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2} />
      </mesh>
      {unitYs.map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0.36]}>
            <boxGeometry args={[0.68, 0.22, 0.025]} />
            <meshStandardMaterial color="#0b0c0e" />
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
            <meshBasicMaterial color="#4a4d55" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function ServerRoom() {
  const wall = <meshStandardMaterial color="#2b2e34" transparent opacity={0.3} roughness={0.7} />;
  return (
    <group position={SERVER_ROOM.position}>
      <mesh position={[0, 0.025, 0]}>
        <boxGeometry args={[8.4, 0.05, 7.2]} />
        <meshStandardMaterial color="#14161a" roughness={0.8} />
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
      <Label position={[-3.95, 2.05, -3.52]} fontSize={0.18} color="#ece6da" anchorX="left">
        {tr('CONTROL / SERVER ROOM')}
      </Label>
      <Label position={[-3.95, 1.78, -3.52]} fontSize={0.1} color="#a8a396" anchorX="left">
        {tr('24 NODES · LIVE INFERENCE · 24/7')}
      </Label>
      <pointLight position={[0, 2, 0]} color="#62e7d3" intensity={2.5} distance={7} />
    </group>
  );
}

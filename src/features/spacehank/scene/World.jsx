import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, RoundedBox, Text } from '@react-three/drei';
import { Desk, Room, ServerRoom } from './Furniture';
import { Character } from './Robot';
import { MEETING_TABLE, ROOMS } from './layout';

/** The WebGL company floor. Loaded lazily, so three.js only downloads when someone opens the floor. */
export default function World({ agents, selected, onSelect, paused }) {
  return (
    <Canvas dpr={[1, 1.15]} className="webgl-world" onPointerMissed={() => onSelect(null)}>
      <PerspectiveCamera makeDefault position={[14, 16, 19]} fov={42} />
      <color attach="background" args={['#0b0c0e']} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[4, 10, 5]} intensity={3} color="#ffe9d9" />
      <pointLight position={[0, 4, 0]} intensity={7} distance={15} color="#ff8a5c" />
      <group rotation={[0, -0.25, 0]}>
        <mesh receiveShadow position={[0, -0.02, 4.5]}>
          <boxGeometry args={[28, 0.04, 25]} />
          <meshStandardMaterial color="#17191d" roughness={0.8} />
        </mesh>
        <gridHelper args={[30, 30, '#3a3d44', '#24272d']} position={[0, 0.015, 4.5]} />
        {ROOMS.map(({ id, desks, ...room }) => (
          <group key={id}>
            <Room {...room} />
            {desks.map((desk) => (
              <Desk key={desk.position.join(',')} {...desk} />
            ))}
          </group>
        ))}
        <ServerRoom />
        <RoundedBox args={MEETING_TABLE.size} radius={0.12} position={MEETING_TABLE.position}>
          <meshStandardMaterial color="#3a3229" emissive="#ff5b2e" emissiveIntensity={0.15} />
        </RoundedBox>
        <Text position={[-1, 0.3, 14.6]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.18} color="#ece6da">
          AGENT SYNC / MEETING ROOM
        </Text>
        {agents.map((agent) => (
          <Character key={agent.id} agent={agent} selected={selected === agent.id} onSelect={onSelect} paused={paused} />
        ))}
      </group>
      <OrbitControls
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={36}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0, 4]}
      />
    </Canvas>
  );
}

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { LOUNGE_TABLE, MEETING_TABLE, PING_PONG, PODS, ZONES, bridgeTo } from './layout';
import { tr } from '../../core/i18n/lang';

// The side decks of the station, each reached from the work deck over a glass bridge: the meeting room (a round table with a
// turning hologram), the lounge (bean bags round a low table, a coffee machine, a ping-pong table) and the sleeping quarters
// (a pod for everyone, under a dim violet light). Plain geometry, one light per deck.

export const ZONE_COLOR = { work: '#7fb0ff', meeting: '#ffc46b', lounge: '#6be0c0', sleep: '#b49cff' };
export const zoneName = (id) => ({ work: tr('Work deck'), meeting: tr('Meeting room'), lounge: tr('Lounge'), sleep: tr('Sleeping quarters') })[id];

/** A side deck's floor: a disc, its glowing rim, and its name over it (tapping the name flies the camera there). */
function SideDeck({ zone, color, onFocus, children }) {
  return (
    <group position={[zone.x, 0, zone.z]}>
      <mesh position={[0, -0.16, 0]} onClick={(event) => (event.stopPropagation(), onFocus(zone.id))}>
        <cylinderGeometry args={[zone.radius, zone.radius - 0.3, 0.32, 64]} />
        <meshStandardMaterial color="#151a27" metalness={0.6} roughness={0.45} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[zone.radius, 0.06, 8, 96]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[zone.radius - 0.9, zone.radius - 0.84, 72]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      <pointLight position={[0, 3, 0]} intensity={9} distance={zone.radius * 2.4} decay={1.6} color={color} />
      <Html position={[0, 3.4, -zone.radius + 0.6]} center zIndexRange={[20, 0]}>
        <button type="button" className="station-zone-tag" style={{ '--c': color }} onClick={() => onFocus(zone.id)}>
          {zoneName(zone.id)}
        </button>
      </Html>
      {children}
    </group>
  );
}

/** A glass bridge from the work deck to a side deck: a clear floor, glowing rails and ribs arching over it. */
export function Bridge({ to }) {
  const b = bridgeTo(to);
  const ribs = Math.max(2, Math.floor(b.length / 1.6));
  const color = ZONE_COLOR[to];
  return (
    <group position={[b.mid[0], 0, b.mid[1]]} rotation={[0, b.angle, 0]}>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[1.7, 0.06, b.length]} />
        <meshStandardMaterial color="#a8d4ff" transparent opacity={0.16} metalness={0.2} roughness={0.05} depthWrite={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.85, 0.55, 0]}>
          <boxGeometry args={[0.04, 0.04, b.length]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`edge${side}`} position={[side * 0.85, -0.02, 0]}>
          <boxGeometry args={[0.03, 0.03, b.length]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
      {Array.from({ length: ribs }, (_, i) => (
        <mesh key={i} position={[0, 0, -b.length / 2 + ((i + 0.5) * b.length) / ribs]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.95, 0.018, 6, 24, Math.PI]} />
          <meshBasicMaterial color="#cfe6ff" transparent opacity={0.28} />
        </mesh>
      ))}
    </group>
  );
}

/** The meeting room: a round table, a hologram turning over it, eight chairs. */
export function MeetingDeck({ onFocus, paused }) {
  const holo = useRef();
  useFrame((_, delta) => {
    if (!paused && holo.current) holo.current.rotation.y += delta * 0.5;
  });
  const zone = ZONES.meeting;
  const local = [MEETING_TABLE.x - zone.x, MEETING_TABLE.z - zone.z];
  return (
    <SideDeck zone={zone} color={ZONE_COLOR.meeting} onFocus={onFocus}>
      <group position={[local[0], 0, local[1]]}>
        <mesh position={[0, 0.74, 0]}>
          <cylinderGeometry args={[1.55, 1.55, 0.08, 48]} />
          <meshStandardMaterial color="#2b3244" metalness={0.55} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.25, 0.45, 0.72, 16]} />
          <meshStandardMaterial color="#202636" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.79, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.42, 40]} />
          <meshBasicMaterial color={ZONE_COLOR.meeting} transparent opacity={0.8} />
        </mesh>
        <group ref={holo} position={[0, 1.55, 0]}>
          <mesh>
            <octahedronGeometry args={[0.42, 0]} />
            <meshBasicMaterial color={ZONE_COLOR.meeting} wireframe transparent opacity={0.75} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.62, 0.012, 6, 48]} />
            <meshBasicMaterial color={ZONE_COLOR.meeting} transparent opacity={0.6} />
          </mesh>
        </group>
        <mesh position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.02, 0.4, 0.7, 24, 1, true]} />
          <meshBasicMaterial color={ZONE_COLOR.meeting} transparent opacity={0.12} depthWrite={false} />
        </mesh>
      </group>
      {Array.from({ length: 8 }, (_, i) => {
        const angle = Math.PI / 8 + (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[local[0] + 2.45 * Math.sin(angle), 0.36, local[1] + 2.45 * Math.cos(angle)]}>
            <cylinderGeometry args={[0.28, 0.28, 0.08, 18]} />
            <meshStandardMaterial color="#323a4e" roughness={0.5} />
          </mesh>
        );
      })}
    </SideDeck>
  );
}

/** The lounge: bean bags round a low table, a coffee machine, a ping-pong table with a ball flying when two play. */
export function LoungeDeck({ onFocus, paused, playing }) {
  const zone = ZONES.lounge;
  const table = [LOUNGE_TABLE.x - zone.x, LOUNGE_TABLE.z - zone.z];
  const pong = [PING_PONG.x - zone.x, PING_PONG.z - zone.z];
  const bags = ['#ff7a90', '#6be0c0', '#ffc46b', '#8fb4ff', '#c79bff', '#ff9d5c', '#7fd6a2'];
  return (
    <SideDeck zone={zone} color={ZONE_COLOR.lounge} onFocus={onFocus}>
      {/* a soft round rug and the low table on it */}
      <mesh position={[table[0], 0.01, table[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.9, 48]} />
        <meshStandardMaterial color="#1f2b3a" roughness={0.9} />
      </mesh>
      <mesh position={[table[0], 0.28, table[1]]}>
        <cylinderGeometry args={[0.7, 0.7, 0.08, 32]} />
        <meshStandardMaterial color="#3a3550" roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[table[0], 0.14, table[1]]}>
        <cylinderGeometry args={[0.12, 0.2, 0.26, 12]} />
        <meshStandardMaterial color="#202636" />
      </mesh>
      {/* two cups on it */}
      {[-0.25, 0.25].map((dx) => (
        <mesh key={dx} position={[table[0] + dx, 0.38, table[1] + 0.1]}>
          <cylinderGeometry args={[0.07, 0.06, 0.14, 12]} />
          <meshStandardMaterial color="#f4efe6" />
        </mesh>
      ))}
      {Array.from({ length: 7 }, (_, i) => {
        const angle = Math.PI / 7 + (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[table[0] + 2.25 * Math.sin(angle), 0.2, table[1] + 2.25 * Math.cos(angle)]} scale={[1, 0.55, 1]}>
            <sphereGeometry args={[0.42, 18, 12]} />
            <meshStandardMaterial color={bags[i % bags.length]} roughness={0.85} />
          </mesh>
        );
      })}
      {/* the coffee machine at the edge, its light on */}
      <group position={[table[0] - 0.6, 0, table[1] - 3.6]}>
        <RoundedBox args={[0.7, 1.2, 0.5]} radius={0.06} position={[0, 0.6, 0]}>
          <meshStandardMaterial color="#2d2a3a" metalness={0.5} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, 0.95, 0.26]}>
          <boxGeometry args={[0.4, 0.18, 0.02]} />
          <meshStandardMaterial color="#111" emissive={ZONE_COLOR.lounge} emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
      </group>
      {/* the ping-pong table, lengthwise along z */}
      <group position={[pong[0], 0, pong[1]]}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[1.1, 0.05, PING_PONG.half * 2]} />
          <meshStandardMaterial color="#1f6b5a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.726, 0]}>
          <boxGeometry args={[0.02, 0.005, PING_PONG.half * 2]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[1.2, 0.14, 0.02]} />
          <meshStandardMaterial color="#e8eef8" transparent opacity={0.6} />
        </mesh>
        {[-0.45, 0.45].map((dx) =>
          [-0.8, 0.8].map((dz) => (
            <mesh key={`${dx}${dz}`} position={[dx, 0.34, dz]}>
              <boxGeometry args={[0.05, 0.68, 0.05]} />
              <meshStandardMaterial color="#202636" />
            </mesh>
          )),
        )}
        {playing && <PingPongBall paused={paused} />}
      </group>
    </SideDeck>
  );
}

/** The ball between the two players: across the table and back, bouncing once on each half. */
function PingPongBall({ paused }) {
  const ball = useRef();
  const t = useRef(0);
  useFrame((_, delta) => {
    if (paused) return;
    t.current += delta;
    const cycle = 1.6; // one there and back
    const phase = (t.current % cycle) / cycle; // 0..1
    const leg = phase < 0.5 ? phase * 2 : (phase - 0.5) * 2; // 0..1 along one way
    const dir = phase < 0.5 ? 1 : -1;
    const z = dir * (-PING_PONG.half - 0.2 + leg * (PING_PONG.half * 2 + 0.4));
    // over the net, down onto the far half, up again to the bat
    const y = 0.74 + (leg < 0.7 ? Math.sin((leg / 0.7) * Math.PI) * 0.35 : Math.sin(((leg - 0.7) / 0.3) * Math.PI) * 0.18);
    ball.current.position.set(Math.sin(t.current * 2.3) * 0.25, y, z);
  });
  return (
    <mesh ref={ball}>
      <sphereGeometry args={[0.045, 12, 8]} />
      <meshBasicMaterial color="#fff6e0" toneMapped={false} />
    </mesh>
  );
}

/** The sleeping quarters: a pod for each crew member, a glass lid over each, a dim light inside. */
export function SleepDeck({ onFocus, taken }) {
  const zone = ZONES.sleep;
  return (
    <SideDeck zone={zone} color={ZONE_COLOR.sleep} onFocus={onFocus}>
      {PODS.map((pod, i) => (
        <group key={i} position={[pod.x - zone.x, 0, pod.z - zone.z]} rotation={[0, pod.angle, 0]}>
          {/* the bed, lengthwise from the centre outwards (z of the pod's frame) */}
          <RoundedBox args={[0.8, 0.36, 1.75]} radius={0.12} position={[0, 0.18, 0]}>
            <meshStandardMaterial color="#262c3f" metalness={0.4} roughness={0.5} />
          </RoundedBox>
          <mesh position={[0, 0.37, 0]}>
            <boxGeometry args={[0.66, 0.03, 1.55]} />
            <meshStandardMaterial color="#3d3566" emissive={ZONE_COLOR.sleep} emissiveIntensity={taken.includes(i) ? 0.55 : 0.08} />
          </mesh>
          <mesh position={[0, 0.37, 0]} rotation={[0, 0, 0]} scale={[0.42, 0.34, 0.95]}>
            <sphereGeometry args={[1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#cbbcff" transparent opacity={0.13} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </SideDeck>
  );
}

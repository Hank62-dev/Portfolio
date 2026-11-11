import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line, RoundedBox, Sparkles, Trail } from '@react-three/drei';
import { LOUNGE_TABLE, MEETING_TABLE, PING_PONG, PODS, ZONES, bridgeTo } from './layout';
import { tr } from '../../core/i18n/lang';

// The side decks of the station, each reached from the work deck over a glass bridge: the meeting room (a round table with a
// turning hologram, chairs with backs, a wall screen), the lounge (bean bags round a low table under string lights, a coffee
// machine that steams, a jukebox, an arcade cabinet, plants, a ping-pong table) and the sleeping quarters (a pod for everyone,
// whose lid closes over a sleeper and opens again, round a moon lamp). A deck lights up, slowly, as people come in, and every
// change (a lid, a light, the hologram) eases to where it goes instead of jumping.

export const ZONE_COLOR = { work: '#7fb0ff', meeting: '#ffc46b', lounge: '#6be0c0', sleep: '#b49cff' };
export const zoneName = (id) => ({ work: tr('Work deck'), meeting: tr('Meeting room'), lounge: tr('Lounge'), sleep: tr('Sleeping quarters') })[id];

/** Eases `now` toward `goal`, `speed` a second: for lights, lids and sizes that change smoothly. */
const ease = (now, goal, delta, speed = 3) => now + (goal - now) * Math.min(1, delta * speed);

/** The way to the work deck from a side deck's centre, as an angle about it (that is where its bridge lands, and the rail opens). */
const doorAngle = (zone) => Math.atan2(-zone.x, -zone.z);
const at = (radius, angle, y = 0) => [radius * Math.sin(angle), y, radius * Math.cos(angle)];

/**
 * A side deck: a disc with floor lines, a glass rail with an opening for the bridge, struts and a hub underneath, a glowing
 * rim and a light that brighten as people come in (`crowd`), and its name over it (tapping it flies the camera there).
 */
function SideDeck({ zone, color, onFocus, crowd = 0, paused, children }) {
  const light = useRef();
  const rim = useRef();
  const lines = useRef();
  const pool = useRef();
  const glow = useRef(0.3);
  const door = doorAngle(zone);
  const gap = 1.25 / zone.radius; // half the opening, in radians
  const rail = zone.radius - 0.08;
  const posts = Math.round((zone.radius * Math.PI * 2) / 1.4);

  useFrame(({ clock }, delta) => {
    if (paused) return;
    glow.current = ease(glow.current, 0.3 + Math.min(crowd, 4) * 0.175, delta, 1.2);
    const g = glow.current;
    const pulse = Math.sin(clock.elapsedTime * 1.4 + zone.x) * 0.06;
    if (light.current) light.current.intensity = 5 + g * 9;
    if (rim.current) rim.current.opacity = 0.45 + g * 0.5 + pulse;
    if (lines.current) lines.current.opacity = 0.12 + g * 0.22 + pulse;
    if (pool.current) pool.current.children.forEach((m) => (m.material.opacity = 0.035 + g * 0.05));
  });

  return (
    <group position={[zone.x, 0, zone.z]}>
      <mesh position={[0, -0.16, 0]} onClick={(event) => (event.stopPropagation(), onFocus(zone.id))}>
        <cylinderGeometry args={[zone.radius, zone.radius - 0.3, 0.32, 72]} />
        <meshStandardMaterial color="#151a27" metalness={0.6} roughness={0.45} />
      </mesh>
      {/* the floor: a lighter inlay, rings of light and spokes */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[zone.radius - 0.55, 72]} />
        <meshStandardMaterial color="#1a2030" metalness={0.45} roughness={0.55} />
      </mesh>
      {/* a soft pool of the deck's light on the floor, brightest in the middle */}
      <group ref={pool}>
        {[0.28, 0.5, 0.72, 0.92].map((k) => (
          <mesh key={k} position={[0, 0.006 + k * 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[zone.radius * k, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.05} blending={2} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {[zone.radius - 0.86, zone.radius * 0.36].map((r, i) => (
        <mesh key={r} position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 0.05, 80]} />
          <meshBasicMaterial ref={i === 0 ? lines : undefined} color={color} transparent opacity={0.3} />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r = zone.radius * 0.36 + (zone.radius - 0.9 - zone.radius * 0.36) / 2;
        return (
          <mesh key={i} position={at(r, a, 0.007)} rotation={[0, a, 0]}>
            <boxGeometry args={[0.03, 0.002, zone.radius - 0.9 - zone.radius * 0.36]} />
            <meshBasicMaterial color={color} transparent opacity={0.1} />
          </mesh>
        );
      })}
      {/* the rim and a glass rail round it, open where the bridge comes in */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[zone.radius, 0.07, 8, 120]} />
        <meshBasicMaterial ref={rim} color={color} transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[rail, rail, 0.6, 96, 1, true, door + gap, Math.PI * 2 - gap * 2]} />
        <meshStandardMaterial color="#a8d4ff" transparent opacity={0.09} side={2} depthWrite={false} />
      </mesh>
      <group rotation={[0, door + Math.PI * 2 - gap - Math.PI / 2, 0]}>
        <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[rail, 0.022, 6, 120, Math.PI * 2 - gap * 2]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      </group>
      {Array.from({ length: posts }, (_, i) => {
        const a = door + gap + ((i + 0.5) / posts) * (Math.PI * 2 - gap * 2);
        return (
          <mesh key={i} position={at(rail, a, 0.31)}>
            <cylinderGeometry args={[0.025, 0.025, 0.62, 6]} />
            <meshStandardMaterial color="#3a4358" metalness={0.7} roughness={0.35} />
          </mesh>
        );
      })}
      {/* struts and a hub underneath, so it reads as part of the station */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        return (
          <group key={i} position={at(zone.radius * 0.45, a, -0.85)} rotation={[0, a, 0]}>
            <mesh rotation={[0.6, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 2.1, 8]} />
              <meshStandardMaterial color="#2a3042" metalness={0.7} roughness={0.4} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, -1.45, 0]}>
        <sphereGeometry args={[0.5, 20, 14]} />
        <meshStandardMaterial color="#232a3b" metalness={0.7} roughness={0.35} emissive={color} emissiveIntensity={0.08} />
      </mesh>
      <pointLight ref={light} position={[0, 3, 0]} intensity={8} distance={zone.radius * 2.6} decay={1.6} color={color} />
      <Html position={[0, 3.6, -zone.radius + 0.6]} center zIndexRange={[20, 0]}>
        <button type="button" className="station-zone-tag" style={{ '--c': color }} onClick={() => onFocus(zone.id)}>
          {zoneName(zone.id)}
          {crowd > 0 && <b className="station-zone-tag-count">{crowd}</b>}
        </button>
      </Html>
      {children}
    </group>
  );
}

/**
 * A glass bridge from the work deck to a side deck: a clear floor with light running along it toward the deck, glass sides,
 * glowing rails and ribs arching over it, and a lamp at each end.
 */
export function Bridge({ to, paused }) {
  const b = bridgeTo(to);
  const color = ZONE_COLOR[to];
  const ribs = Math.max(2, Math.floor(b.length / 1.6));
  const strips = Math.max(4, Math.floor(b.length / 0.7));
  const lit = useRef([]);
  const run = useRef(0);
  useFrame((_, delta) => {
    if (paused) return;
    run.current += delta;
    // two pulses of light running along the floor, one each way
    const span = b.length + 3;
    const out = ((run.current * 2.6) % span) - span / 2;
    const back = span / 2 - ((run.current * 1.7 + span / 2) % span);
    lit.current.forEach((m, i) => {
      if (!m) return;
      const z = -b.length / 2 + ((i + 0.5) * b.length) / strips;
      m.opacity = 0.08 + 0.75 * Math.exp(-((z - out) ** 2) / 0.5) + 0.35 * Math.exp(-((z - back) ** 2) / 0.4);
    });
  });
  return (
    <group position={[b.mid[0], 0, b.mid[1]]} rotation={[0, b.angle, 0]}>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[1.7, 0.06, b.length]} />
        <meshStandardMaterial color="#a8d4ff" transparent opacity={0.16} metalness={0.2} roughness={0.05} depthWrite={false} />
      </mesh>
      {Array.from({ length: strips }, (_, i) => (
        <mesh key={i} position={[0, -0.015, -b.length / 2 + ((i + 0.5) * b.length) / strips]}>
          <boxGeometry args={[1.1, 0.008, 0.07]} />
          <meshBasicMaterial ref={(m) => (lit.current[i] = m)} color={color} transparent opacity={0.1} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.85, 0.27, 0]}>
            <boxGeometry args={[0.012, 0.56, b.length]} />
            <meshStandardMaterial color="#bfe0ff" transparent opacity={0.1} depthWrite={false} />
          </mesh>
          <mesh position={[side * 0.85, 0.56, 0]}>
            <boxGeometry args={[0.045, 0.045, b.length]} />
            <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
          </mesh>
          <mesh position={[side * 0.85, -0.02, 0]}>
            <boxGeometry args={[0.03, 0.03, b.length]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
      {/* a glass tunnel over it, high enough to walk through, ribbed with light */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 2.3]}>
        <cylinderGeometry args={[0.95, 0.95, b.length, 28, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#bfe0ff" transparent opacity={0.07} side={2} depthWrite={false} metalness={0.2} roughness={0.05} />
      </mesh>
      {Array.from({ length: ribs }, (_, i) => (
        <mesh key={i} position={[0, 0, -b.length / 2 + ((i + 0.5) * b.length) / ribs]} scale={[1, 2.3, 1]}>
          <torusGeometry args={[0.95, 0.012, 6, 32, Math.PI]} />
          <meshBasicMaterial color="#cfe6ff" transparent opacity={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 2.17, 0]}>
        <boxGeometry args={[0.04, 0.03, b.length]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      {[-1, 1].map((end) => (
        <group key={`lamp${end}`} position={[0, 0, end * (b.length / 2 - 0.1)]}>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.85, 0.75, 0]}>
              <sphereGeometry args={[0.07, 12, 8]} />
              <meshBasicMaterial color={color} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** A potted plant that sways a little. */
function Plant({ position, scale = 1, paused, hue = '#3fbf8a' }) {
  const leaves = useRef();
  const k = position[0] * 1.7 + position[2];
  useFrame(({ clock }) => {
    if (!paused && leaves.current) leaves.current.rotation.z = Math.sin(clock.elapsedTime * 0.9 + k) * 0.05;
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.24, 0.18, 0.44, 16]} />
        <meshStandardMaterial color="#e9e4f2" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.43, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 16]} />
        <meshStandardMaterial color="#3a2a22" roughness={1} />
      </mesh>
      <group ref={leaves} position={[0, 0.44, 0]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.sin(a) * 0.12, 0.34, Math.cos(a) * 0.12]} rotation={[Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45]}>
              <coneGeometry args={[0.1, 0.72, 6]} />
              <meshStandardMaterial color={hue} roughness={0.7} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.18, 0]}>
          <sphereGeometry args={[0.2, 12, 8]} />
          <meshStandardMaterial color="#2f9a6e" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/** A chair with a back, turned so its back is outwards (its own +z) and whoever sits in it faces the table. */
function Chair({ position, angle }) {
  return (
    <group position={position} rotation={[0, angle, 0]}>
      <mesh position={[0, 0.43, 0]}>
        <boxGeometry args={[0.48, 0.015, 0.42]} />
        <meshStandardMaterial color="#e8c38a" roughness={0.8} />
      </mesh>
      <RoundedBox args={[0.58, 0.09, 0.52]} radius={0.04} position={[0, 0.38, 0]}>
        <meshStandardMaterial color="#56607e" roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[0.58, 0.5, 0.07]} radius={0.03} position={[0, 0.66, 0.3]} rotation={[-0.12, 0, 0]}>
        <meshStandardMaterial color="#56607e" roughness={0.45} />
      </RoundedBox>
      <mesh position={[0, 0.62, 0.34]} rotation={[-0.12, 0, 0]}>
        <boxGeometry args={[0.4, 0.03, 0.01]} />
        <meshBasicMaterial color={ZONE_COLOR.meeting} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.34, 8]} />
        <meshStandardMaterial color="#202636" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.24, 0.26, 0.04, 16]} />
        <meshStandardMaterial color="#202636" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

/**
 * The meeting room: a round glass-topped table with a glowing edge, a hologram over it (a globe in turning rings, bigger and
 * brighter while Mira briefs someone), eight chairs with backs, a wall screen with live bars, and two plants.
 */
export function MeetingDeck({ onFocus, paused, crowd = 0, briefing = false }) {
  const holo = useRef();
  const ringA = useRef();
  const ringB = useRef();
  const moon = useRef();
  const beam = useRef();
  const bars = useRef([]);
  const scan = useRef();
  const size = useRef(1);
  const zone = ZONES.meeting;
  const local = [MEETING_TABLE.x - zone.x, MEETING_TABLE.z - zone.z];
  const color = ZONE_COLOR.meeting;

  useFrame(({ clock }, delta) => {
    if (paused) return;
    const t = clock.elapsedTime;
    size.current = ease(size.current, briefing ? 1.4 : crowd ? 1.1 : 0.9, delta, 2);
    const s = size.current;
    if (holo.current) {
      holo.current.rotation.y += delta * (briefing ? 1.1 : 0.45);
      holo.current.scale.setScalar(s);
      holo.current.position.y = 1.6 + Math.sin(t * 1.2) * 0.06 + (s - 1) * 0.35;
    }
    if (ringA.current) ringA.current.rotation.z += delta * 0.8;
    if (ringB.current) ringB.current.rotation.x -= delta * 0.6;
    if (moon.current) moon.current.position.set(Math.cos(t * 1.6) * 0.7, Math.sin(t * 1.6) * 0.18, Math.sin(t * 1.6) * 0.7);
    if (beam.current) beam.current.opacity = 0.07 + (s - 0.9) * 0.22 + Math.sin(t * 3) * 0.02;
    bars.current.forEach((m, i) => {
      if (!m) return;
      const h = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * (0.7 + i * 0.23) + i * 1.3)) * (crowd ? 1 : 0.55);
      m.scale.y = ease(m.scale.y, h, delta, 4);
      m.position.y = -0.5 + (m.scale.y * 0.9) / 2;
    });
    if (scan.current) scan.current.position.y = -0.55 + ((t * 0.35) % 1) * 1.1;
  });

  return (
    <SideDeck zone={zone} color={color} onFocus={onFocus} crowd={crowd} paused={paused}>
      <group position={[local[0], 0, local[1]]}>
        {/* the table: a glass top on a dark ring, a glowing edge, the projector in the middle */}
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[1.6, 1.6, 0.06, 56]} />
          <meshStandardMaterial color="#2b3244" metalness={0.55} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.76, 0]}>
          <cylinderGeometry args={[1.45, 1.45, 0.02, 56]} />
          <meshStandardMaterial color="#9fc2ff" transparent opacity={0.22} metalness={0.2} roughness={0.05} />
        </mesh>
        <mesh position={[0, 0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.6, 0.025, 8, 96]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.22, 0.5, 0.72, 20]} />
          <meshStandardMaterial color="#202636" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.79, 0]}>
          <cylinderGeometry args={[0.32, 0.36, 0.05, 32]} />
          <meshStandardMaterial color="#111520" emissive={color} emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
        {/* the beam up from the projector, and the hologram in it */}
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.85, 0.3, 0.8, 32, 1, true]} />
          <meshBasicMaterial ref={beam} color={color} transparent opacity={0.1} depthWrite={false} side={2} />
        </mesh>
        <group ref={holo} position={[0, 1.6, 0]}>
          <mesh>
            <sphereGeometry args={[0.38, 16, 10]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.55} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.2, 16, 12]} />
            <meshBasicMaterial color="#fff1d6" transparent opacity={0.85} toneMapped={false} />
          </mesh>
          <mesh ref={ringA} rotation={[Math.PI / 2.3, 0, 0]}>
            <torusGeometry args={[0.6, 0.012, 6, 64]} />
            <meshBasicMaterial color={color} transparent opacity={0.75} />
          </mesh>
          <mesh ref={ringB} rotation={[0, 0, Math.PI / 3]}>
            <torusGeometry args={[0.52, 0.01, 6, 64]} />
            <meshBasicMaterial color="#ffe2a8" transparent opacity={0.5} />
          </mesh>
          <mesh ref={moon}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        </group>
        <Sparkles count={14} scale={[1.6, 1.2, 1.6]} position={[0, 1.5, 0]} size={2.2} speed={paused ? 0 : 0.35} color={color} opacity={0.7} />
      </group>
      {Array.from({ length: 8 }, (_, i) => {
        const angle = Math.PI / 8 + (i / 8) * Math.PI * 2;
        return <Chair key={i} position={[local[0] + 2.45 * Math.sin(angle), 0, local[1] + 2.45 * Math.cos(angle)]} angle={angle} />;
      })}
      {/* the wall screen at the far side, facing the room */}
      <group position={[0, 2.15, -zone.radius + 0.75]} scale={1.2}>
        <RoundedBox args={[3.1, 1.45, 0.08]} radius={0.05}>
          <meshStandardMaterial color="#1d2232" metalness={0.6} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[2.9, 1.25]} />
          <meshBasicMaterial color="#0d1320" />
        </mesh>
        <mesh position={[0, 0.52, 0.05]}>
          <planeGeometry args={[2.7, 0.06]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} toneMapped={false} />
        </mesh>
        <group position={[0, 0, 0.055]}>
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i} ref={(m) => (bars.current[i] = m)} position={[-1.2 + i * 0.3, -0.3, 0]}>
              <planeGeometry args={[0.18, 0.9]} />
              <meshBasicMaterial color={i % 3 === 1 ? '#7fb0ff' : color} transparent opacity={0.75} toneMapped={false} />
            </mesh>
          ))}
          <mesh ref={scan} position={[0, 0, 0.005]}>
            <planeGeometry args={[2.9, 0.025]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
          </mesh>
        </group>
        {[-1.2, 1.2].map((x) => (
          <mesh key={x} position={[x, -1.35, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 1.25, 8]} />
            <meshStandardMaterial color="#2a3042" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <Plant position={[-3.25, 0, -2.75]} paused={paused} />
      <Plant position={[3.25, 0, -2.75]} paused={paused} scale={0.9} />
    </SideDeck>
  );
}

/** A bean bag: a squashed ball and a softer bump behind, its back outwards (its own +z). */
function BeanBag({ position, angle, color }) {
  return (
    <group position={position} rotation={[0, angle, 0]}>
      <mesh position={[0, 0.2, 0]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.45, 20, 14]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.42, 0.28]} scale={[1.05, 0.85, 0.6]}>
        <sphereGeometry args={[0.36, 18, 12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

/** String lights between posts at the edge of a deck, sagging a little, the bulbs twinkling in turn. */
function StringLights({ radius, door, gap, paused, colors }) {
  const mats = useRef([]);
  const posts = 6;
  const span = Math.PI * 2 - gap * 2;
  const angles = Array.from({ length: posts }, (_, i) => door + gap + (i / (posts - 1)) * span);
  const bulbs = [];
  const wires = [];
  for (let p = 0; p < posts - 1; p++) {
    const wire = [];
    for (let k = 0; k <= 8; k++) {
      const f = k / 8;
      const a = angles[p] + (angles[p + 1] - angles[p]) * f;
      // a little in from the posts, so the string hangs over the deck, and down in the middle
      const point = at(radius - 0.25 - Math.sin(f * Math.PI) * 0.35, a, 2.6 - Math.sin(f * Math.PI) * 0.45);
      wire.push(point);
      if (k > 0 && k < 8) bulbs.push([point[0], point[1] - 0.06, point[2]]);
    }
    wires.push(wire);
  }
  useFrame(({ clock }) => {
    if (paused) return;
    const t = clock.elapsedTime;
    mats.current.forEach((m, i) => m && (m.opacity = 0.5 + 0.5 * Math.max(0, Math.sin(t * 2.2 + (i % 3) * 2.1 + i * 0.15))));
  });
  return (
    <group>
      {angles.map((a, i) => (
        <mesh key={i} position={at(radius - 0.25, a, 1.3)}>
          <cylinderGeometry args={[0.03, 0.03, 2.6, 6]} />
          <meshStandardMaterial color="#3a4358" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {wires.map((points, i) => (
        <Line key={i} points={points} color="#4b556e" lineWidth={1} transparent opacity={0.8} />
      ))}
      {bulbs.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.055, 8, 6]} />
          <meshBasicMaterial ref={(m) => (mats.current[i] = m)} color={colors[i % 3]} transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * The lounge: bean bags round a low table on a rug under string lights and a warm lamp, a coffee machine that steams, a
 * jukebox with dancing bars, an arcade cabinet, plants, and a ping-pong table with a ball (and its trail) when two play.
 */
export function LoungeDeck({ onFocus, paused, playing, crowd = 0 }) {
  const zone = ZONES.lounge;
  const color = ZONE_COLOR.lounge;
  const table = [LOUNGE_TABLE.x - zone.x, LOUNGE_TABLE.z - zone.z];
  const pong = [PING_PONG.x - zone.x, PING_PONG.z - zone.z];
  const bags = ['#ff7a90', '#6be0c0', '#ffc46b', '#8fb4ff', '#c79bff', '#ff9d5c', '#7fd6a2'];
  const lamp = useRef();
  const eq = useRef([]);
  const arcade = useRef();
  const coffee = useRef();

  useFrame(({ clock }, delta) => {
    if (paused) return;
    const t = clock.elapsedTime;
    if (lamp.current) lamp.current.position.y = 2.35 + Math.sin(t * 0.8) * 0.06;
    eq.current.forEach((m, i) => {
      if (!m) return;
      const h = 0.2 + Math.abs(Math.sin(t * (3 + i * 0.7) + i)) * 0.8;
      m.scale.y = ease(m.scale.y, h, delta, 10);
      m.position.y = (m.scale.y * 0.4) / 2;
    });
    if (arcade.current) arcade.current.color.setHSL((t * 0.08) % 1, 0.75, 0.55);
    if (coffee.current) coffee.current.opacity = 0.6 + Math.sin(t * 4) * 0.4;
  });

  return (
    <SideDeck zone={zone} color={color} onFocus={onFocus} crowd={crowd} paused={paused}>
      <StringLights radius={zone.radius} door={doorAngle(zone)} gap={1.25 / zone.radius} paused={paused} colors={['#ffd38a', '#ff9db0', '#9ff0d8']} />
      {/* a soft round rug, rings on it, and the low table */}
      <group position={[table[0], 0, table[1]]}>
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.95, 56]} />
          <meshStandardMaterial color="#23304a" roughness={0.95} />
        </mesh>
        {[1.2, 2.7].map((r) => (
          <mesh key={r} position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r, r + 0.08, 56]} />
            <meshStandardMaterial color="#2f4a5e" roughness={0.95} />
          </mesh>
        ))}
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.75, 0.75, 0.07, 36]} />
          <meshStandardMaterial color="#4a3f6a" roughness={0.35} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.335, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.75, 0.018, 6, 48]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.12, 0.22, 0.28, 12]} />
          <meshStandardMaterial color="#202636" />
        </mesh>
        {[-0.25, 0.25].map((dx) => (
          <mesh key={dx} position={[dx, 0.41, 0.1]}>
            <cylinderGeometry args={[0.07, 0.06, 0.15, 12]} />
            <meshStandardMaterial color="#f4efe6" />
          </mesh>
        ))}
        <mesh position={[0.05, 0.36, -0.3]}>
          <boxGeometry args={[0.32, 0.03, 0.22]} />
          <meshStandardMaterial color="#ff7a90" />
        </mesh>
        <Sparkles count={6} scale={[0.6, 0.5, 0.3]} position={[0, 0.7, 0.1]} size={1.6} speed={paused ? 0 : 0.5} color="#ffffff" opacity={0.45} />
        {/* the warm lamp over the table */}
        <group ref={lamp} position={[0, 2.35, 0]}>
          <mesh>
            <sphereGeometry args={[0.22, 18, 12]} />
            <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <coneGeometry args={[0.42, 0.3, 24, 1, true]} />
            <meshStandardMaterial color="#e9e4f2" side={2} roughness={0.6} />
          </mesh>
          <pointLight intensity={4} distance={5} decay={1.8} color="#ffcf8a" />
        </group>
      </group>
      {Array.from({ length: 7 }, (_, i) => {
        const angle = Math.PI / 7 + (i / 7) * Math.PI * 2;
        return <BeanBag key={i} position={[table[0] + 2.25 * Math.sin(angle), 0, table[1] + 2.25 * Math.cos(angle)]} angle={angle} color={bags[i % bags.length]} />;
      })}
      {/* the coffee machine at the edge, its light on, a cup under it and steam */}
      <group position={[table[0] - 0.6, 0, table[1] - 3.6]}>
        <RoundedBox args={[0.75, 1.25, 0.55]} radius={0.07} position={[0, 0.62, 0]}>
          <meshStandardMaterial color="#2d2a3a" metalness={0.5} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, 1.0, 0.28]}>
          <boxGeometry args={[0.42, 0.18, 0.02]} />
          <meshStandardMaterial color="#111" emissive={color} emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
        <mesh position={[0.24, 0.78, 0.28]}>
          <sphereGeometry args={[0.03, 8, 6]} />
          <meshBasicMaterial ref={coffee} color="#ff7a90" transparent toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.48, 0.2]}>
          <cylinderGeometry args={[0.06, 0.05, 0.11, 12]} />
          <meshStandardMaterial color="#f4efe6" />
        </mesh>
        <Sparkles count={8} scale={[0.25, 0.7, 0.25]} position={[0, 0.8, 0.22]} size={1.8} speed={paused ? 0 : 0.6} color="#ffffff" opacity={0.5} />
      </group>
      {/* the jukebox: a rounded top, a glowing front, bars to the music */}
      <group position={[0.4, 0, -4.7]}>
        <RoundedBox args={[1, 1.4, 0.5]} radius={0.12} position={[0, 0.7, 0]}>
          <meshStandardMaterial color="#3a2d4f" metalness={0.4} roughness={0.4} />
        </RoundedBox>
        <mesh position={[0, 1.15, 0.26]}>
          <circleGeometry args={[0.32, 32, 0, Math.PI]} />
          <meshBasicMaterial color="#ffb36b" transparent opacity={0.85} toneMapped={false} />
        </mesh>
        <group position={[0, 0.35, 0.26]}>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} ref={(m) => (eq.current[i] = m)} position={[-0.33 + i * 0.11, 0.1, 0]}>
              <planeGeometry args={[0.07, 0.4]} />
              <meshBasicMaterial color={['#ff7a90', '#ffc46b', '#6be0c0', '#8fb4ff', '#c79bff', '#6be0c0', '#ff9d5c'][i]} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>
      {/* the arcade cabinet, its screen running through the colours */}
      <group position={[4.5, 0, -3.3]} rotation={[0, -0.55, 0]}>
        <RoundedBox args={[0.8, 1.7, 0.7]} radius={0.06} position={[0, 0.85, 0]}>
          <meshStandardMaterial color="#1f2a44" metalness={0.4} roughness={0.45} />
        </RoundedBox>
        <mesh position={[0, 1.25, 0.36]} rotation={[-0.2, 0, 0]}>
          <planeGeometry args={[0.6, 0.45]} />
          <meshBasicMaterial ref={arcade} color="#6be0c0" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.88, 0.4]}>
          <boxGeometry args={[0.7, 0.06, 0.2]} />
          <meshStandardMaterial color="#2a3654" />
        </mesh>
        {[-0.15, 0.12, 0.22].map((x, i) => (
          <mesh key={x} position={[x, 0.94, 0.42]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshBasicMaterial color={['#ff7a90', '#ffc46b', '#8fb4ff'][i]} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <Plant position={[-4.6, 0, 2.9]} paused={paused} scale={1.15} />
      <Plant position={[1.6, 0, 4.9]} paused={paused} hue="#58c98f" />
      <Plant position={[-3.6, 0, -3.9]} paused={paused} scale={0.9} />
      {/* the ping-pong table, lengthwise along z */}
      <group position={[pong[0], 0, pong[1]]}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[1.15, 0.05, PING_PONG.half * 2]} />
          <meshStandardMaterial color="#1f6b8a" roughness={0.6} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.565, 0.726, 0]}>
            <boxGeometry args={[0.02, 0.005, PING_PONG.half * 2]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
        {[-1, 1].map((end) => (
          <mesh key={`e${end}`} position={[0, 0.726, end * (PING_PONG.half - 0.01)]}>
            <boxGeometry args={[1.15, 0.005, 0.02]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
        <mesh position={[0, 0.726, 0]}>
          <boxGeometry args={[0.015, 0.005, PING_PONG.half * 2]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[1.25, 0.14, 0.015]} />
          <meshStandardMaterial color="#e8eef8" transparent opacity={0.55} />
        </mesh>
        {[-0.48, 0.48].map((dx) =>
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

/** The ball between the two players: across the table and back, bouncing once on each half, a short trail behind it. */
function PingPongBall({ paused }) {
  const ball = useRef();
  const t = useRef(0);
  useFrame((_, delta) => {
    if (paused || !ball.current) return;
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
    <Trail width={0.35} length={3} color="#fff6e0" attenuation={(w) => w * w}>
      <mesh ref={ball}>
        <sphereGeometry args={[0.05, 12, 8]} />
        <meshBasicMaterial color="#fff6e0" toneMapped={false} />
      </mesh>
    </Trail>
  );
}

/** One sleeping pod: a bed, a glass lid that closes over a sleeper (and opens when they leave), a light that breathes. */
function Pod({ pod, zone, asleep, paused, phase }) {
  const lid = useRef();
  const sheet = useRef();
  const lamp = useRef();
  const glass = useRef();
  const open = useRef(asleep ? 0 : 1);
  useFrame(({ clock }, delta) => {
    if (paused) return;
    open.current = ease(open.current, asleep ? 0 : 1, delta, 1.6);
    const o = open.current;
    const breath = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 0.9 + phase);
    if (lid.current) lid.current.rotation.x = o * 0.85;
    if (sheet.current) sheet.current.emissiveIntensity = 0.04 + (1 - o) * (0.3 + breath * 0.3);
    if (lamp.current) lamp.current.opacity = 0.15 + (1 - o) * (0.45 + breath * 0.4);
    if (glass.current) glass.current.opacity = 0.1 + (1 - o) * 0.1;
  });
  return (
    <group position={[pod.x - zone.x, 0, pod.z - zone.z]} rotation={[0, pod.angle, 0]}>
      {/* the bed, lengthwise from the centre outwards (z of the pod's frame), the head at the outer end */}
      <RoundedBox args={[0.84, 0.36, 1.8]} radius={0.12} position={[0, 0.18, 0]}>
        <meshStandardMaterial color="#262c3f" metalness={0.4} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.37, 0]}>
        <boxGeometry args={[0.68, 0.04, 1.58]} />
        <meshStandardMaterial ref={sheet} color="#2f2b4d" emissive={ZONE_COLOR.sleep} emissiveIntensity={0.1} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.42, 0.55]}>
        <boxGeometry args={[0.46, 0.08, 0.26]} />
        <meshStandardMaterial color="#d9d2f5" roughness={0.9} />
      </mesh>
      <RoundedBox args={[0.84, 0.55, 0.12]} radius={0.05} position={[0, 0.5, 0.88]}>
        <meshStandardMaterial color="#2c3350" metalness={0.4} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.66, 0.81]}>
        <boxGeometry args={[0.5, 0.05, 0.02]} />
        <meshBasicMaterial ref={lamp} color={ZONE_COLOR.sleep} transparent opacity={0.2} toneMapped={false} />
      </mesh>
      {/* the lid, hinged at the head: it swings up off the bed when the pod is free */}
      <group ref={lid} position={[0, 0.38, 0.82]}>
        <mesh position={[0, 0, -0.84]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.45]}>
          <cylinderGeometry args={[0.44, 0.44, 1.68, 24, 1, true, Math.PI / 2, Math.PI]} />
          <meshStandardMaterial ref={glass} color="#cbbcff" transparent opacity={0.12} side={2} depthWrite={false} metalness={0.2} roughness={0.05} />
        </mesh>
        <mesh position={[0, 0, -1.68]} scale={[1, 1.45, 1]}>
          <torusGeometry args={[0.44, 0.014, 4, 24, Math.PI]} />
          <meshBasicMaterial color={ZONE_COLOR.sleep} transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/** The sleeping quarters: a pod for each crew member round a glowing moon lamp, dust drifting in the dim violet light. */
export function SleepDeck({ onFocus, taken, paused, crowd = 0 }) {
  const zone = ZONES.sleep;
  const moon = useRef();
  const halo = useRef();
  useFrame(({ clock }, delta) => {
    if (paused) return;
    if (moon.current) {
      moon.current.rotation.y += delta * 0.15;
      moon.current.position.y = 1.55 + Math.sin(clock.elapsedTime * 0.6) * 0.08;
    }
    if (halo.current) halo.current.rotation.z += delta * 0.2;
  });
  return (
    <SideDeck zone={zone} color={ZONE_COLOR.sleep} onFocus={onFocus} crowd={crowd} paused={paused}>
      {PODS.map((pod, i) => (
        <Pod key={i} pod={pod} zone={zone} asleep={taken.includes(i)} paused={paused} phase={i * 0.9} />
      ))}
      {/* the moon lamp on its stand in the middle */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.12, 32]} />
        <meshStandardMaterial color="#222842" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1, 8]} />
        <meshStandardMaterial color="#3a4358" metalness={0.7} roughness={0.35} />
      </mesh>
      <group ref={moon} position={[0, 1.55, 0]}>
        <mesh>
          <sphereGeometry args={[0.48, 32, 20]} />
          <meshStandardMaterial color="#a99fd6" emissive="#8a78d8" emissiveIntensity={0.3} roughness={1} metalness={0} />
        </mesh>
        {[
          [0.2, 0.18, 0.4, 0.09],
          [-0.22, -0.05, 0.41, 0.07],
          [0.05, -0.25, 0.4, 0.06],
        ].map(([x, y, z, r]) => (
          <mesh key={x} position={[x, y, z]}>
            <sphereGeometry args={[r, 10, 8]} />
            <meshStandardMaterial color="#b8acdf" emissive="#6f5fb5" emissiveIntensity={0.35} roughness={0.95} />
          </mesh>
        ))}
      </group>
      <mesh ref={halo} position={[0, 1.55, 0]} rotation={[Math.PI / 2.6, 0, 0]}>
        <torusGeometry args={[0.8, 0.012, 6, 64]} />
        <meshBasicMaterial color={ZONE_COLOR.sleep} transparent opacity={0.55} />
      </mesh>
      <pointLight position={[0, 1.55, 0]} intensity={3} distance={6} decay={1.8} color="#cfc2ff" />
      <Sparkles count={28} scale={[zone.radius * 1.6, 2.4, zone.radius * 1.6]} position={[0, 1.4, 0]} size={3.2} speed={paused ? 0 : 0.15} color="#d4c8ff" opacity={0.7} />
    </SideDeck>
  );
}

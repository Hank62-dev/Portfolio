import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Sparkles } from '@react-three/drei';
import { RING_RADIUS, statusTone } from './model';
import { SIDE_ZONES, WORK_DECK, bridgeTo } from './layout';

// The work deck in the middle of the station: the owner's core, every crew member's desk round the ring, a glass rail round
// the edge open where the three bridges leave, and light in the floor: a conduit from the core to each desk that runs with
// light while its owner works, a slow wave out from the core, a turning ring of dashes on the track. A desk is a workstation:
// two screens, a keyboard, a chair with a back, a strip in its owner's colour, and over it a hologram of scrolling work that
// rises while they are at it. Everything eases from one state to the next.

const COLOR = '#7fb0ff';
const ease = (now, goal, delta, speed = 3) => now + (goal - now) * Math.min(1, delta * speed);
const at = (radius, angle, y = 0) => [radius * Math.sin(angle), y, radius * Math.cos(angle)];
const BRIDGE_GAP = 1.25 / WORK_DECK;
/** Where the rail's posts stand along a stretch `span` long: one every 1.5 or so, as fractions of it. */
const postsOf = (span) => {
  const n = Math.max(1, Math.round(span / 1.5));
  return Array.from({ length: n }, (_, i) => (i + 0.5) / n);
};

/** The deck: floor, track, rim, rail, the conduits to the desks and the waves out from the core. */
export function WorkDeck({ seats, working, paused, onFocus }) {
  const dashes = useRef();
  const inner = useRef();
  const wave = useRef();
  const pool = useRef();
  const glow = useRef(0.5);
  useFrame(({ clock }, delta) => {
    if (paused) return;
    const t = clock.elapsedTime;
    if (dashes.current) dashes.current.rotation.y += delta * 0.06;
    if (inner.current) inner.current.rotation.y -= delta * 0.35;
    if (wave.current) {
      const k = (t % 4) / 4;
      wave.current.scale.setScalar(1.8 + k * (RING_RADIUS - 2.6));
      wave.current.material.opacity = 0.35 * (1 - k);
    }
    glow.current = ease(glow.current, 0.4 + Math.min(working.size, 5) * 0.12, delta, 1);
    if (pool.current) pool.current.children.forEach((m) => (m.material.opacity = 0.03 + glow.current * 0.04));
  });

  // the rail runs between the bridges
  const doors = SIDE_ZONES.map((id) => bridgeTo(id).angle).sort((a, b) => a - b);
  const spans = doors.map((a, i) => {
    const next = i + 1 < doors.length ? doors[i + 1] : doors[0] + Math.PI * 2;
    return [a + BRIDGE_GAP, next - a - BRIDGE_GAP * 2];
  });
  const rail = WORK_DECK - 0.08;

  return (
    <group>
      <mesh position={[0, -0.18, 0]} onClick={(event) => (event.stopPropagation(), onFocus('work'))}>
        <cylinderGeometry args={[WORK_DECK, WORK_DECK - 0.4, 0.36, 120]} />
        <meshStandardMaterial color="#141824" metalness={0.6} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[WORK_DECK - 0.5, 120]} />
        <meshStandardMaterial color="#171c2a" metalness={0.5} roughness={0.5} />
      </mesh>
      <group ref={pool}>
        {[0.3, 0.55, 0.8, 0.95].map((k) => (
          <mesh key={k} position={[0, 0.005 + k * 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[WORK_DECK * k, 96]} />
            <meshBasicMaterial color={COLOR} transparent opacity={0.05} blending={2} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* the track the desks stand on, its edges lit, and a slow ring of dashes outside it */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RING_RADIUS - 1.2, RING_RADIUS + 1.1, 120]} />
        <meshStandardMaterial color="#1d2335" metalness={0.5} roughness={0.5} />
      </mesh>
      {[RING_RADIUS - 1.24, RING_RADIUS + 1.1].map((r) => (
        <mesh key={r} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 0.05, 120]} />
          <meshBasicMaterial color={COLOR} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      ))}
      <group ref={dashes}>
        {Array.from({ length: 56 }, (_, i) => {
          const a = (i / 56) * Math.PI * 2;
          return (
            <mesh key={i} position={at(RING_RADIUS + 1.45, a, 0.012)} rotation={[0, a, 0]}>
              <boxGeometry args={[0.32, 0.004, 0.06]} />
              <meshBasicMaterial color={COLOR} transparent opacity={i % 7 === 0 ? 0.8 : 0.25} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      {/* round the core: a lit ring, three arcs turning the other way, and a wave going out every few seconds */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.78, 64]} />
        <meshBasicMaterial color={COLOR} transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <group ref={inner}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, (i * Math.PI * 2) / 3]}>
            <ringGeometry args={[2.0, 2.12, 48, 1, 0, Math.PI / 2]} />
            <meshBasicMaterial color={COLOR} transparent opacity={0.45} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <mesh ref={wave} position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.97, 1, 96]} />
        <meshBasicMaterial color={COLOR} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>
      {seats.map((seat) => (
        <Conduit key={seat.id} angle={seat.angle} on={working.has(seat.id)} paused={paused} color={seat.color} />
      ))}
      {/* the rim and the glass rail, open where the bridges leave */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[WORK_DECK, 0.08, 10, 160]} />
        <meshBasicMaterial color={COLOR} toneMapped={false} />
      </mesh>
      {spans.map(([start, length]) => (
        <group key={start}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[rail, rail, 0.6, 64, 1, true, start, length]} />
            <meshStandardMaterial color="#a8d4ff" transparent opacity={0.08} side={2} depthWrite={false} />
          </mesh>
          <group rotation={[0, start + length - Math.PI / 2, 0]}>
            <mesh position={[0, 0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[rail, 0.022, 6, 96, length]} />
              <meshBasicMaterial color={COLOR} transparent opacity={0.65} />
            </mesh>
          </group>
          {postsOf(length * rail).map((k) => (
            <mesh key={k} position={at(rail, start + k * length, 0.31)}>
              <cylinderGeometry args={[0.025, 0.025, 0.62, 6]} />
              <meshStandardMaterial color="#3a4358" metalness={0.7} roughness={0.35} />
            </mesh>
          ))}
        </group>
      ))}
      {/* struts and a hub underneath */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[Math.sin((i * Math.PI) / 3) * 5.4, -0.9, Math.cos((i * Math.PI) / 3) * 5.4]} rotation={[0, (i * Math.PI) / 3, Math.PI / 2 - 0.35]}>
          <cylinderGeometry args={[0.07, 0.07, 3, 8]} />
          <meshStandardMaterial color="#2a3042" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, -1.7, 0]}>
        <sphereGeometry args={[0.6, 24, 16]} />
        <meshStandardMaterial color="#232a3b" metalness={0.7} roughness={0.35} emissive={COLOR} emissiveIntensity={0.1} />
      </mesh>
      <Sparkles count={18} scale={[1.4, 3.2, 1.4]} position={[0, 2.2, 0]} size={2.4} speed={paused ? 0 : 0.5} color={COLOR} opacity={0.75} />
    </group>
  );
}

/** A line of light in the floor from the core to a desk; while its owner works, pulses run along it out to them. */
function Conduit({ angle, on, paused, color }) {
  const line = useRef();
  const pulses = useRef([]);
  const level = useRef(on ? 1 : 0);
  const from = 1.95;
  const to = RING_RADIUS - 1.35;
  useFrame(({ clock }, delta) => {
    if (paused) return;
    level.current = ease(level.current, on ? 1 : 0, delta, 2);
    const l = level.current;
    if (line.current) line.current.opacity = 0.07 + l * 0.3;
    pulses.current.forEach((m, i) => {
      if (!m) return;
      const k = (clock.elapsedTime * 0.55 + i / 3 + angle) % 1;
      m.position.z = from + k * (to - from);
      m.material.opacity = l * Math.sin(k * Math.PI) * 0.95;
    });
  });
  return (
    <group rotation={[0, angle, 0]}>
      <mesh position={[0, 0.013, (from + to) / 2]}>
        <boxGeometry args={[0.05, 0.003, to - from]} />
        <meshBasicMaterial ref={line} color={color} transparent opacity={0.1} toneMapped={false} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => (pulses.current[i] = m)} position={[0, 0.02, from]}>
          <boxGeometry args={[0.12, 0.01, 0.36]} />
          <meshBasicMaterial color={color} transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A crew member's workstation on the ring, facing the core (its own -z): a desk with a lit edge in their colour, a main and
 * a side screen, a keyboard, a mug, a chair with a back. While they work, the screens light up and a hologram of scrolling
 * lines rises over the desk; when they leave it, it sinks away again.
 */
export function Desk({ agent, seat, manned, paused, onSelect }) {
  const screen = useRef();
  const side = useRef();
  const edge = useRef();
  const holo = useRef();
  const frame = useRef();
  const lines = useRef([]);
  const lift = useRef(0);
  const busy = manned && statusTone(agent.status) === 'busy';
  useFrame(({ clock }, delta) => {
    if (paused) return;
    const t = clock.elapsedTime;
    lift.current = ease(lift.current, busy ? 1 : 0, delta, 2.2);
    const l = lift.current;
    if (screen.current) screen.current.emissiveIntensity = 0.05 + (manned ? 0.2 : 0) + l * (0.9 + Math.sin(t * 6 + seat.angle * 3) * 0.12);
    if (side.current) side.current.emissiveIntensity = 0.04 + l * 0.7;
    if (edge.current) edge.current.opacity = 0.3 + (manned ? 0.25 : 0) + l * 0.45;
    if (holo.current) {
      holo.current.visible = l > 0.02;
      holo.current.scale.set(1, Math.max(l, 0.001), 1);
      holo.current.position.y = 1.35 + l * 0.32;
    }
    if (frame.current) frame.current.opacity = l * 0.55;
    lines.current.forEach((m, i) => {
      if (!m) return;
      // lines of work scrolling up the hologram, each a different length
      const k = (t * 0.45 + i / 6) % 1;
      const w = 0.2 + 0.75 * Math.abs(Math.sin(i * 2.7 + Math.floor(t * 0.45 + i / 6) * 1.9 + seat.angle));
      m.scale.x = w;
      m.position.set(-0.34 + (w * 0.68) / 2, -0.2 + k * 0.4, 0);
      m.material.opacity = l * Math.sin(k * Math.PI) * 0.9;
    });
  });
  const mugLeft = agent.id.length % 2 === 0;
  return (
    <group
      position={[seat.x, 0, seat.z]}
      rotation={[0, seat.angle, 0]}
      onClick={(event) => (event.stopPropagation(), onSelect(agent.id))}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      {/* the desk: a top on two side panels, a lit strip along the front edge */}
      <RoundedBox args={[1.45, 0.07, 0.68]} radius={0.03} position={[0, 0.78, -0.62]}>
        <meshStandardMaterial color="#2e3549" metalness={0.5} roughness={0.32} />
      </RoundedBox>
      <mesh position={[0, 0.755, -0.275]}>
        <boxGeometry args={[1.38, 0.025, 0.015]} />
        <meshBasicMaterial ref={edge} color={agent.color} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {[-0.66, 0.66].map((x) => (
        <mesh key={x} position={[x, 0.38, -0.62]}>
          <boxGeometry args={[0.05, 0.76, 0.6]} />
          <meshStandardMaterial color="#222838" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* the main screen on its stand, a side screen turned in, a keyboard and a mug */}
      <RoundedBox args={[0.84, 0.44, 0.04]} radius={0.02} position={[0, 1.1, -0.84]} rotation={[-0.12, 0, 0]}>
        <meshStandardMaterial ref={screen} color="#0c0f16" emissive={agent.color} emissiveIntensity={0.05} toneMapped={false} />
      </RoundedBox>
      <mesh position={[0, 0.9, -0.88]}>
        <boxGeometry args={[0.06, 0.2, 0.04]} />
        <meshStandardMaterial color="#202636" metalness={0.7} roughness={0.35} />
      </mesh>
      <group position={[mugLeft ? 0.6 : -0.6, 0, -0.74]} rotation={[0, mugLeft ? -0.55 : 0.55, 0]}>
        <RoundedBox args={[0.42, 0.3, 0.03]} radius={0.015} position={[0, 1.02, 0]} rotation={[-0.12, 0, 0]}>
          <meshStandardMaterial ref={side} color="#0c0f16" emissive="#9fc2ff" emissiveIntensity={0.04} toneMapped={false} />
        </RoundedBox>
        <mesh position={[0, 0.86, -0.02]}>
          <boxGeometry args={[0.04, 0.12, 0.03]} />
          <meshStandardMaterial color="#202636" />
        </mesh>
      </group>
      <RoundedBox args={[0.52, 0.025, 0.17]} radius={0.01} position={[0, 0.825, -0.48]}>
        <meshStandardMaterial color="#3a4258" roughness={0.6} />
      </RoundedBox>
      <mesh position={[mugLeft ? -0.52 : 0.52, 0.87, -0.5]}>
        <cylinderGeometry args={[0.055, 0.05, 0.11, 12]} />
        <meshStandardMaterial color={agent.color} roughness={0.5} />
      </mesh>
      {/* the hologram of the work in hand, over the desk */}
      <group ref={holo} position={[0, 1.35, -0.84]} visible={false}>
        <mesh>
          <planeGeometry args={[0.82, 0.5]} />
          <meshBasicMaterial ref={frame} color={agent.color} transparent opacity={0} side={2} depthWrite={false} blending={2} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} ref={(m) => (lines.current[i] = m)} position={[0, 0, 0.005]}>
            <planeGeometry args={[0.68, 0.026]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0} side={2} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {/* the chair, its back to the outside of the ring */}
      <group position={[0, 0, 0.08]}>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.08, 20]} />
          <meshStandardMaterial color="#4a5370" roughness={0.5} />
        </mesh>
        <RoundedBox args={[0.5, 0.42, 0.06]} radius={0.03} position={[0, 0.6, 0.3]} rotation={[-0.12, 0, 0]}>
          <meshStandardMaterial color="#4a5370" roughness={0.5} />
        </RoundedBox>
        <mesh position={[0, 0.7, 0.335]} rotation={[-0.12, 0, 0]}>
          <boxGeometry args={[0.34, 0.03, 0.01]} />
          <meshBasicMaterial color={agent.color} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.32, 8]} />
          <meshStandardMaterial color="#202636" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.24, 0.26, 0.04, 16]} />
          <meshStandardMaterial color="#202636" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

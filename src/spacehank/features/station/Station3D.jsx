import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { Html, OrbitControls, QuadraticBezierLine, RoundedBox, Sparkles, Stars, Trail } from '@react-three/drei';
import { CORE, HEAD_HEIGHT, RING_RADIUS, along, anchorOf, ease, flightMid, ringSeats, statusTone } from './model';
import { shortName, statusWord } from './parts';
import { outfitOf } from './outfits';
import { tr } from '../../core/i18n/lang';

// The station in 3D: a round deck floating among the stars, the owner's core turning in the middle, and the crew at their
// desks round the ring. A task flies from whoever gave it to whoever takes it as a small craft with a trail, and the desk
// it reaches lights up. Every shape is built here from simple geometry (no model files to download), and the scene has a
// few lights only, for the whole of it, never one per desk (phone GPUs give up past a few dozen; see station.test.js).
// Loaded lazily by StationView, so three.js only downloads when the tab opens.

export const FLIGHT_SECONDS = 1.8;
const HUE = (alpha = 1) => `hsla(214, 90%, 68%, ${alpha})`;

export default function Station3D({ crew, handoffs, flights, selected, onSelect, onCore, paused, phone }) {
  const seats = useMemo(() => ringSeats(crew.map((a) => a.id)), [crew]);
  const [lost, setLost] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const working = crew.filter((a) => statusTone(a.status) === 'busy');
  // a faint link to each crew member at work, from whoever gave them the task
  const links = working.map((agent) => ({ to: agent.id, from: handoffs.find((h) => h.to === agent.id)?.from ?? CORE, color: agent.color }));

  return (
    <>
      {lost && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-[#05060a]/90 p-6 text-center" role="alert">
          <div className="flex max-w-xs flex-col items-center gap-3">
            <p className="text-fine text-white/80">{tr('The phone stopped the 3D view to free memory.')}</p>
            <button type="button" className="rounded-full bg-white px-5 py-2.5 font-mono text-fine font-medium text-black" onClick={() => (setLost(false), setAttempt((n) => n + 1))}>
              {tr('Load the station again')}
            </button>
          </div>
        </div>
      )}
      <Canvas
        key={attempt}
        dpr={[1, phone ? 1.25 : 1.6]}
        camera={{ position: home(phone).position, fov: phone ? 48 : 42 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => onSelect(null)}
        onCreated={({ gl }) =>
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            setLost(true);
          })
        }
        frameloop={paused ? 'demand' : 'always'}
      >
        <color attach="background" args={['#04050a']} />
        <fog attach="fog" args={['#04050a', 22, 48]} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#bcd4ff', '#140c22', 0.7]} />
        <directionalLight position={[6, 12, 8]} intensity={1.6} color="#fff4e8" />
        <pointLight position={[0, 2.4, 0]} intensity={18} distance={13} decay={1.6} color={HUE()} />

        <Stars radius={70} depth={40} count={phone ? 1800 : 3200} factor={3.2} saturation={0.4} fade speed={paused ? 0 : 0.6} />
        <Sparkles count={phone ? 30 : 60} scale={[16, 5, 16]} position={[0, 2.5, 0]} size={2.2} speed={paused ? 0 : 0.25} opacity={0.5} color="#a9c8ff" />
        <Planet />

        <Deck />
        <Core onCore={onCore} paused={paused} />

        {crew.map((agent) => {
          const seat = seats.find((s) => s.id === agent.id);
          return <CrewSeat key={agent.id} agent={agent} seat={seat} selected={selected === agent.id} arriving={flights.some((f) => f.to === agent.id)} onSelect={onSelect} paused={paused} />;
        })}

        {links.map((link) => {
          const from = anchorOf(link.from, seats);
          const to = anchorOf(link.to, seats);
          return <Link key={`${link.from}-${link.to}`} from={from} to={to} color={link.color} paused={paused} />;
        })}
        {flights.map((flight) => (
          <Flight key={flight.key} from={anchorOf(flight.from, seats)} to={anchorOf(flight.to, seats)} color={crew.find((a) => a.id === flight.to)?.color ?? '#fff'} />
        ))}

        <CameraRig seat={seats.find((s) => s.id === selected) ?? null} phone={phone} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={2.5}
          maxDistance={26}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2.25}
          autoRotate={!paused && !selected}
          autoRotateSpeed={0.35}
          target={[0, 0.8, 0]}
        />
      </Canvas>
    </>
  );
}

/** Where the camera rests when nobody is chosen: the whole station in view. */
const home = (phone) => ({ position: phone ? [0, 15, 17] : [0, 11, 18], target: [0, 0.8, 0] });

/**
 * Flies the camera to the chosen crew member (close, a little to one side and above, so their outfit and face show over the
 * desk), and back to the whole station when nobody is chosen. Once it gets there it lets go, so the view can be turned again.
 */
function CameraRig({ seat, phone }) {
  const { camera, controls } = useThree();
  const goal = useRef(null);
  const moved = useRef(false);
  useEffect(() => {
    if (seat) {
      // in front of them and well to one side, over the desk's corner: face, outfit and screen all in view
      const side = seat.angle + 0.85;
      const r = RING_RADIUS - 3.4;
      goal.current = { position: new Vector3(r * Math.sin(side), phone ? 4.2 : 3.6, r * Math.cos(side)), target: new Vector3(seat.x, HEAD_HEIGHT - 0.35, seat.z) };
      moved.current = true;
    } else if (moved.current) {
      const back = home(phone);
      goal.current = { position: new Vector3(...back.position), target: new Vector3(...back.target) };
      moved.current = false;
    }
  }, [seat, phone]);
  useFrame((_, delta) => {
    if (!goal.current || !controls) return;
    const k = 1 - Math.pow(0.015, delta);
    camera.position.lerp(goal.current.position, k);
    controls.target.lerp(goal.current.target, k);
    controls.update();
    if (camera.position.distanceTo(goal.current.position) < 0.03 && controls.target.distanceTo(goal.current.target) < 0.03) goal.current = null;
  });
  return null;
}

/** A far planet and its ring, low in the sky, for depth. */
function Planet() {
  return (
    <group position={[-26, -6, -34]} rotation={[0.35, 0.4, 0.15]}>
      <mesh>
        <sphereGeometry args={[7, 40, 28]} />
        <meshStandardMaterial color="#3a2d6b" emissive="#1b1340" emissiveIntensity={0.6} roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2.3, 0, 0]}>
        <ringGeometry args={[9, 12.5, 64]} />
        <meshBasicMaterial color="#9d8cff" transparent opacity={0.18} side={2} />
      </mesh>
    </group>
  );
}

/** The round deck: a dark metal disc, a glowing rim, and the ring track the desks stand on. */
function Deck() {
  return (
    <group>
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <cylinderGeometry args={[7.6, 7.2, 0.36, 72]} />
        <meshStandardMaterial color="#141824" metalness={0.6} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.4, 6.4, 72]} />
        <meshStandardMaterial color="#1c2232" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.78, 64]} />
        <meshBasicMaterial color={HUE(0.8)} transparent />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.36, 4.42, 72]} />
        <meshBasicMaterial color={HUE(0.5)} transparent />
      </mesh>
      {/* the rim, glowing */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[7.6, 0.07, 10, 120]} />
        <meshBasicMaterial color={HUE()} />
      </mesh>
      {/* struts underneath, so the deck reads as a station and not a plate */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[Math.sin((i * Math.PI) / 3) * 4, -0.9, Math.cos((i * Math.PI) / 3) * 4]} rotation={[0, (i * Math.PI) / 3, Math.PI / 2 - 0.35]}>
          <cylinderGeometry args={[0.07, 0.07, 3, 8]} />
          <meshStandardMaterial color="#2a3042" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, -1.7, 0]}>
        <sphereGeometry args={[0.6, 24, 16]} />
        <meshStandardMaterial color="#232a3b" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

/** The owner's core: a glowing orb in a slowly turning cage, on a plinth. Tapping it gives a task. */
function Core({ onCore, paused }) {
  const cage = useRef();
  const halo = useRef();
  useFrame((_, delta) => {
    if (paused) return;
    cage.current.rotation.y += delta * 0.4;
    cage.current.rotation.x += delta * 0.15;
    halo.current.rotation.z -= delta * 0.6;
  });
  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onCore?.();
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.9, 1.15, 0.5, 40]} />
        <meshStandardMaterial color="#1d2434" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.55, 40, 28]} />
        <meshStandardMaterial color="#cfe0ff" emissive={HUE()} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh ref={cage} position={[0, 1.25, 0]}>
        <icosahedronGeometry args={[0.85, 1]} />
        <meshBasicMaterial color={HUE(0.55)} wireframe transparent />
      </mesh>
      <mesh ref={halo} position={[0, 1.25, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.15, 0.025, 8, 80]} />
        <meshBasicMaterial color={HUE(0.9)} transparent />
      </mesh>
      <Html position={[0, 2.75, 0]} center zIndexRange={[30, 0]} className="pointer-events-none">
        <span className="station-tag is-core">{tr('You')}</span>
      </Html>
    </group>
  );
}

/** An astronaut in their own outfit: suit, trim, backpack, a helmet with a stripe and a visor in their colour, and one thing of their own. */
function Astronaut({ id, color, tone }) {
  const off = tone === 'offline';
  const look = outfitOf(id);
  // offline: the same outfit, greyed, so they are still told apart
  const suit = off ? '#77746f' : look.suit;
  const trim = off ? '#5b5955' : look.trim;
  const head = HEAD_HEIGHT - 0.05;
  return (
    <group>
      <mesh position={[0, 0.62, 0]}>
        <capsuleGeometry args={[0.24, 0.32, 6, 14]} />
        <meshStandardMaterial color={suit} roughness={0.55} />
      </mesh>
      {/* belt and chest badge */}
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.245, 0.035, 8, 28]} />
        <meshStandardMaterial color={trim} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.78, -0.235]}>
        <boxGeometry args={[0.14, 0.1, 0.03]} />
        <meshStandardMaterial color={off ? '#444444' : color} emissive={off ? '#000000' : color} emissiveIntensity={0.5} />
      </mesh>
      <RoundedBox args={[0.38, 0.42, 0.18]} radius={0.06} position={[0, 0.7, 0.24]}>
        <meshStandardMaterial color={off ? '#5f5d59' : look.pack} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, head, 0]}>
        <sphereGeometry args={[0.3, 28, 20]} />
        <meshStandardMaterial color={suit} roughness={0.35} metalness={0.1} />
      </mesh>
      {/* the stripe round the helmet */}
      <mesh position={[0, head, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.302, 0.022, 6, 32]} />
        <meshStandardMaterial color={trim} roughness={0.4} />
      </mesh>
      {/* the visor faces the desk (toward the core, -z in the seat's own frame), standing out of the helmet's front */}
      <mesh position={[0, head + 0.01, -0.15]} scale={[1, 0.8, 0.78]}>
        <sphereGeometry args={[0.24, 28, 20]} />
        <meshStandardMaterial color={off ? '#22252c' : color} emissive={off ? '#000000' : color} emissiveIntensity={off ? 0 : 0.85} metalness={0.55} roughness={0.15} />
      </mesh>
      {/* arms reaching to the desk, with cuffs */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.27, 0.72, -0.2]} rotation={[-1.1, 0, side * 0.25]}>
          <mesh>
            <capsuleGeometry args={[0.07, 0.3, 4, 10]} />
            <meshStandardMaterial color={suit} roughness={0.55} />
          </mesh>
          <mesh position={[0, -0.17, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.07, 0.025, 6, 16]} />
            <meshStandardMaterial color={trim} />
          </mesh>
        </group>
      ))}
      {!off && look.extra && <Extra kind={look.extra} color={look.extraColor} trim={look.trim} head={head} />}
    </group>
  );
}

/** The one thing a crew member wears of their own, on or round the helmet. */
function Extra({ kind, color, trim, head }) {
  const top = head + 0.3;
  const mat = <meshStandardMaterial color={color} roughness={0.45} />;
  const glow = <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} />;
  switch (kind) {
    case 'headphones':
      return (
        <group position={[0, head, 0]}>
          {/* the band, over the top from ear to ear */}
          <mesh>
            <torusGeometry args={[0.33, 0.03, 8, 24, Math.PI]} />
            {mat}
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.1, 0.1, 0.07, 18]} />
              <meshStandardMaterial color={trim} emissive={trim} emissiveIntensity={0.6} />
            </mesh>
          ))}
        </group>
      );
    case 'scarf':
      return (
        <group position={[0, head - 0.3, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.07, 10, 24]} />
            {mat}
          </mesh>
          <mesh position={[0.1, -0.16, 0.16]} rotation={[0.3, 0, 0.2]}>
            <boxGeometry args={[0.1, 0.28, 0.05]} />
            {mat}
          </mesh>
        </group>
      );
    case 'beanie':
      return (
        <group position={[0, head + 0.04, 0]}>
          <mesh>
            <sphereGeometry args={[0.315, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.33, 0]}>
            <sphereGeometry args={[0.08, 12, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
          </mesh>
        </group>
      );
    case 'beret':
      return (
        <group position={[0.05, top - 0.02, 0.02]} rotation={[0.1, 0, -0.35]}>
          <mesh>
            <cylinderGeometry args={[0.27, 0.24, 0.08, 24]} />
            {mat}
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.07, 6]} />
            {mat}
          </mesh>
        </group>
      );
    case 'goggles':
      return (
        <group position={[0, head + 0.17, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.29, 0.025, 6, 28]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.1, 0.03, -0.27]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.075, 0.075, 0.06, 16]} />
              {glow}
            </mesh>
          ))}
        </group>
      );
    case 'antenna':
      return (
        <group position={[0, top, 0]}>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.28, 6]} />
            <meshStandardMaterial color="#cccccc" />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.06, 14, 10]} />
            {glow}
          </mesh>
        </group>
      );
    case 'twin':
      return (
        <group position={[0, top - 0.04, 0]}>
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.12, 0, 0]} rotation={[0, 0, -side * 0.35]}>
              <mesh position={[0, 0.12, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.24, 6]} />
                <meshStandardMaterial color="#cccccc" />
              </mesh>
              <mesh position={[0, 0.26, 0]}>
                <sphereGeometry args={[0.045, 12, 8]} />
                {glow}
              </mesh>
            </group>
          ))}
        </group>
      );
    case 'mohawk':
      return (
        <group position={[0, top - 0.06, 0]}>
          {[-0.14, 0, 0.14].map((z, i) => (
            <mesh key={z} position={[0, 0.06 + (i === 1 ? 0.03 : 0), z]}>
              <coneGeometry args={[0.06, 0.2 + (i === 1 ? 0.06 : 0), 10]} />
              {mat}
            </mesh>
          ))}
        </group>
      );
    case 'headlamp':
      return (
        <group position={[0, head + 0.15, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.29, 0.025, 6, 28]} />
            <meshStandardMaterial color="#2a3a5a" />
          </mesh>
          <mesh position={[0, 0.02, -0.29]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.07, 0.07, 16]} />
            {glow}
          </mesh>
        </group>
      );
    case 'flower':
      return (
        <group position={[0.2, head + 0.2, -0.05]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 5) * 0.06, Math.sin((i * Math.PI * 2) / 5) * 0.06, 0]}>
              <sphereGeometry args={[0.045, 10, 8]} />
              {mat}
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.04, 10, 8]} />
            <meshStandardMaterial color="#ffd34d" />
          </mesh>
        </group>
      );
    case 'halo':
      return (
        <mesh position={[0, top + 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.22, 0.025, 8, 32]} />
          {glow}
        </mesh>
      );
    default:
      return null;
  }
}

/** One crew member at their desk on the ring, turned to face the core, with their name above. */
function CrewSeat({ agent, seat, selected, arriving, onSelect, paused }) {
  const tone = statusTone(agent.status);
  const body = useRef();
  const screen = useRef();
  const ping = useRef();
  const pingStart = useRef(-1);
  const busy = tone === 'busy';

  useEffect(() => {
    if (arriving) pingStart.current = -2; // starts when the craft lands (set on the next frame)
  }, [arriving]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!paused) {
      // a little sway while working, still otherwise
      body.current.position.y = busy ? Math.sin(t * 3 + seat.angle) * 0.025 : 0;
      body.current.rotation.y = busy ? Math.sin(t * 1.3 + seat.angle) * 0.08 : 0;
      if (screen.current) screen.current.emissiveIntensity = busy ? 1.1 + Math.sin(t * 9 + seat.angle * 3) * 0.25 : tone === 'offline' ? 0 : 0.25;
    }
    // the ripple when a task arrives: starts once the craft has flown, grows and fades
    if (pingStart.current === -2) pingStart.current = t + FLIGHT_SECONDS - 0.15;
    const age = pingStart.current > 0 ? t - pingStart.current : -1;
    if (ping.current) {
      const on = age >= 0 && age < 1.2;
      ping.current.visible = on;
      if (on) {
        ping.current.scale.setScalar(1 + age * 2.2);
        ping.current.material.opacity = 0.9 * (1 - age / 1.2);
      }
    }
  });

  const select = (event) => {
    event.stopPropagation();
    onSelect(selected ? null : agent.id);
  };

  return (
    <group position={[seat.x, 0, seat.z]} rotation={[0, seat.angle, 0]}>
      <group
        onClick={select}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        {/* the desk, between the crew member and the core, and its screen */}
        <RoundedBox args={[1.25, 0.08, 0.6]} radius={0.03} position={[0, 0.78, -0.62]}>
          <meshStandardMaterial color="#2b3244" metalness={0.55} roughness={0.35} />
        </RoundedBox>
        <mesh position={[0, 0.4, -0.62]}>
          <cylinderGeometry args={[0.06, 0.12, 0.74, 10]} />
          <meshStandardMaterial color="#202636" metalness={0.6} roughness={0.4} />
        </mesh>
        <RoundedBox args={[0.78, 0.36, 0.04]} radius={0.02} position={[0, 1.02, -0.86]} rotation={[-0.28, 0, 0]}>
          <meshStandardMaterial ref={screen} color="#0c0f16" emissive={agent.color} emissiveIntensity={busy ? 1 : 0.2} toneMapped={false} />
        </RoundedBox>
        {/* the chair */}
        <mesh position={[0, 0.36, 0.08]}>
          <cylinderGeometry args={[0.3, 0.3, 0.08, 20]} />
          <meshStandardMaterial color="#323a4e" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.18, 0.08]}>
          <cylinderGeometry args={[0.04, 0.04, 0.32, 8]} />
          <meshStandardMaterial color="#202636" />
        </mesh>
        <group ref={body} position={[0, 0, 0.08]}>
          <Astronaut id={agent.id} color={agent.color} tone={tone} />
        </group>
        {/* the floor pad: lit in their colour when chosen */}
        <mesh position={[0, 0.02, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.95, 40]} />
          <meshBasicMaterial color={agent.color} transparent opacity={selected ? 0.32 : 0.07} />
        </mesh>
        {selected && (
          <mesh position={[0, 0.025, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.95, 1.04, 48]} />
            <meshBasicMaterial color={agent.color} />
          </mesh>
        )}
      </group>
      <mesh ref={ping} position={[0, 0.04, -0.25]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.8, 0.9, 48]} />
        <meshBasicMaterial color={agent.color} transparent opacity={0} />
      </mesh>
      <Html position={[0, HEAD_HEIGHT + 0.65, 0]} center zIndexRange={[30, 0]}>
        <button type="button" onClick={select} aria-pressed={selected} aria-label={tr('{0}, {1}: {2}', agent.name, agent.role, statusWord(agent.status))} className="station-tag" data-tone={tone} style={{ '--c': agent.color }}>
          <i className="station-dot" aria-hidden="true" />
          {shortName(agent)}
        </button>
      </Html>
    </group>
  );
}

/** A faint, moving dashed arc from whoever gave a task to the crew member working on it. */
function Link({ from, to, color, paused }) {
  const line = useRef();
  const mid = useMemo(() => flightMid(from, to), [from, to]);
  useFrame((_, delta) => {
    if (!paused && line.current?.material) line.current.material.dashOffset -= delta * 0.6;
  });
  return <QuadraticBezierLine ref={line} start={from} end={to} mid={mid} color={color} lineWidth={1.2} dashed dashScale={6} dashSize={0.5} gapSize={0.6} transparent opacity={0.45} />;
}

/** A task in flight: a small bright craft with a trail, along an arc from the giver to the taker. */
function Flight({ from, to, color }) {
  const craft = useRef();
  const start = useRef(null);
  const mid = useMemo(() => flightMid(from, to), [from, to]);
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - start.current) / FLIGHT_SECONDS);
    const [x, y, z] = along(from, mid, to, ease(t));
    craft.current.position.set(x, y, z);
    craft.current.scale.setScalar(t >= 1 ? Math.max(0, 1 - (clock.elapsedTime - start.current - FLIGHT_SECONDS) * 3) : 1);
  });
  return (
    <>
      <QuadraticBezierLine start={from} end={to} mid={mid} color={color} lineWidth={1} transparent opacity={0.25} />
      <Trail width={1.2} length={5} color={color} attenuation={(w) => w * w}>
        <mesh ref={craft} position={from}>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </Trail>
    </>
  );
}

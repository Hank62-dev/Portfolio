import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { Html, OrbitControls, QuadraticBezierLine, RoundedBox, Sparkles, Stars, Trail } from '@react-three/drei';
import { CORE, HEAD_HEIGHT, RING_RADIUS, along, ease, flightMid, ringSeats, statusTone } from './model';
import { shortName, statusWord } from './parts';
import { outfitOf } from './outfits';
import { moodOf } from './banter';
import { useBanter } from './useBanter';
import { PODS, SIDE_ZONES, WALK_SPEED, WORK_DECK, ZONES, alongPath, measure, pathBetween, placeCrew, roomsOf } from './layout';
import { Bridge, LoungeDeck, MeetingDeck, SleepDeck, ZONE_COLOR, zoneName } from './Zones3D';
import { tr } from '../../core/i18n/lang';

// The station in 3D: a round work deck floating among the stars, the owner's core turning in the middle and the crew's desks
// round the ring; over glass bridges, a meeting room, a lounge and the sleeping quarters (Zones3D), where the crew spend the
// time they are not working (layout.js says who is where). A task flies from whoever gave it to whoever takes it as a small craft with a trail, and the desk
// it reaches lights up. Every shape is built here from simple geometry (no model files to download), and the scene has a
// few lights only, for the whole of it, never one per desk (phone GPUs give up past a few dozen; see station.test.js).
// Loaded lazily by StationView, so three.js only downloads when the tab opens.

export const FLIGHT_SECONDS = 1.8;
const HUE = (alpha = 1) => `hsla(214, 90%, 68%, ${alpha})`;

export default function Station3D({ crew, handoffs, flights, selected, onSelect, onCore, paused, phone }) {
  // the desks only move when the crew itself changes, not on every status update
  const ids = crew.map((a) => a.id).join(',');
  const seats = useMemo(() => ringSeats(ids.split(',')), [ids]);
  // turning the view by hand stops the slow spin, until it has been left alone for a while
  const [handled, setHandled] = useState(false);
  const idle = useRef(null);
  useEffect(() => () => clearTimeout(idle.current), []);
  const grab = () => {
    clearTimeout(idle.current);
    setHandled(true);
  };
  const letGo = () => {
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setHandled(false), SPIN_AGAIN_MS);
  };
  const [lost, setLost] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // the deck the camera looks at when nobody is chosen (null: the whole station; a phone starts on the work deck, where
  // the whole station would be too small to read)
  const [focus, setFocus] = useState(phone ? 'work' : null);
  const focusOn = (zone) => {
    onSelect(null);
    setFocus(zone);
  };

  const nameOf = (id) => shortName(crew.find((a) => a.id === id) ?? { name: id });
  const [placeSlot, setPlaceSlot] = useState(() => Math.floor(Date.now() / MOVE_MS));
  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setPlaceSlot(Math.floor(Date.now() / MOVE_MS)), 5000);
    return () => clearInterval(timer);
  }, [paused]);
  // when Mira hands someone a task, the two of them meet at the meeting table first, then the one goes to their desk
  const [briefed, setBriefed] = useState(() => new Set());
  const briefedFor = useRef(new Map());
  const briefTimers = useRef([]);
  useEffect(() => {
    const fresh = flights.filter((f) => f.from === MIRA && f.to !== MIRA && !briefedFor.current.has(f.key));
    if (!fresh.length) return;
    fresh.forEach((f) => briefedFor.current.set(f.key, [f.to, Date.now() + BRIEF_MS]));
    const update = () => {
      const now = Date.now();
      for (const [key, [, until]] of briefedFor.current) if (until <= now) briefedFor.current.set(key, [null, until]);
      const ids = [...briefedFor.current.values()].filter(([id]) => id).map(([id]) => id);
      setBriefed(new Set(ids.length ? [...ids, MIRA] : []));
    };
    update();
    // not cleared when the flights change again (a flight that has landed goes from the list): only when the station closes
    briefTimers.current.push(setTimeout(update, BRIEF_MS + 50));
  }, [flights]);
  useEffect(() => () => briefTimers.current.forEach(clearTimeout), []);
  const briefKey = [...briefed].sort().join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const places = useMemo(() => placeCrew(crew, placeSlot, briefed), [crew, placeSlot, briefKey]);
  // who is on their way somewhere: they talk, play and count in a room only once they are there
  const [walking, setWalking] = useState(() => new Set());
  const onWalk = useCallback((id, on) => setWalking((now) => (now.has(id) === on ? now : on ? new Set([...now, id]) : new Set([...now].filter((x) => x !== id)))), []);
  const arrived = Object.fromEntries(Object.entries(places).filter(([id]) => !walking.has(id)));
  const rooms = roomsOf(crew, arrived);
  const { saying, talking, moodSlot } = useBanter(rooms, nameOf, paused);
  const talks = Object.entries(saying).map(([by, line]) => ({ by, ...line }));
  const anchor = (id) => {
    if (id === CORE) return [0, 1.9, 0];
    const place = places[id];
    if (!place) return [0, 1.9, 0];
    return [place.x, place.pose === 'lie' ? 1 : place.pose === 'stand' ? HEAD_HEIGHT + 0.75 : HEAD_HEIGHT + 0.5, place.z];
  };

  const working = crew.filter((a) => statusTone(a.status) === 'busy');
  // a faint link to each crew member at work, from whoever gave them the task
  const links = working.map((agent) => ({ to: agent.id, from: handoffs.find((h) => h.to === agent.id)?.from ?? CORE, color: agent.color }));
  const playing = crew.filter((a) => arrived[a.id]?.game).length === 2;
  const pods = crew
    .map((a) => arrived[a.id])
    .filter((p) => p?.pose === 'lie')
    .map((p) => PODS.findIndex((pod) => pod.x === p.x && pod.z === p.z));

  const chosen = selected ? places[selected] : null;
  const aim = chosen ? `spot:${selected}:${chosen.x}:${chosen.z}` : focus ? `zone:${focus}` : 'home';

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
      <nav className="station-zones" aria-label={tr('Decks')}>
        <button type="button" aria-pressed={!focus && !selected} onClick={() => focusOn(null)}>
          {tr('Whole station')}
        </button>
        {['work', ...SIDE_ZONES].map((zone) => (
          <button key={zone} type="button" aria-pressed={focus === zone && !selected} style={{ '--c': ZONE_COLOR[zone] }} onClick={() => focusOn(zone)}>
            <i aria-hidden="true" />
            {zoneName(zone)}
            <span className="station-zones-count">{zone === 'work' ? rooms.work.length : (rooms[zone]?.length ?? 0) + (zone === 'lounge' && playing ? 2 : 0)}</span>
          </button>
        ))}
      </nav>
      <Canvas
        key={attempt}
        dpr={[1, phone ? 1.25 : 1.6]}
        camera={{ position: (phone ? zoneView('work', true) : home(false)).position, fov: phone ? 48 : 42 }}
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
        <fog attach="fog" args={['#04050a', 48, 110]} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#bcd4ff', '#140c22', 0.7]} />
        <directionalLight position={[6, 12, 8]} intensity={1.6} color="#fff4e8" />
        <pointLight position={[0, 2.4, 0]} intensity={18} distance={13} decay={1.6} color={HUE()} />

        <Stars radius={110} depth={50} count={phone ? 1800 : 3600} factor={3.6} saturation={0.4} fade speed={paused ? 0 : 0.6} />
        <Sparkles count={phone ? 40 : 90} scale={[50, 6, 36]} position={[0, 2.5, -4]} size={2.2} speed={paused ? 0 : 0.25} opacity={0.5} color="#a9c8ff" />
        <Planet />

        <Deck />
        <Core onCore={onCore} paused={paused} />
        {SIDE_ZONES.map((zone) => (
          <Bridge key={zone} to={zone} />
        ))}
        <MeetingDeck onFocus={focusOn} paused={paused} />
        <LoungeDeck onFocus={focusOn} paused={paused} playing={playing} />
        <SleepDeck onFocus={focusOn} taken={pods} />

        {crew.map((agent) => {
          const seat = seats.find((s) => s.id === agent.id);
          return <Desk key={agent.id} agent={agent} seat={seat} manned={places[agent.id]?.zone === 'work'} paused={paused} onSelect={onSelect} />;
        })}
        {crew.map((agent) =>
          places[agent.id] ? (
            <CrewMember
              key={agent.id}
              agent={agent}
              place={places[agent.id]}
              selected={selected === agent.id}
              arriving={flights.some((f) => f.to === agent.id)}
              onSelect={onSelect}
              onWalk={onWalk}
              paused={paused}
              saying={saying[agent.id] ?? null}
              listening={talking.has(agent.id) && !saying[agent.id]}
              mood={moodOf(agent.id, statusTone(agent.status), moodSlot, places[agent.id])}
              compact={phone || (!focus && !selected)}
            />
          ) : null,
        )}

        {links.map((link) => (
          <Link key={`${link.from}-${link.to}`} from={anchor(link.from)} to={anchor(link.to)} color={link.color} paused={paused} />
        ))}
        {talks.map((talk) => {
          const from = anchor(talk.by);
          const to = anchor(talk.to);
          return (
            <group key={talk.key}>
              <Link from={from} to={to} color="#cfe0ff" paused={paused} />
              <Whisper from={from} to={to} color={crew.find((a) => a.id === talk.by)?.color ?? '#fff'} />
            </group>
          );
        })}
        {flights.map((flight) => (
          <Flight key={flight.key} from={anchor(flight.from)} to={anchor(flight.to)} color={crew.find((a) => a.id === flight.to)?.color ?? '#fff'} />
        ))}

        <CameraRig aim={aim} place={chosen} zone={focus} phone={phone} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={2.5}
          maxDistance={95}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2.25}
          autoRotate={!paused && !selected && !handled}
          autoRotateSpeed={0.25}
          target={HOME_TARGET}
          onStart={grab}
          onEnd={letGo}
        />
      </Canvas>
    </>
  );
}

// one array for good: a new one on every render would put the controls' target back each time the crew's status changes
const HOME_TARGET = [0, 0, -3];
const SPIN_AGAIN_MS = 8000;
const FLY_SECONDS = 2.5;
const WHISPER_SECONDS = 1.1;
// how often the free ones get up and go somewhere else
const MOVE_MS = 90 * 1000;
// how long Mira keeps someone in the meeting room over a task she handed them (the walk there is part of it)
const BRIEF_MS = 26 * 1000;
const MIRA = 'mira';
const DECK = WORK_DECK;
/** Where the camera rests when nothing is chosen: the whole station, all four decks, in view. */
const home = (phone) => ({ position: phone ? [0, 64, 58] : [0, 30, 40], target: HOME_TARGET });

/** Where to look at a deck from: in front of it and above, the whole of it in view. */
const zoneView = (id, phone) => {
  const zone = ZONES[id];
  if (id === 'work') return { position: phone ? [0, 22, 25] : [0, 11, 17.5], target: [0, 0.8, 0] };
  const r = zone.radius;
  return { position: [zone.x, r * (phone ? 2.1 : 1.3) + 3.5, zone.z + r * (phone ? 2.2 : 1.6) + 3.5], target: [zone.x, 0.4, zone.z] };
};

/**
 * Flies the camera to the chosen crew member wherever they are (close, in front and a little to one side, so their outfit and
 * face show), to a deck when one is picked, and back to the whole station otherwise. Once it gets there it lets go, so the
 * view can be turned again; grabbing the view on the way stops the flight there.
 */
function CameraRig({ aim, place, zone, phone }) {
  const { camera, controls } = useThree();
  const goal = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (!controls) return undefined;
    const stop = () => (goal.current = null);
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);
  useEffect(() => {
    // the first view is where the canvas starts: no flight
    if (first.current) {
      first.current = false;
      if (aim === 'home') return;
      if (aim === 'zone:work' && phone) {
        // the canvas starts there, only the controls still look at the whole station's middle
        goal.current = { position: camera.position.clone(), target: new Vector3(...zoneView('work', true).target), left: FLY_SECONDS };
        return;
      }
    }
    if (place) {
      // they face back toward the centre of their room; the camera stands in front of them, turned a little to the side
      const fx = -Math.sin(place.angle);
      const fz = -Math.cos(place.angle);
      const turn = 0.6;
      const dx = fx * Math.cos(turn) + fz * Math.sin(turn);
      const dz = -fx * Math.sin(turn) + fz * Math.cos(turn);
      const lying = place.pose === 'lie';
      const far = lying ? 3.2 : 4.6;
      const position = new Vector3(place.x + dx * far, phone || lying ? 4.2 : 3.6, place.z + dz * far);
      const target = new Vector3(place.x, lying ? 0.6 : HEAD_HEIGHT - 0.35, place.z);
      // on a wide screen their card opens on the right of the station, so the view slides right and they stand left of it;
      // on a phone the card sits at the bottom, so the view looks a little lower and they stand above it
      const right = target.clone().sub(position).cross(new Vector3(0, 1, 0)).normalize();
      const shift = phone ? new Vector3(0, -0.55, 0) : right.multiplyScalar(1.05);
      goal.current = { position: position.add(shift), target: target.add(shift), left: FLY_SECONDS };
      return;
    }
    const view = zone ? zoneView(zone, phone) : home(phone);
    goal.current = { position: new Vector3(...view.position), target: new Vector3(...view.target), left: FLY_SECONDS };
    // the aim says it all: a new place object for the same spot is no reason to fly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aim, phone]);
  useFrame((_, delta) => {
    if (!goal.current || !controls) return;
    const k = 1 - Math.pow(0.015, delta);
    camera.position.lerp(goal.current.position, k);
    controls.target.lerp(goal.current.target, k);
    controls.update();
    goal.current.left -= delta;
    // there, or close enough after a while (the controls' limits may keep it from the very spot): the view is the owner's again
    if (goal.current.left <= 0 || (camera.position.distanceTo(goal.current.position) < 0.03 && controls.target.distanceTo(goal.current.target) < 0.03)) goal.current = null;
  });
  return null;
}

/** A far planet and its ring, low in the sky, for depth. */
function Planet() {
  return (
    <group position={[-48, -16, -70]} rotation={[0.35, 0.4, 0.15]} scale={1.6}>
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
        <cylinderGeometry args={[DECK, DECK - 0.4, 0.36, 96]} />
        <meshStandardMaterial color="#141824" metalness={0.6} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RING_RADIUS - 1.2, RING_RADIUS + 1.1, 96]} />
        <meshStandardMaterial color="#1c2232" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.78, 64]} />
        <meshBasicMaterial color={HUE(0.8)} transparent />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RING_RADIUS - 1.24, RING_RADIUS - 1.18, 96]} />
        <meshBasicMaterial color={HUE(0.5)} transparent />
      </mesh>
      {/* the rim, glowing */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[DECK, 0.08, 10, 160]} />
        <meshBasicMaterial color={HUE()} />
      </mesh>
      {/* struts underneath, so the deck reads as a station and not a plate */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[Math.sin((i * Math.PI) / 3) * 5.4, -0.9, Math.cos((i * Math.PI) / 3) * 5.4]} rotation={[0, (i * Math.PI) / 3, Math.PI / 2 - 0.35]}>
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
  // offline they still wear their outfit (so they are told apart); only the visor and the badge go dark
  const suit = look.suit;
  const trim = look.trim;
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
        <meshStandardMaterial color={look.pack} roughness={0.6} />
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
      {look.extra && <Extra kind={look.extra} color={look.extraColor} trim={look.trim} head={head} />}
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

/** A crew member's desk on the work deck's ring, facing the core: the screen glows in their colour while they work at it. */
function Desk({ agent, seat, manned, paused, onSelect }) {
  const screen = useRef();
  const busy = manned && statusTone(agent.status) === 'busy';
  useFrame(({ clock }) => {
    if (paused || !screen.current) return;
    screen.current.emissiveIntensity = busy ? 1.1 + Math.sin(clock.elapsedTime * 9 + seat.angle * 3) * 0.25 : manned ? 0.25 : 0.04;
  });
  return (
    <group
      position={[seat.x, 0, seat.z]}
      rotation={[0, seat.angle, 0]}
      onClick={(event) => (event.stopPropagation(), onSelect(agent.id))}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <RoundedBox args={[1.25, 0.08, 0.6]} radius={0.03} position={[0, 0.78, -0.62]}>
        <meshStandardMaterial color="#2b3244" metalness={0.55} roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, 0.4, -0.62]}>
        <cylinderGeometry args={[0.06, 0.12, 0.74, 10]} />
        <meshStandardMaterial color="#202636" metalness={0.6} roughness={0.4} />
      </mesh>
      <RoundedBox args={[0.78, 0.36, 0.04]} radius={0.02} position={[0, 1.02, -0.86]} rotation={[-0.28, 0, 0]}>
        <meshStandardMaterial ref={screen} color="#0c0f16" emissive={agent.color} emissiveIntensity={busy ? 1 : 0.04} toneMapped={false} />
      </RoundedBox>
      <mesh position={[0, 0.36, 0.08]}>
        <cylinderGeometry args={[0.3, 0.3, 0.08, 20]} />
        <meshStandardMaterial color="#323a4e" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.18, 0.08]}>
        <cylinderGeometry args={[0.04, 0.04, 0.32, 8]} />
        <meshStandardMaterial color="#202636" />
      </mesh>
      {/* their name plate on the desk's edge, so an empty desk still says whose it is */}
      <mesh position={[0, 0.83, -0.34]}>
        <boxGeometry args={[0.36, 0.03, 0.05]} />
        <meshBasicMaterial color={agent.color} transparent opacity={manned ? 0.9 : 0.35} />
      </mesh>
    </group>
  );
}

/**
 * One crew member where they are now: at their desk, on a bean bag or a meeting chair, at the ping-pong table, or asleep in a
 * pod. Over the head, their name, and their mood or what they are saying. Sent somewhere else, they get up and walk there,
 * round the work deck's walkway and over the glass bridges (layout.js finds the way), and sit, stand or lie down on arrival.
 */
function CrewMember({ agent, place, selected, arriving, onSelect, onWalk, paused, saying, listening, mood, compact }) {
  const tone = statusTone(agent.status);
  const root = useRef();
  const body = useRef();
  const ping = useRef();
  const pingStart = useRef(-1);
  const walk = useRef(null); // { points, at, total, done }
  const was = useRef(null); // the deck they were last sent to
  const [moving, setMoving] = useState(false);
  const busy = tone === 'busy';
  const lying = place.pose === 'lie' && !moving;
  const standing = place.pose === 'stand' || moving;

  useEffect(() => {
    if (arriving) pingStart.current = -2; // starts when the craft lands (set on the next frame)
  }, [arriving]);

  // a new place: the first one they simply are at; after that, they walk there from wherever they are
  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    if (!was.current) {
      node.position.set(place.x, 0, place.z);
      node.rotation.y = place.angle;
      was.current = place.zone;
      return;
    }
    const points = pathBetween({ x: node.position.x, z: node.position.z, zone: was.current }, place);
    was.current = place.zone;
    const { at, total } = measure(points);
    if (total < 0.05) return;
    walk.current = { points, at, total, done: 0 };
    setMoving(true);
    onWalk(agent.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.x, place.z]);
  useEffect(() => () => onWalk(agent.id, false), [agent.id, onWalk]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const node = root.current;
    const w = walk.current;
    if (w && node && !paused) {
      // a slow frame only skips ahead a little, so nobody jumps a whole bridge
      w.done += Math.min(delta, 0.25) * WALK_SPEED;
      if (w.done >= w.total) {
        node.position.set(place.x, 0, place.z);
        node.rotation.y = place.angle;
        walk.current = null;
        setMoving(false);
        onWalk(agent.id, false);
      } else {
        const [x, z, facing] = alongPath(w.points, w.at, w.done);
        node.position.set(x, 0, z);
        // turn toward the way they go, smoothly, the short way round
        const turn = ((((facing - node.rotation.y + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
        node.rotation.y += turn * Math.min(1, delta * 10);
      }
    }
    if (!paused && body.current) {
      // a step while walking, a sway while working, a nod while talking, a swing at the ping-pong table, a slow breath asleep
      const k = place.angle;
      body.current.position.y = moving
        ? Math.abs(Math.sin(t * 9)) * 0.06
        : busy
          ? Math.sin(t * 3 + k) * 0.025
          : saying
            ? Math.abs(Math.sin(t * 7)) * 0.035
            : lying
              ? Math.sin(t * 1.1 + k) * 0.015
              : standing
                ? Math.abs(Math.sin(t * 3.9)) * 0.05
                : 0;
      body.current.rotation.z = moving ? Math.sin(t * 9) * 0.08 : 0;
      body.current.rotation.y = moving ? 0 : busy ? Math.sin(t * 1.3 + k) * 0.08 : standing ? Math.sin(t * 3.9 + k) * 0.35 : saying || listening ? Math.sin(t * 2 + k) * 0.14 : 0;
    }
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
  const tagHeight = lying ? 1.25 : standing ? HEAD_HEIGHT + 0.9 : HEAD_HEIGHT + 0.65;
  const atDesk = place.zone === 'work' && !moving;

  return (
    <group ref={root}>
      <group onClick={select} onPointerOver={() => (document.body.style.cursor = 'pointer')} onPointerOut={() => (document.body.style.cursor = '')}>
        {/* asleep: on their back in the pod, head outwards; standing or walking: a little higher, no chair */}
        <group position={lying ? [0, 0.62, -0.5] : [0, standing ? 0.25 : 0, atDesk ? 0.08 : 0]} rotation={lying ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
          <group ref={body}>
            <Astronaut id={agent.id} color={agent.color} tone={tone} />
          </group>
        </group>
        {!lying && (
          <mesh position={[0, 0.02, atDesk ? -0.25 : 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[atDesk ? 0.95 : 0.6, 40]} />
            <meshBasicMaterial color={agent.color} transparent opacity={selected ? 0.32 : 0.07} />
          </mesh>
        )}
        {selected && (
          <mesh position={[0, lying ? 0.45 : 0.025, atDesk ? -0.25 : 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.95, 1.04, 48]} />
            <meshBasicMaterial color={agent.color} />
          </mesh>
        )}
      </group>
      <mesh ref={ping} position={[0, 0.04, -0.25]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.8, 0.9, 48]} />
        <meshBasicMaterial color={agent.color} transparent opacity={0} />
      </mesh>
      <Html position={[0, tagHeight + 0.3, 0]} zIndexRange={[31, 0]} className="pointer-events-none">
        <div className="station-above">
          {saying ? (
            <p key={saying.key} className="station-bubble" style={{ '--c': agent.color }}>
              {saying.text}
            </p>
          ) : listening ? (
            <span className="station-mood is-listening" aria-hidden="true">
              💬
            </span>
          ) : (
            <span className="station-mood" data-kind={moving ? 'idle' : mood.kind} title={moving ? tr('On the way') : mood.word}>
              <span aria-hidden="true">{moving ? '🚶' : mood.icon}</span>
              {!compact && <span className="station-mood-word">{moving ? tr('On the way') : mood.word}</span>}
              {!moving && mood.kind === 'busy' && <i className="station-dots" aria-hidden="true" />}
            </span>
          )}
        </div>
      </Html>
      <Html position={[0, tagHeight, 0]} center zIndexRange={[30, 0]}>
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

/** A word on its way: a small spark from whoever speaks to whoever listens, once per line. */
function Whisper({ from, to, color }) {
  const spark = useRef();
  const start = useRef(null);
  const mid = useMemo(() => flightMid(from, to), [from, to]);
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - start.current) / WHISPER_SECONDS);
    const [x, y, z] = along(from, mid, to, ease(t));
    spark.current.position.set(x, y, z);
    spark.current.scale.setScalar(t >= 1 ? 0 : 1);
  });
  return (
    <Trail width={0.6} length={3} color={color} attenuation={(w) => w * w}>
      <mesh ref={spark} position={from}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </Trail>
  );
}

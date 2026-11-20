import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Sparkles } from '@react-three/drei';
import { CANTEEN_COUNTER, CANTEEN_TABLES, ZONES } from './layout';
import { Plant, SideDeck, ZONE_COLOR } from './Zones3D';

// The canteen, the fifth deck of the station (south of the work deck, over its own glass bridge): two long tables with a
// bench down each side, under hanging lamps; on the tables, bowls that steam where someone is eating (the more people, the
// more bowls). By the door, on one side the serving counter with trays of food under a glowing menu board whose lines light
// one after another, on the other a drinks machine, both turned to the room (and to whoever looks at the deck). It is busiest at lunch and dinner (layout.js sends the crew there then).

const FOODS = ['#f2c14e', '#e0703c', '#7fbf6a', '#d65a5a'];

/** A bench without a back, along a table: its long side runs along the deck's z. */
function Bench({ position, length = 3 }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.42, 0.08, length]} radius={0.03} position={[0, 0.42, 0]}>
        <meshStandardMaterial color="#e0a978" roughness={0.7} />
      </RoundedBox>
      {[-1, 1].map((end) => (
        <mesh key={end} position={[0, 0.2, end * (length / 2 - 0.25)]}>
          <boxGeometry args={[0.3, 0.4, 0.06]} />
          <meshStandardMaterial color="#202636" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/** A bowl of something hot on a tray: a white bowl, chopsticks beside it, and steam that rises. */
function Meal({ position, hue, paused, steam }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[0.46, 0.012, 0.34]} />
        <meshStandardMaterial color="#3b4258" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.12, 0.07, 0.12, 16, 1, true]} />
        <meshStandardMaterial color="#f4efe6" side={2} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.115, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.112, 16]} />
        <meshStandardMaterial color={hue} roughness={0.8} />
      </mesh>
      {[0.15, 0.17].map((x, i) => (
        <mesh key={x} position={[x, 0.025, 0.02 + i * 0.02]} rotation={[0, 0.25, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.3, 4]} />
          <meshStandardMaterial color="#c9935e" />
        </mesh>
      ))}
      {steam && <Sparkles count={5} scale={[0.15, 0.5, 0.15]} position={[0, 0.4, 0]} size={1.6} speed={paused ? 0 : 0.5} color="#ffffff" opacity={0.45} />}
    </group>
  );
}

function Table({ position, index, bowls, paused, color, lampRef }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.95, 0.07, 3.2]} radius={0.03} position={[0, 0.76, 0]}>
        <meshStandardMaterial color="#f1e6d6" roughness={0.55} />
      </RoundedBox>
      <mesh position={[0, 0.725, 0]}>
        <boxGeometry args={[0.97, 0.01, 3.22]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      {[-1.3, 1.3].map((dz) => (
        <mesh key={dz} position={[0, 0.37, dz]}>
          <cylinderGeometry args={[0.05, 0.08, 0.74, 8]} />
          <meshStandardMaterial color="#202636" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <Bench position={[-0.82, 0, 0]} />
      <Bench position={[0.82, 0, 0]} />
      {/* a bowl in front of each place that is taken, this table's six after the other's */}
      {[-1, 1].flatMap((side) =>
        [-1, 0, 1].map((row) => {
          const n = index * 6 + (side + 1) * 1.5 + (row + 1);
          return n < bowls ? <Meal key={`${side}:${row}`} position={[side * 0.26, 0.8, row * 0.95]} hue={FOODS[n % FOODS.length]} paused={paused} steam={n % 2 === 0} /> : null;
        })
      )}
      {/* a lamp hanging over the middle of the table, and its pool of light on it */}
      <group ref={lampRef} position={[0, 2.45, 0]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 1.2, 4]} />
          <meshBasicMaterial color="#555555" />
        </mesh>
        <mesh>
          <coneGeometry args={[0.34, 0.26, 20, 1, true]} />
          <meshStandardMaterial color="#2d2a3a" side={2} metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <sphereGeometry args={[0.11, 12, 8]} />
          <meshBasicMaterial color="#ffd9a8" toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 0.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 24]} />
        <meshBasicMaterial color="#ffd9a8" transparent opacity={0.08} blending={2} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function CanteenDeck({ onFocus, paused, crowd = 0 }) {
  const zone = ZONES.canteen;
  const color = ZONE_COLOR.canteen;
  const tables = CANTEEN_TABLES.map((t) => [t.x - zone.x, 0, t.z - zone.z]);
  const counter = [CANTEEN_COUNTER.x - zone.x, CANTEEN_COUNTER.z - zone.z];
  const menu = useRef([]);
  const lamps = useRef([]);
  const fridge = useRef();
  const bowls = Math.min(12, crowd);

  useFrame(({ clock }) => {
    if (paused) return;
    const t = clock.elapsedTime;
    menu.current.forEach((m, i) => {
      if (m) m.opacity = 0.35 + 0.6 * Math.max(0, Math.sin(t * 1.3 - i * 0.7));
    });
    lamps.current.forEach((g, i) => {
      if (g) g.position.y = 2.45 + Math.sin(t * 0.7 + i) * 0.04;
    });
    if (fridge.current) fridge.current.opacity = 0.65 + Math.sin(t * 2.2) * 0.1;
  });

  return (
    <SideDeck zone={zone} color={color} onFocus={onFocus} crowd={crowd} paused={paused}>
      {/* a warm floor under the tables */}
      <mesh position={[0, 0.012, 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.4, 4.2]} />
        <meshStandardMaterial color="#2a2230" roughness={0.9} />
      </mesh>
      {tables.map((position, i) => (
        <Table key={i} position={position} index={i} bowls={bowls} paused={paused} color={color} lampRef={(g) => (lamps.current[i] = g)} />
      ))}

      {/* the serving counter by the door: trays of food under a glass, a light along its front (its +z, toward the room) */}
      <group position={[counter[0], 0, counter[1]]} rotation={[0, -0.32, 0]}>
        <RoundedBox args={[2.7, 0.95, 0.8]} radius={0.06} position={[0, 0.47, 0]}>
          <meshStandardMaterial color="#3a3348" metalness={0.35} roughness={0.45} />
        </RoundedBox>
        <mesh position={[0, 0.5, 0.41]}>
          <boxGeometry args={[2.5, 0.05, 0.01]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        {FOODS.map((hue, i) => (
          <group key={hue} position={[-0.96 + i * 0.64, 0.97, 0]}>
            <mesh>
              <boxGeometry args={[0.56, 0.06, 0.5]} />
              <meshStandardMaterial color="#c8ccd6" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.045, 0]}>
              <boxGeometry args={[0.48, 0.04, 0.42]} />
              <meshStandardMaterial color={hue} roughness={0.85} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.32, 0.12]} rotation={[-0.35, 0, 0]}>
          <boxGeometry args={[2.6, 0.5, 0.02]} />
          <meshStandardMaterial color="#cfe8ff" transparent opacity={0.16} depthWrite={false} />
        </mesh>
        <Sparkles count={10} scale={[2.3, 0.7, 0.4]} position={[0, 1.3, 0]} size={1.8} speed={paused ? 0 : 0.5} color="#ffffff" opacity={0.4} />

        {/* the menu board on two legs behind the counter, facing the room: the day's dishes, lighting one after another */}
        <group position={[0, 0, -0.55]}>
          {[-1.2, 1.2].map((x) => (
            <mesh key={x} position={[x, 1.1, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 2.2, 6]} />
              <meshStandardMaterial color="#202636" metalness={0.8} roughness={0.3} />
            </mesh>
          ))}
          <RoundedBox args={[2.7, 1.05, 0.08]} radius={0.04} position={[0, 2.25, 0]}>
            <meshStandardMaterial color="#14121c" roughness={0.5} />
          </RoundedBox>
          {[0, 1, 2, 3].map((i) => (
            <group key={i} position={[0, 2.55 - i * 0.2, 0.05]}>
              <mesh position={[-0.3, 0, 0]}>
                <planeGeometry args={[1.7 - (i % 2) * 0.4, 0.07]} />
                <meshBasicMaterial ref={(m) => (menu.current[i] = m)} color={i === 0 ? color : '#ffe9c9'} transparent opacity={0.7} toneMapped={false} />
              </mesh>
              <mesh position={[0.95, 0, 0]}>
                <planeGeometry args={[0.32, 0.07]} />
                <meshBasicMaterial color="#6be0c0" transparent opacity={0.85} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* the drinks machine beside the counter: its front lit, cans on its shelves */}
      <group position={[-2.8, 0, -3.25]} rotation={[0, 0.5, 0]}>
        <RoundedBox args={[0.9, 1.9, 0.7]} radius={0.07} position={[0, 0.95, 0]}>
          <meshStandardMaterial color="#c23d4b" metalness={0.3} roughness={0.4} />
        </RoundedBox>
        <mesh position={[-0.08, 1.05, 0.355]}>
          <planeGeometry args={[0.56, 1.3]} />
          <meshBasicMaterial ref={fridge} color="#ffe3c4" transparent opacity={0.7} toneMapped={false} />
        </mesh>
        {[0, 1, 2].flatMap((row) =>
          [0, 1, 2].map((col) => (
            <mesh key={`${row}:${col}`} position={[-0.26 + col * 0.18, 0.62 + row * 0.4, 0.37]}>
              <cylinderGeometry args={[0.055, 0.055, 0.2, 10]} />
              <meshStandardMaterial color={['#6be0c0', '#ffc46b', '#8fb4ff'][(row + col) % 3]} metalness={0.6} roughness={0.3} />
            </mesh>
          ))
        )}
      </group>
      <Plant position={[-4.1, 0, -1.4]} scale={1.1} paused={paused} hue="#4fbf7a" />
      <Plant position={[4.2, 0, 1.6]} scale={0.9} paused={paused} />
    </SideDeck>
  );
}

import { RING_RADIUS, ringSeats, statusTone } from './model';

// Where everyone is on the station. The work deck is the round one in the middle (the owner's core and every desk); round it,
// over glass bridges, a meeting room, a lounge and the sleeping quarters. Whoever works sits at their desk; the others spend
// their time in the lounge or the meeting room, and those with no worker connected now and then go to sleep in a pod. Where a
// free one goes changes every while (`slot`), the same for the same slot, so every render agrees and nothing jumps about.

export const WORK_DECK = RING_RADIUS + 2.6;

export const ZONES = {
  work: { id: 'work', x: 0, z: 0, radius: WORK_DECK },
  meeting: { id: 'meeting', x: 0, z: -(WORK_DECK + 11), radius: 4.6 },
  lounge: { id: 'lounge', x: WORK_DECK + 12, z: 1.5, radius: 6 },
  sleep: { id: 'sleep', x: -(WORK_DECK + 11.5), z: 1.5, radius: 5.2 },
};
export const SIDE_ZONES = ['meeting', 'lounge', 'sleep'];

/** A spot round a centre, facing it: `angle` is the way out from the centre (the seat's own frame looks back at it). */
const around = (zone, count, radius, start = 0) =>
  Array.from({ length: count }, (_, i) => {
    const angle = start + (i / count) * Math.PI * 2;
    return { zone: zone.id, x: +(zone.x + radius * Math.sin(angle)).toFixed(4), z: +(zone.z + radius * Math.cos(angle)).toFixed(4), angle };
  });

// the meeting table seats eight; the lounge has bean bags round a low table and the two ends of a ping-pong table;
// the quarters have a pod for each crew member
export const MEETING_TABLE = { x: ZONES.meeting.x, z: ZONES.meeting.z };
export const LOUNGE_TABLE = { x: ZONES.lounge.x - 1.6, z: ZONES.lounge.z + 0.6 };
export const PING_PONG = { x: ZONES.lounge.x + 2.9, z: ZONES.lounge.z - 0.4, half: 1.05 };

const MEETING_SPOTS = around(ZONES.meeting, 8, 2.35, Math.PI / 8);
const LOUNGE_SPOTS = [
  ...around({ id: 'lounge', ...LOUNGE_TABLE }, 7, 2.2, Math.PI / 7),
  // the two players, each at an end of the table, facing it
  { zone: 'lounge', x: PING_PONG.x, z: PING_PONG.z - PING_PONG.half - 0.55, angle: Math.PI, game: true },
  { zone: 'lounge', x: PING_PONG.x, z: PING_PONG.z + PING_PONG.half + 0.55, angle: 0, game: true },
];
export const PODS = around(ZONES.sleep, 11, 3.3, Math.PI / 11);

const NONE = new Set();
const hash = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Where a crew member wants to be for this slot: in the meeting room while Mira briefs them on a task she handed them, at
 * their desk while working, otherwise lounge, meeting room or bed.
 */
export const zoneOf = (agent, slot, briefed = NONE) => {
  if (briefed.has(agent.id)) return 'meeting';
  const tone = statusTone(agent.status);
  if (tone === 'busy') return 'work';
  const roll = hash(`${agent.id}#${slot}`) % 10;
  if (tone === 'offline') return roll < 4 ? 'sleep' : roll < 8 ? 'lounge' : 'meeting';
  return roll < 7 ? 'lounge' : 'meeting';
};

/**
 * Everyone's place for this slot: { [id]: { zone, x, z, angle, pose, game? } }. Desks are each crew member's own. In a room,
 * everyone has a place of their own to go to (from their place in the crew and the slot), and takes the next one round only
 * when it is taken, so one person coming or going does not make the others move. Two in the lounge play ping-pong when at
 * least three are there; whoever finds a room full goes to the lounge, then to bed. Those being briefed (`briefed`) are
 * seated at the meeting table first, and marked so.
 */
export const placeCrew = (crew, slot = 0, briefed = NONE) => {
  const desks = ringSeats(crew.map((a) => a.id));
  const places = {};
  const spots = { meeting: MEETING_SPOTS, lounge: LOUNGE_SPOTS.filter((s) => !s.game), sleep: PODS };
  const taken = { meeting: new Set(), lounge: new Set(), sleep: new Set() };
  const games = LOUNGE_SPOTS.filter((s) => s.game);
  const wanting = { meeting: [], lounge: [], sleep: [] };

  crew.forEach((agent, i) => {
    const zone = zoneOf(agent, slot, briefed);
    if (zone === 'work') places[agent.id] = { ...desks[i], zone: 'work', pose: 'sit' };
    else wanting[zone].push([agent.id, i]);
  });
  // the two players: the ones in the lounge this slot picks first (so it does not hang on who else is there)
  if (wanting.lounge.length >= 3) {
    const players = [...wanting.lounge].sort((a, b) => hash(`${a[0]}@${slot}`) - hash(`${b[0]}@${slot}`)).slice(0, 2);
    players.forEach(([id], k) => (places[id] = { ...games[k], pose: 'stand' }));
    wanting.lounge = wanting.lounge.filter(([id]) => !players.some(([p]) => p === id));
  }
  const seat = ([id, i], order) => {
    for (const zone of order) {
      const list = spots[zone];
      const first = (i + slot) % list.length;
      for (let k = 0; k < list.length; k++) {
        const n = (first + k) % list.length;
        if (taken[zone].has(n)) continue;
        taken[zone].add(n);
        places[id] = { ...list[n], pose: zone === 'sleep' ? 'lie' : 'sit' };
        return;
      }
    }
  };
  const briefing = wanting.meeting.filter(([id]) => briefed.has(id));
  briefing.forEach((who) => {
    seat(who, ['meeting', 'lounge', 'sleep']);
    if (places[who[0]]) places[who[0]].brief = true;
  });
  wanting.meeting.filter(([id]) => !briefed.has(id)).forEach((who) => seat(who, ['meeting', 'lounge', 'sleep']));
  wanting.lounge.forEach((who) => seat(who, ['lounge', 'meeting', 'sleep']));
  wanting.sleep.forEach((who) => seat(who, ['sleep', 'lounge', 'meeting']));
  return places;
};

/** Who is in each room, in crew order: the talks only pair people in the same one (and nobody talks in their sleep). */
export const roomsOf = (crew, places) => {
  const rooms = { work: [], meeting: [], lounge: [], sleep: [] };
  crew.forEach((agent) => {
    const place = places[agent.id];
    if (place && !place.game) rooms[place.zone].push(agent.id);
  });
  return rooms;
};

/** Where a glass bridge runs: from the work deck's rim to a side deck's rim, along the line between their centres. */
export const bridgeTo = (zoneId) => {
  const zone = ZONES[zoneId];
  const length = Math.hypot(zone.x, zone.z);
  const ux = zone.x / length;
  const uz = zone.z / length;
  const from = [ux * (WORK_DECK - 0.3), uz * (WORK_DECK - 0.3)];
  const to = [zone.x - ux * (zone.radius - 0.3), zone.z - uz * (zone.radius - 0.3)];
  return { from, to, length: Math.hypot(to[0] - from[0], to[1] - from[1]), angle: Math.atan2(ux, uz), mid: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2] };
};

// ---- walking about: the way from one place to another, over the decks and the bridges ----

/** The walkway round the work deck, outside the desks, and how fast the crew walk (units a second). */
export const WALKWAY = WORK_DECK - 0.75;
export const WALK_SPEED = 3.2;

const angleOf = (x, z) => Math.atan2(x, z);
const onWalkway = (angle) => [WALKWAY * Math.sin(angle), WALKWAY * Math.cos(angle)];

/** Round the walkway from one angle to another, the short way, a point every so often. */
const arc = (from, to) => {
  const turn = ((((to - from + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
  const steps = Math.max(1, Math.ceil(Math.abs(turn) / 0.25));
  return Array.from({ length: steps + 1 }, (_, i) => onWalkway(from + (turn * i) / steps));
};

/** Where a side deck's bridge meets the work deck's walkway (its angle), and where it lands on the side deck. */
const doorsOf = (zoneId) => {
  const b = bridgeTo(zoneId);
  return { angle: angleOf(b.from[0], b.from[1]), inner: b.from, outer: b.to };
};

/**
 * The way a crew member walks from where they are (`from`: x, z and the deck they are on) to a place (`to`: x, z, zone):
 * a list of [x, z] points. Inside one side deck it is straight there; on the work deck, round the walkway outside the desks
 * (never through the core); between decks, out over one bridge, round the walkway and in over the other.
 */
export const pathBetween = (from, to) => {
  const start = [from.x, from.z];
  const end = [to.x, to.z];
  if (from.zone === to.zone && from.zone !== 'work') return [start, end];
  const points = [start];
  // from a side deck, out to its bridge and over it onto the work deck
  let angle;
  if (from.zone === 'work') {
    angle = angleOf(from.x, from.z);
    points.push(onWalkway(angle));
  } else {
    const door = doorsOf(from.zone);
    points.push(door.outer, door.inner);
    angle = door.angle;
  }
  if (to.zone === 'work') {
    const seat = angleOf(to.x, to.z);
    points.push(...arc(angle, seat).slice(1), end);
  } else {
    const door = doorsOf(to.zone);
    points.push(...arc(angle, door.angle).slice(1), door.inner, door.outer, end);
  }
  return points;
};

/** A path's length, and the length walked at each of its points. */
export const measure = (points) => {
  const at = [0];
  for (let i = 1; i < points.length; i++) at.push(at[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  return { at, total: at[at.length - 1] };
};

/** Where on a path someone is after walking `distance`, and the way they face: [x, z, angle]. */
export const alongPath = (points, at, distance) => {
  const total = at[at.length - 1];
  const d = Math.min(Math.max(distance, 0), total);
  let i = 1;
  while (i < points.length - 1 && at[i] < d) i++;
  const [ax, az] = points[i - 1];
  const [bx, bz] = points[i];
  const span = at[i] - at[i - 1] || 1;
  const k = (d - at[i - 1]) / span;
  // they face where they go: their front is -z of their own frame
  return [ax + (bx - ax) * k, az + (bz - az) * k, Math.atan2(-(bx - ax), -(bz - az))];
};

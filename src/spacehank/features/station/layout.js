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

const hash = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Where a crew member wants to be for this slot: their desk while working, otherwise lounge, meeting room or bed. */
export const zoneOf = (agent, slot) => {
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
 * least three are there; whoever finds a room full goes to the lounge, then to bed.
 */
export const placeCrew = (crew, slot = 0) => {
  const desks = ringSeats(crew.map((a) => a.id));
  const places = {};
  const spots = { meeting: MEETING_SPOTS, lounge: LOUNGE_SPOTS.filter((s) => !s.game), sleep: PODS };
  const taken = { meeting: new Set(), lounge: new Set(), sleep: new Set() };
  const games = LOUNGE_SPOTS.filter((s) => s.game);
  const wanting = { meeting: [], lounge: [], sleep: [] };

  crew.forEach((agent, i) => {
    const zone = zoneOf(agent, slot);
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
  wanting.meeting.forEach((who) => seat(who, ['meeting', 'lounge', 'sleep']));
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

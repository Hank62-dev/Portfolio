import { describe, expect, it } from 'vitest';
import { PODS, ZONES, alongPath, bridgeTo, measure, pathBetween, placeCrew, roomsOf, zoneOf } from './layout';

const crew = ['codex', 'claude', 'nova', 'pixel', 'atlas', 'rhea', 'gemini', 'grok', 'deepseek', 'qwen', 'mira'].map((id) => ({ id, status: 'offline' }));
const inZone = (place) => {
  const zone = ZONES[place.zone];
  return Math.hypot(place.x - zone.x, place.z - zone.z) < zone.radius;
};

describe('who is where on the station', () => {
  it('sits whoever works at their desk', () => {
    const busy = crew.map((a, i) => (i === 2 ? { ...a, status: 'working' } : a));
    expect(zoneOf(busy[2], 0)).toBe('work');
    expect(placeCrew(busy, 0).nova.zone).toBe('work');
  });

  it('gives everyone a place, inside their deck, and never two the same', () => {
    for (let slot = 0; slot < 30; slot++) {
      const places = placeCrew(crew, slot);
      expect(Object.keys(places)).toHaveLength(crew.length);
      Object.values(places).forEach((place) => expect(inZone(place)).toBe(true));
      const spots = Object.values(places).map((p) => `${p.x},${p.z}`);
      expect(new Set(spots).size).toBe(spots.length);
    }
  });

  it('keeps the same places for the same slot, and moves people for another', () => {
    expect(placeCrew(crew, 4)).toEqual(placeCrew(crew, 4));
    const moved = Array.from({ length: 10 }, (_, slot) => placeCrew(crew, slot).nova.zone);
    expect(new Set(moved).size).toBeGreaterThan(1);
  });

  it('does not move everyone when one gets a task', () => {
    for (let slot = 0; slot < 20; slot++) {
      const before = placeCrew(crew, slot);
      const after = placeCrew(
        crew.map((a) => (a.id === 'pixel' ? { ...a, status: 'working' } : a)),
        slot,
      );
      const moved = crew.filter((a) => a.id !== 'pixel' && (before[a.id].x !== after[a.id].x || before[a.id].z !== after[a.id].z));
      // at most someone who was bumped from a taken place, and the ping-pong pair if pixel was playing
      expect(moved.length).toBeLessThanOrEqual(3);
    }
  });

  it('puts the sleepers in pods, lying down', () => {
    const slot = Array.from({ length: 40 }, (_, k) => k).find((k) => Object.values(placeCrew(crew, k)).some((p) => p.pose === 'lie'));
    const sleepers = Object.values(placeCrew(crew, slot)).filter((p) => p.pose === 'lie');
    sleepers.forEach((p) => expect(PODS.some((pod) => pod.x === p.x && pod.z === p.z)).toBe(true));
  });

  it('plays ping-pong two at a time, and leaves the players out of the talks', () => {
    for (let slot = 0; slot < 30; slot++) {
      const places = placeCrew(crew, slot);
      const players = Object.entries(places).filter(([, p]) => p.game);
      expect([0, 2]).toContain(players.length);
      const rooms = roomsOf(crew, places);
      players.forEach(([id]) => expect(rooms.lounge).not.toContain(id));
    }
  });

  it('runs each bridge from the work deck to its side deck', () => {
    ['meeting', 'lounge', 'sleep'].forEach((id) => {
      const b = bridgeTo(id);
      expect(b.length).toBeGreaterThan(5);
      const zone = ZONES[id];
      expect(Math.hypot(b.to[0] - zone.x, b.to[1] - zone.z)).toBeLessThan(zone.radius);
      expect(Math.hypot(...b.from)).toBeLessThan(ZONES.work.radius);
    });
  });
});

describe('walking about the station', () => {
  const spot = (zone) => Object.values(placeCrew(crew, 0)).find((p) => p.zone === zone) ?? { zone, x: ZONES[zone].x, z: ZONES[zone].z };
  const desk = { zone: 'work', x: 0, z: -7 };

  it('goes straight across a side deck', () => {
    expect(pathBetween({ zone: 'lounge', x: ZONES.lounge.x, z: 0 }, { zone: 'lounge', x: ZONES.lounge.x + 1, z: 1 })).toHaveLength(2);
  });

  it('never walks through the core, and stays on the decks and bridges', () => {
    const ends = [desk, spot('lounge'), spot('meeting'), { zone: 'sleep', x: PODS[3].x, z: PODS[3].z }];
    for (const from of ends) {
      for (const to of ends) {
        if (from === to) continue;
        const points = pathBetween(from, to);
        expect(points[0]).toEqual([from.x, from.z]);
        expect(points.at(-1)).toEqual([to.x, to.z]);
        // sample the way: every point is on a deck or a bridge, and none near the core
        const { at, total } = measure(points);
        for (let d = 0; d <= total; d += 0.25) {
          const [x, z] = alongPath(points, at, d);
          expect(Math.hypot(x, z)).toBeGreaterThan(3);
          const onDeck = Object.values(ZONES).some((zone) => Math.hypot(x - zone.x, z - zone.z) <= zone.radius + 0.05);
          const onBridge = ['meeting', 'lounge', 'sleep'].some((id) => {
            const b = bridgeTo(id);
            const [ax, az] = b.from;
            const [bx, bz] = b.to;
            const k = ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2);
            return k >= -0.01 && k <= 1.01 && Math.hypot(ax + k * (bx - ax) - x, az + k * (bz - az) - z) < 0.85;
          });
          expect(onDeck || onBridge).toBe(true);
        }
      }
    }
  });

  it('faces the way it goes', () => {
    const points = [
      [0, 0],
      [0, -4],
    ];
    const { at } = measure(points);
    const [, , facing] = alongPath(points, at, 1);
    // the front is -z of the frame turned by `facing`: walking toward -z means no turn
    expect(Math.abs(facing)).toBeCloseTo(0, 5);
  });
});

describe('a briefing', () => {
  it('seats the briefed at the meeting table, even while they work', () => {
    const busy = crew.map((a) => (a.id === 'nova' ? { ...a, status: 'working' } : a));
    const places = placeCrew(busy, 0, new Set(['nova', 'mira']));
    expect(places.nova).toMatchObject({ zone: 'meeting', brief: true });
    expect(places.mira).toMatchObject({ zone: 'meeting', brief: true });
  });
});

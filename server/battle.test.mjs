import { describe, expect, it } from 'vitest';
import { createBattle } from './battle.mjs';
import { SIZE, randomFleet } from '../src/spacehank/games/battleship.js';

// A stand-in for a WebSocket: what the server sends is kept, and `say` plays a message from the player.
const fake = () => {
  const handlers = {};
  const socket = {
    readyState: 1,
    sent: [],
    send: (raw) => socket.sent.push(JSON.parse(raw)),
    on: (event, handler) => {
      handlers[event] = handler;
    },
    close: () => {
      if (socket.readyState === 3) return;
      socket.readyState = 3;
      handlers.close?.();
    },
    say: (message) => handlers.message?.(typeof message === 'string' ? message : JSON.stringify(message)),
    last: (type) => [...socket.sent].reverse().find((m) => m.type === type),
  };
  return socket;
};

const connect = (battle) => {
  const socket = fake();
  battle.attach(socket);
  return socket;
};
const fleetMessage = (fleet) => ({ type: 'ready', fleet: fleet.map((ship) => ({ cells: ship.cells })) });

/** Two players in a room, both with a fleet, battle under way. */
const start = (battle = createBattle()) => {
  const a = connect(battle);
  a.say({ type: 'create', name: 'An' });
  const b = connect(battle);
  b.say({ type: 'join', code: a.last('joined').code, name: 'Binh' });
  const fleets = [randomFleet(), randomFleet()];
  a.say(fleetMessage(fleets[0]));
  b.say(fleetMessage(fleets[1]));
  return { battle, sockets: [a, b], fleets, room: () => a.last('room') };
};

describe('rooms', () => {
  it('makes a room with a four-letter code and a private token', () => {
    const battle = createBattle();
    const a = connect(battle);
    a.say({ type: 'create', name: '  An  ' });
    expect(a.last('joined')).toMatchObject({ seat: 0, code: expect.stringMatching(/^[A-Z2-9]{4}$/), token: expect.stringMatching(/^[0-9a-f]{32}$/) });
    expect(a.last('room')).toMatchObject({ phase: 'wait', seat: 0, names: ['An', null] });
    expect(battle.size()).toBe(1);
  });

  it('lets a second player in by code, whatever the letter case', () => {
    const battle = createBattle();
    const a = connect(battle);
    a.say({ type: 'create', name: 'An' });
    const b = connect(battle);
    b.say({ type: 'join', code: a.last('joined').code.toLowerCase(), name: 'Binh' });
    expect(b.last('joined')).toMatchObject({ seat: 1 });
    expect(a.last('room')).toMatchObject({ phase: 'place', names: ['An', 'Binh'], present: [true, true] });
  });

  it('refuses an unknown code, a third player and a second room from one connection', () => {
    const battle = createBattle();
    const a = connect(battle);
    a.say({ type: 'create', name: 'An' });
    const code = a.last('joined').code;
    const b = connect(battle);
    b.say({ type: 'join', code: 'ZZZZ' });
    expect(b.last('error').error).toMatch(/No room/);
    b.say({ type: 'join', code });
    const c = connect(battle);
    c.say({ type: 'join', code });
    expect(c.last('error').error).toMatch(/full/);
    a.say({ type: 'create' });
    expect(a.last('error').error).toMatch(/already/);
  });

  it('stops making rooms when the server is full', () => {
    const battle = createBattle({ maxRooms: 1 });
    connect(battle).say({ type: 'create' });
    const late = connect(battle);
    late.say({ type: 'create' });
    expect(late.last('error').error).toMatch(/full/);
  });

  it('survives garbage', () => {
    const battle = createBattle();
    const a = connect(battle);
    a.say('not json');
    a.say({ type: 'nonsense' });
    a.say('null');
    a.say({ type: 'fire', cell: 3 });
    expect(a.sent.filter((m) => m.type === 'error').length).toBeGreaterThan(0);
  });

  it('closes a connection that talks too much', () => {
    const battle = createBattle({ rate: { messages: 3, perMs: 1000 } });
    const a = connect(battle);
    for (let i = 0; i < 5; i += 1) a.say({ type: 'nonsense' });
    expect(a.readyState).toBe(3);
  });
});

describe('placing the fleet', () => {
  const twoInARoom = () => {
    const battle = createBattle();
    const a = connect(battle);
    a.say({ type: 'create', name: 'An' });
    const b = connect(battle);
    b.say({ type: 'join', code: a.last('joined').code, name: 'Binh' });
    return { a, b };
  };

  it('rejects a fleet that breaks the rules', () => {
    const { a } = twoInARoom();
    const fleet = randomFleet();
    a.say({ type: 'ready', fleet: fleet.slice(1).map((s) => ({ cells: s.cells })) });
    expect(a.last('error').error).toMatch(/not allowed/);
    a.say({ type: 'ready', fleet: fleet.map((s) => ({ cells: s.cells.map((c) => c + SIZE * SIZE) })) });
    expect(a.sent.filter((m) => m.type === 'error')).toHaveLength(2);
    a.say({ type: 'ready', fleet: 'a fleet' });
    expect(a.sent.filter((m) => m.type === 'error')).toHaveLength(3);
  });

  it('starts the battle when both are ready, and shows each one only their own boats', () => {
    const { sockets, fleets } = start();
    const [a, b] = sockets;
    expect(a.last('room')).toMatchObject({ phase: 'play', ready: [true, true] });
    expect(a.last('room').mine.fleet.map((s) => s.cells)).toEqual(expect.arrayContaining(fleets[0].map((s) => s.cells)));
    expect(JSON.stringify(a.last('room'))).not.toContain(JSON.stringify(fleets[1][0].cells));
    expect(b.last('room').theirs.sunk).toEqual([]);
  });
});

describe('the battle', () => {
  const turnOf = (t) => t.room().turn;
  const fire = (t, seat, cell) => t.sockets[seat].say({ type: 'fire', cell });

  it('only lets the player whose turn it is shoot', () => {
    const t = start();
    const turn = turnOf(t);
    fire(t, 1 - turn, 5);
    expect(t.sockets[1 - turn].last('error').error).toMatch(/turn/);
    expect(t.room().last).toBeNull();
  });

  it('keeps the turn on a hit and passes it on a miss', () => {
    const t = start();
    const turn = turnOf(t);
    const foe = t.fleets[1 - turn];
    fire(t, turn, foe[0].cells[0]);
    expect(t.room().last).toMatchObject({ by: turn, outcome: expect.stringMatching(/hit|sunk/) });
    expect(turnOf(t)).toBe(turn);
    const water = [...Array(SIZE * SIZE).keys()].find((i) => !foe.some((s) => s.cells.includes(i)));
    fire(t, turn, water);
    expect(t.room().last).toMatchObject({ by: turn, cell: water, outcome: 'miss' });
    expect(turnOf(t)).toBe(1 - turn);
  });

  it('ignores a square that was already shot and a nonsense square', () => {
    const t = start();
    const turn = turnOf(t);
    const foe = t.fleets[1 - turn];
    fire(t, turn, foe[0].cells[0]);
    const before = t.sockets[turn].sent.length;
    fire(t, turn, foe[0].cells[0]);
    expect(t.sockets[turn].sent.length).toBe(before);
    fire(t, turn, 100);
    fire(t, turn, 'A1');
    fire(t, turn, 1.5);
    expect(t.sockets[turn].sent.filter((m) => m.type === 'error')).toHaveLength(3);
  });

  it('shows a boat to the shooter only once it has sunk', () => {
    const t = start();
    const turn = turnOf(t);
    const foe = t.fleets[1 - turn];
    const single = foe.find((s) => s.size === 1);
    fire(t, turn, single.cells[0]);
    expect(t.sockets[turn].last('room').theirs.sunk.map((s) => s.cells)).toEqual([single.cells]);
    const big = foe.find((s) => s.size === 4);
    fire(t, turn, big.cells[0]);
    expect(t.sockets[turn].last('room').theirs.sunk).toHaveLength(1);
  });

  const win = (t) => {
    // whoever's turn it is shoots every square of the other fleet
    const turn = turnOf(t);
    for (const ship of t.fleets[1 - turn]) for (const cell of ship.cells) fire(t, turn, cell);
    return turn;
  };

  it('ends when a fleet is gone and then shows both fleets', () => {
    const t = start();
    const winner = win(t);
    expect(t.room()).toMatchObject({ phase: 'over', winner });
    expect(t.room().theirs.sunk).toHaveLength(10);
    expect(t.sockets[1 - winner].last('room').theirs.sunk).toHaveLength(10);
    fire(t, winner, 0);
    expect(t.sockets[winner].last('error').error).toMatch(/not started/);
  });

  it('starts again only when both want a rematch', () => {
    const t = start();
    win(t);
    t.sockets[0].say({ type: 'rematch' });
    expect(t.room()).toMatchObject({ phase: 'over', rematch: [true, false] });
    t.sockets[1].say({ type: 'rematch' });
    expect(t.room()).toMatchObject({ phase: 'place', winner: null, ready: [false, false] });
    expect(t.room().mine.shots.every((s) => s === 0)).toBe(true);
  });
});

describe('losing and finding the connection again', () => {
  it('shows the other player who is away, and lets them back into the same seat with the token', () => {
    const t = start();
    const [a, b] = t.sockets;
    const { code, token } = a.last('joined');
    a.close();
    expect(b.last('room').present).toEqual([false, true]);

    const again = connect(t.battle);
    again.say({ type: 'resume', code, token });
    expect(again.last('joined')).toMatchObject({ seat: 0, code });
    expect(again.last('room')).toMatchObject({ phase: 'play', present: [true, true] });
    expect(b.last('room').present).toEqual([true, true]);
  });

  it('does not let a stranger resume with a wrong token', () => {
    const t = start();
    const stranger = connect(t.battle);
    stranger.say({ type: 'resume', code: t.room().code, token: 'f'.repeat(32) });
    expect(stranger.last('gone')).toBeTruthy();
    stranger.say({ type: 'resume', code: 'NOPE' });
    expect(stranger.sent.filter((m) => m.type === 'gone')).toHaveLength(2);
  });

  it('takes the new connection and ignores the old one closing late', () => {
    const t = start();
    const [a, b] = t.sockets;
    const { code, token } = a.last('joined');
    const again = connect(t.battle);
    again.say({ type: 'resume', code, token });
    a.close();
    expect(b.last('room').present).toEqual([true, true]);
  });

  it('puts the one who stays back to waiting when the other leaves for good', () => {
    const t = start();
    const [a, b] = t.sockets;
    b.say({ type: 'leave' });
    expect(a.last('room')).toMatchObject({ phase: 'wait', names: ['An', null] });
    const c = connect(t.battle);
    c.say({ type: 'join', code: a.last('room').code, name: 'Chi' });
    expect(c.last('joined')).toMatchObject({ seat: 1 });
    expect(a.last('room')).toMatchObject({ phase: 'place', names: ['An', 'Chi'] });
  });

  it('removes a room when both have left', () => {
    const t = start();
    t.sockets[0].say({ type: 'leave' });
    t.sockets[1].say({ type: 'leave' });
    expect(t.battle.size()).toBe(0);
  });
});

describe('tidying up', () => {
  it('drops rooms nobody has been in for a while, and keeps busy ones', () => {
    let time = 0;
    const battle = createBattle({ now: () => time, idleMs: 1000, waitingMs: 500 });
    const a = connect(battle);
    a.say({ type: 'create' });
    const b = connect(battle);
    b.say({ type: 'create' });
    a.close();
    time = 600;
    battle.sweep();
    expect(battle.size()).toBe(1); // A's room is empty and was only waiting: gone. B is still connected: kept.
    time = 100000;
    battle.sweep();
    expect(battle.size()).toBe(1);
  });
});

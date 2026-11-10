import { randomBytes, randomInt } from 'node:crypto';
import { FLEET, SIZE, blankShots, shoot, validateFleet } from '../src/spacehank/features/games/battleship.js';

// Online sea battle for two. The server keeps the rooms and is the referee: it holds both fleets, checks every shot, and only
// ever tells a player what they are allowed to know (their own boats, and the boats of the other fleet that have sunk).
// Anyone with the link can play, so none of this is behind the owner's password; what protects it is the origin check at the
// upgrade, small messages, a rate limit per connection and a cap on rooms.

const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const CODE_LENGTH = 4;
const NAME_LENGTH = 20;

export const createBattle = ({ now = Date.now, maxRooms = 300, waitingMs = 30 * 60 * 1000, idleMs = 15 * 60 * 1000, rate = { messages: 40, perMs: 5000 } } = {}) => {
  const rooms = new Map();

  const cleanName = (value, fallback) => {
    const name = String(value ?? '')
      .replace(/\p{Cc}/gu, '')
      .trim()
      .slice(0, NAME_LENGTH);
    return name || fallback;
  };

  const newCode = () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const code = Array.from({ length: CODE_LENGTH }, () => CODE_LETTERS[randomInt(CODE_LETTERS.length)]).join('');
      if (!rooms.has(code)) return code;
    }
    return null;
  };

  const sunkShips = (fleet, shots) => fleet.filter((ship) => ship.cells.every((cell) => shots[cell] === 3));

  const reset = (room) => {
    room.phase = room.players[0] && room.players[1] ? 'place' : 'wait';
    room.turn = 0;
    room.winner = null;
    room.last = null;
    room.rematch = [false, false];
    for (const player of room.players) if (player) Object.assign(player, { fleet: null, shots: blankShots() });
  };

  /** What this seat is allowed to see. */
  const viewFor = (room, seat) => {
    const me = room.players[seat];
    const foe = room.players[1 - seat];
    const over = room.phase === 'over';
    return {
      type: 'room',
      code: room.code,
      seat,
      phase: room.phase,
      turn: room.turn,
      winner: room.winner,
      names: room.players.map((p) => p?.name ?? null),
      present: room.players.map((p) => Boolean(p?.socket)),
      ready: room.players.map((p) => Boolean(p?.fleet)),
      rematch: room.rematch,
      mine: { fleet: me.fleet ?? [], shots: me.shots },
      theirs: { shots: foe?.shots ?? blankShots(), sunk: foe?.fleet ? (over ? foe.fleet : sunkShips(foe.fleet, foe.shots)) : [] },
      last: room.last,
    };
  };

  const send = (socket, message) => {
    if (socket && socket.readyState === 1) socket.send(JSON.stringify(message));
  };
  const publish = (room) => {
    room.touched = now();
    room.players.forEach((player, seat) => player && send(player.socket, viewFor(room, seat)));
  };

  const attach = (socket) => {
    let seat = null;
    let room = null;
    let windowStart = now();
    let count = 0;

    const fail = (error) => send(socket, { type: 'error', error });

    const sit = (target, index) => {
      room = target;
      seat = index;
      target.players[index].socket = socket;
    };

    const handlers = {
      create: ({ name }) => {
        if (room) return fail('You are already in a room.');
        if (rooms.size >= maxRooms) return fail('The server is full right now. Try again in a few minutes.');
        const code = newCode();
        if (!code) return fail('Could not make a room. Try again.');
        const target = { code, players: [null, null], phase: 'wait', turn: 0, winner: null, last: null, rematch: [false, false], touched: now() };
        target.players[0] = { name: cleanName(name, 'Người 1'), token: randomBytes(16).toString('hex'), socket: null, fleet: null, shots: blankShots() };
        rooms.set(code, target);
        sit(target, 0);
        send(socket, { type: 'joined', code, seat: 0, token: target.players[0].token });
        publish(target);
      },

      join: ({ code, name }) => {
        if (room) return fail('You are already in a room.');
        const target = rooms.get(String(code ?? '').toUpperCase().trim());
        if (!target) return fail('No room has that code.');
        const free = target.players.findIndex((p) => !p);
        if (free < 0) return fail('That room is full.');
        target.players[free] = { name: cleanName(name, free ? 'Người 2' : 'Người 1'), token: randomBytes(16).toString('hex'), socket: null, fleet: null, shots: blankShots() };
        sit(target, free);
        reset(target);
        send(socket, { type: 'joined', code: target.code, seat: free, token: target.players[free].token });
        publish(target);
      },

      // coming back after the phone slept or the signal dropped: same seat, same game
      resume: ({ code, token }) => {
        if (room) return fail('You are already in a room.');
        const target = rooms.get(String(code ?? '').toUpperCase().trim());
        const index = target?.players.findIndex((p) => p && typeof token === 'string' && p.token === token);
        if (!target || index === undefined || index < 0) return send(socket, { type: 'gone' });
        const previous = target.players[index].socket;
        if (previous && previous !== socket) {
          previous.detached = true; // its close must not count as the player leaving
          previous.close?.();
        }
        sit(target, index);
        send(socket, { type: 'joined', code: target.code, seat: index, token });
        publish(target);
      },

      ready: ({ fleet }) => {
        if (!room || room.phase !== 'place') return fail('Not the time to place boats.');
        const valid = validateFleet(fleet);
        if (!valid) return fail('That fleet is not allowed.');
        if (room.players[seat].fleet) return undefined;
        room.players[seat].fleet = valid;
        if (room.players.every((p) => p?.fleet)) {
          room.phase = 'play';
          room.turn = randomInt(2);
        }
        publish(room);
        return undefined;
      },

      fire: ({ cell }) => {
        if (!room || room.phase !== 'play') return fail('The battle has not started.');
        if (room.turn !== seat) return fail('Not your turn.');
        if (!Number.isInteger(cell) || cell < 0 || cell >= SIZE * SIZE) return fail('That is not a square.');
        const foe = room.players[1 - seat];
        const result = shoot(foe.fleet, foe.shots, cell);
        if (result.outcome === 'repeat') return undefined;
        foe.shots = result.shots;
        room.last = { by: seat, cell, outcome: result.outcome };
        if (result.done) {
          room.phase = 'over';
          room.winner = seat;
        } else if (result.outcome === 'miss') room.turn = 1 - seat;
        publish(room);
        return undefined;
      },

      rematch: () => {
        if (!room || room.phase !== 'over') return;
        room.rematch[seat] = true;
        if (room.rematch.every(Boolean)) reset(room);
        publish(room);
      },

      leave: () => leave(true),
    };

    const leave = (forever) => {
      if (!room) return;
      const target = room;
      const mine = target.players[seat];
      if (mine?.socket === socket) mine.socket = null;
      if (forever) {
        target.players[seat] = null;
        if (!target.players[0] && !target.players[1]) rooms.delete(target.code);
        else {
          // the one who stays keeps their seat and waits for someone new
          reset(target);
          publish(target);
        }
      } else publish(target);
      room = null;
      seat = null;
    };

    socket.on('message', (raw) => {
      const time = now();
      if (time - windowStart > rate.perMs) {
        windowStart = time;
        count = 0;
      }
      count += 1;
      if (count > rate.messages) {
        socket.close?.();
        return;
      }
      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        return fail('Invalid message');
      }
      const handler = message && typeof message === 'object' ? handlers[message.type] : null;
      if (handler) handler(message);
    });

    socket.on('close', () => {
      if (socket.detached) return;
      leave(false);
    });
  };

  /** Drops rooms nobody is in, or nobody has touched for a long while. */
  const sweep = () => {
    const time = now();
    for (const [code, room] of rooms) {
      const empty = room.players.every((p) => !p?.socket);
      const limit = room.phase === 'wait' ? waitingMs : idleMs;
      if (empty && time - room.touched > limit) rooms.delete(code);
    }
  };

  return { attach, sweep, size: () => rooms.size, FLEET };
};

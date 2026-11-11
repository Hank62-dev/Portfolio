import { useEffect, useRef, useState } from 'react';
import { GAP_MS, LINE_MS, linesOf, pickTalk } from './banter';

const TICK_MS = 500;
const MOOD_MS = 45000;

/**
 * Keeps the talks going between crew members in the same room (the lounge, the meeting room): up to two at once, a line
 * every few seconds, a pause between talks. A talk ends early when one of the two leaves the room (a task, or the time to go
 * elsewhere). Stops while the station is paused.
 * Returns what is being said ({ [speakerId]: { text, to, key } }), who is in a talk, and the slot the idle moods follow.
 */
export function useBanter(rooms, nameOf, paused) {
  const [state, setState] = useState({ slots: [null, null], moodSlot: Math.floor(Date.now() / MOOD_MS) });
  const where = useRef(rooms);
  where.current = rooms;
  const names = useRef(nameOf);
  names.current = nameOf;
  const last = useRef(-1);

  useEffect(() => {
    if (paused) return undefined;
    const tick = () =>
      setState((now) => {
        const at = Date.now();
        const roomsNow = where.current;
        let changed = false;
        const slots = now.slots.map((slot, index) => {
          // a talk whose people are no longer both free ends here
          if (slot?.lines && !slot.pair.every((id) => roomsNow[slot.room]?.includes(id))) {
            changed = true;
            return { waitUntil: at + GAP_MS[0] };
          }
          if (slot && at < slot.next) return slot;
          if (slot?.lines) {
            changed = true;
            if (slot.line < slot.lines.length - 1) return { ...slot, line: slot.line + 1, next: at + LINE_MS };
            return { waitUntil: at + GAP_MS[0] + Math.random() * (GAP_MS[1] - GAP_MS[0]) };
          }
          if (slot && at < slot.waitUntil) return slot;
          // a free slot: the first talks in the lounge, the second at the meeting table, or wherever two are free to talk
          const taken = now.slots.flatMap((other, k) => (k !== index && other?.pair ? other.pair : []));
          const order = index === 0 ? ['lounge', 'meeting'] : ['meeting', 'lounge'];
          let talk = null;
          for (const room of order) {
            talk = pickTalk((roomsNow[room] ?? []).filter((id) => !taken.includes(id)), Math.random, last.current, room);
            if (talk) break;
          }
          if (!talk) return slot;
          changed = true;
          last.current = talk.script;
          return { ...talk, lines: linesOf(talk, names.current), line: 0, next: at + LINE_MS, key: `${at}-${index}` };
        });
        const moodSlot = Math.floor(at / MOOD_MS);
        if (!changed && moodSlot === now.moodSlot) return now;
        return { slots, moodSlot };
      });
    // the first talk starts a moment after the station opens, not at once
    const first = setTimeout(tick, 1800);
    const timer = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [paused]);

  const saying = {};
  const talking = new Set();
  for (const slot of state.slots) {
    if (!slot?.lines) continue;
    slot.pair.forEach((id) => talking.add(id));
    const line = slot.lines[slot.line];
    saying[line.by] = { text: line.text, to: line.to, key: `${slot.key}-${slot.line}` };
  }
  return { saying, talking, moodSlot: state.moodSlot };
}

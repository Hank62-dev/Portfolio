import { useEffect, useRef, useState } from 'react';
import { GAP_MS, LINE_MS, linesOf, pickTalk } from './banter';

const TICK_MS = 500;
const MOOD_MS = 45000;

/**
 * Keeps the talks going between free crew members: up to two at once (two only when at least four are free), a line every
 * few seconds, a pause between talks. A talk ends early when one of the two gets a task. Stops while the station is paused.
 * Returns what is being said ({ [speakerId]: { text, to, key } }), who is in a talk, and the slot the idle moods follow.
 */
export function useBanter(freeIds, nameOf, paused) {
  const [state, setState] = useState({ slots: [null, null], moodSlot: Math.floor(Date.now() / MOOD_MS) });
  const free = useRef(freeIds);
  free.current = freeIds;
  const names = useRef(nameOf);
  names.current = nameOf;
  const last = useRef(-1);

  useEffect(() => {
    if (paused) return undefined;
    const tick = () =>
      setState((now) => {
        const at = Date.now();
        const freeNow = free.current;
        let changed = false;
        const slots = now.slots.map((slot, index) => {
          // a talk whose people are no longer both free ends here
          if (slot?.lines && !slot.pair.every((id) => freeNow.includes(id))) {
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
          // a free slot: the second only opens when there are enough free for two talks
          if (index === 1 && freeNow.length < 4) return slot;
          const taken = now.slots.flatMap((other, k) => (k !== index && other?.pair ? other.pair : []));
          const talk = pickTalk(
            freeNow.filter((id) => !taken.includes(id)),
            Math.random,
            last.current,
          );
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

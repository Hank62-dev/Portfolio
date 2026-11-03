import { PenLine } from 'lucide-react';
import { clsx } from '../../../lib/format';
import Pet from '../pet/Pet';
import MoodFace from './MoodFace';
import { bodyOf, excerptOf, moodWord, monthLabel, shortLabel } from './model';
import { Thumb } from './ui';

// The journey: one stepping stone for every day, on a path that winds down the page, today at the top and the first page at
// the bottom. A written day is a round face in the colour of its mood with a card beside it; a day left blank is an empty
// stone you can still step on. Landmarks (the first page, a week, a month…) stand beside the path, and Mơ waits at today.

const W = 360; // the drawing is 360 wide; everything is placed in these units and shown as a percentage
const DAY_H = 126;
const MONTH_H = 46;
const R = 27; // the stone's radius
const xAt = (i) => Math.round(W / 2 + 88 * Math.sin(i * 1.1 + 0.9));

const pc = (value, total) => `${(value / total) * 100}%`;

/** Rows from the top: a month heading whenever the month changes, and a day for each stepping stone. */
export const layout = (days) => {
  const rows = [];
  let y = 0;
  let stone = 0;
  days.forEach((d, i) => {
    if (i === 0 || d.day.slice(0, 7) !== days[i - 1].day.slice(0, 7)) {
      rows.push({ type: 'month', day: d.day, y, h: MONTH_H });
      y += MONTH_H;
    }
    const x = xAt(stone);
    rows.push({ type: 'day', d, i: stone, x, y, h: DAY_H, cy: y + DAY_H / 2 });
    stone += 1;
    y += DAY_H;
  });
  return { rows, height: y };
};

const Landmark = ({ kind, className }) => {
  const common = { fill: 'none', stroke: '#eef3f7', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {kind === 'flag' && (
        <g {...common}>
          <path d="M14 42 V8" />
          <path d="M14 9 q9 -5 14 0 t12 0 v14 q-6 4 -12 0 t-14 0" fill="#e0a458" stroke="#eef3f7" />
        </g>
      )}
      {kind === 'tent' && (
        <g {...common}>
          <path d="M5 40 L24 8 L43 40 Z" fill="#b08a55" />
          <path d="M24 8 V40 M24 40 L17 40 L24 26 L31 40" />
        </g>
      )}
      {kind === 'lighthouse' && (
        <g {...common}>
          <path d="M18 42 L21 14 H27 L30 42 Z" fill="#e8f0f8" />
          <path d="M19 26 H29 M20 34 H28" stroke="#e0a458" />
          <path d="M20 14 L24 7 L28 14" fill="#ffd35e" />
          <path d="M10 10 L16 12 M38 10 L32 12" stroke="#ffd35e" />
        </g>
      )}
      {kind === 'mountain' && (
        <g {...common}>
          <path d="M3 41 L18 14 L26 28 L31 20 L45 41 Z" fill="#7f9fc6" />
          <path d="M18 14 L14 22 L18 20 L22 23 Z" fill="#fff" stroke="none" />
          <path d="M31 20 L28 25 L31 24 L34 26 Z" fill="#fff" stroke="none" />
        </g>
      )}
    </svg>
  );
};

function Stone({ row, mood, onPress, today }) {
  const written = Boolean(row.d.written);
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={written ? `${shortLabel(row.d.day)}, ${moodWord(mood) || 'đã viết'}. Đọc lại trang này` : `${shortLabel(row.d.day)}, chưa viết. Viết trang này`}
      className="absolute grid place-items-center rounded-full transition-transform active:scale-90"
      style={{ left: pc(row.x - R, W), top: pc(row.cy - R, row.height), width: pc(R * 2, W), aspectRatio: '1' }}
      data-day={row.d.day}
      data-written={written}
    >
      {written ? (
        <MoodFace mood={mood || 3} size="100%" ring />
      ) : today ? (
        <span className="grid size-full place-items-center rounded-full bg-[#e0a458] text-[#1b1407] shadow-[0_0_0_6px_rgb(224_164_88/0.28)] animate-pulse">
          <PenLine size={22} aria-hidden="true" />
        </span>
      ) : (
        <MoodFace mood={null} size="100%" />
      )}
    </button>
  );
}

/**
 * `days` is journeyDays(...).days. `marks` is milestonesOf(notes). `pet` is the pet's mood and outfit, so she can stand at today.
 */
export default function Journey({ days, marks, pet, onOpen, onWrite, todayKey }) {
  const { rows, height } = layout(days);
  const dayRows = rows.filter((r) => r.type === 'day').map((r) => ({ ...r, height }));

  // the path: a dotted line through every stone, drawn solid between two written days
  const segments = dayRows.slice(0, -1).map((a, k) => {
    const b = dayRows[k + 1];
    const half = (b.cy - a.cy) / 2;
    return { d: `M ${a.x} ${a.cy} C ${a.x} ${a.cy + half}, ${b.x} ${b.cy - half}, ${b.x} ${b.cy}`, solid: a.d.written && b.d.written };
  });

  return (
    <div className="relative mx-auto w-full max-w-[30rem]" style={{ aspectRatio: `${W} / ${height}` }} data-journey>
      <svg viewBox={`0 0 ${W} ${height}`} className="absolute inset-0 size-full" aria-hidden="true">
        {segments.map((s, i) => (
          <g key={i}>
            <path d={s.d} fill="none" stroke="#bcd3ec" strokeOpacity="0.55" strokeWidth="4" strokeDasharray="1 11" strokeLinecap="round" />
            {s.solid && <path d={s.d} fill="none" stroke="#e0a458" strokeOpacity="0.95" strokeWidth="4.5" strokeLinecap="round" />}
          </g>
        ))}
      </svg>

      {rows.map((row) => {
        if (row.type === 'month') {
          return (
            <span key={`m-${row.day}`} className="absolute left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/25 px-3.5 py-1 font-body text-[0.78rem] leading-none font-medium tracking-[0.08em] whitespace-nowrap text-[#e0eaf5] uppercase backdrop-blur" style={{ top: pc(row.y + 10, height) }} data-month>
              {monthLabel(row.day, todayKey)}
            </span>
          );
        }
        const { d } = row;
        const left = row.x >= W / 2; // the card goes on the roomier side of the path
        const card = left ? { l: 10, w: row.x - R - 20 } : { l: row.x + R + 10, w: W - (row.x + R + 10) - 10 };
        const free = left ? { l: row.x + R + 8 } : { l: row.x - R - 8 - 44 };
        const mark = marks.get(d.day);
        const body = d.entry ? bodyOf(d.entry.text) : '';
        const photo = d.entry?.photos?.[0];
        const press = () => (d.written ? onOpen(d.day) : onWrite(d.day));
        return (
          <div key={d.day}>
            <Stone row={{ ...row, height }} mood={d.mood} onPress={press} today={d.isToday} />

            <div className="absolute flex flex-col justify-center" style={{ left: pc(card.l, W), width: pc(card.w, W), top: pc(row.y + 10, height), height: pc(DAY_H - 20, height) }}>
              {d.written ? (
                <button type="button" onClick={press} className="paper flex max-h-full min-w-0 items-center gap-2 overflow-hidden rounded-2xl p-2.5 text-left transition-transform active:scale-[0.97]" data-card>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-1.5 font-mono text-[0.62rem] tracking-[0.06em] text-[#a3bcd9] uppercase">
                      {d.isToday ? 'Hôm nay' : shortLabel(d.day)}
                      {d.mood && <b className="font-body text-[0.72rem] tracking-normal whitespace-nowrap text-[#e0a458] normal-case">{moodWord(d.mood)}</b>}
                    </span>
                    {mark && <span className="block font-display text-[0.98rem] leading-tight text-[#e0a458]">{mark.title}</span>}
                    <span className="mt-0.5 line-clamp-2 font-body text-[0.82rem] leading-snug text-[#eef4fb]">{excerptOf(body, 80) || 'Một dấu chân không lời.'}</span>
                  </span>
                  {photo && <Thumb id={photo} size={38} className="!rounded-xl" />}
                </button>
              ) : (
                <button type="button" onClick={press} className={clsx('self-start rounded-full px-3 py-1.5 text-left font-body text-[0.85rem] leading-tight transition-transform active:scale-95', d.isToday ? 'bg-[#e0a458] font-semibold text-[#1b1407] shadow-lg' : 'bg-white/10 text-[#eef3f7]/80')}>
                  {d.isToday ? 'Hôm nay · viết gì đó nhé' : `${shortLabel(d.day)} · chưa ghi`}
                </button>
              )}
            </div>

            {d.isToday && (
              <div className="absolute" style={{ left: pc(free.l - 2, W), top: pc(row.cy - 28, height), width: pc(52, W) }} data-pet-here>
                <Pet mood={pet.mood} outfit={pet.outfit} size="100%" waving />
              </div>
            )}
            {!d.isToday && mark && (
              <div className="absolute" style={{ left: pc(free.l, W), top: pc(row.cy - 22, height), width: pc(44, W) }}>
                <Landmark kind={mark.kind} className="w-full drop-shadow" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

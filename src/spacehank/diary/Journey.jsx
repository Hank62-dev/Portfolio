import { tr } from '../lang';
import { PenLine } from 'lucide-react';
import { clsx } from '../../shared/lib/format';
import Pet from '../pet/Pet';
import MoodFace, { MOOD_COLORS } from './MoodFace';
import { bodyOf, excerptOf, moodWord, monthLabel, shortLabel } from './model';
import { Thumb } from './ui';

// The journey: one stepping stone for every day, on a path that winds down the page, today at the top and the first page at
// the bottom. A written day is a round face in the colour of its mood with a card beside it; a day left blank is an empty
// stone you can still step on. Landmarks (the first page, a week, a month…) stand beside the path, and Niú waits at today.

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

/** A small panda head at (cx, cy), `k` times its size: the landmarks are things a panda stands beside, holds or looks out of. */
const MiniPanda = ({ cx, cy, k = 1 }) => (
  <g transform={`translate(${cx} ${cy}) scale(${k})`}>
    <circle cx="-9" cy="-8.4" r="4.8" fill="#26232a" />
    <circle cx="9" cy="-8.4" r="4.8" fill="#26232a" />
    <ellipse cx="0" cy="0" rx="12.5" ry="10.6" fill="#fbf8f2" stroke="#26232a" strokeWidth="1" />
    <ellipse cx="-5.2" cy="-0.6" rx="3.4" ry="4.1" fill="#26232a" transform="rotate(-20 -5.2 -0.6)" />
    <ellipse cx="5.2" cy="-0.6" rx="3.4" ry="4.1" fill="#26232a" transform="rotate(20 5.2 -0.6)" />
    <circle cx="-5.2" cy="-1.2" r="1.15" fill="#fff" />
    <circle cx="5.2" cy="-1.2" r="1.15" fill="#fff" />
    <ellipse cx="0" cy="3.4" rx="2.3" ry="1.6" fill="#26232a" />
    <path d="M-2.6 6 q2.6 2.4 5.2 0" fill="none" stroke="#26232a" strokeWidth="1" strokeLinecap="round" />
  </g>
);

const Landmark = ({ kind, className }) => {
  const common = { fill: 'none', stroke: 'var(--dz-text)', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {kind === 'flag' && (
        <g {...common}>
          <path d="M33 43 V6" />
          <path d="M33 7 q7 -4 11 0 t0 0 v11 q-5 3 -11 0z" fill="#e0a458" stroke="var(--dz-text)" strokeWidth="1.8" />
          <MiniPanda cx={17} cy={34} k={0.95} />
        </g>
      )}
      {kind === 'tent' && (
        <g {...common}>
          <path d="M5 42 L24 9 L43 42 Z" fill="#b08a55" />
          <path d="M24 9 V42 M24 42 L16 42 L24 27 L32 42" fill="#4a3a26" />
          <MiniPanda cx={24} cy={36} k={0.62} />
        </g>
      )}
      {kind === 'lighthouse' && (
        <g {...common}>
          <path d="M16 43 L20 17 H28 L32 43 Z" fill="#e8f0f8" />
          <path d="M18 29 H30 M19 36 H29" stroke="#e0a458" />
          <path d="M19 17 L24 9 L29 17 Z" fill="#ffd35e" />
          <path d="M8 11 L15 13 M40 11 L33 13" stroke="#ffd35e" />
          <MiniPanda cx={24} cy={23.5} k={0.34} />
        </g>
      )}
      {kind === 'mountain' && (
        <g {...common}>
          <path d="M2 43 L20 15 L28 29 L33 21 L46 43 Z" fill="#7f9fc6" />
          <path d="M20 15 L15 24 L20 22 L25 25 Z" fill="#fff" stroke="none" />
          <MiniPanda cx={20} cy={9.5} k={0.5} />
          <path d="M31 21 V9 l7 2.4 -7 2.4" stroke="var(--dz-text)" strokeWidth="1.6" fill="#e0a458" />
        </g>
      )}
    </svg>
  );
};

/** A point on the cubic curve through two stones, and which way it is heading (an angle in degrees). */
const along = (a, b, t) => {
  const half = (b.cy - a.cy) / 2;
  const p = [[a.x, a.cy], [a.x, a.cy + half], [b.x, b.cy - half], [b.x, b.cy]];
  const u = 1 - t;
  const at = (i) => u ** 3 * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t ** 3 * p[3][i];
  const slope = (i) => 3 * u * u * (p[1][i] - p[0][i]) + 6 * u * t * (p[2][i] - p[1][i]) + 3 * t * t * (p[3][i] - p[2][i]);
  return { x: at(0), y: at(1), angle: (Math.atan2(slope(1), slope(0)) * 180) / Math.PI };
};

/** The prints of a panda walking from one stone to the next, left and right in turn; in amber when both days were written. */
const PAWS = [0.27, 0.42, 0.58, 0.73];

function Stone({ row, mood, onPress, today }) {
  const written = Boolean(row.d.written);
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={written ? tr('{0}, {1}. Đọc lại trang này', shortLabel(row.d.day), moodWord(mood) || tr('đã viết')) : tr('{0}, chưa viết. Viết trang này', shortLabel(row.d.day))}
      className="absolute grid place-items-center rounded-full transition-transform active:scale-90"
      style={{ left: pc(row.x - R, W), top: pc(row.cy - R, row.height), width: pc(R * 2, W), aspectRatio: '1' }}
      data-day={row.d.day}
      data-written={written}
    >
      {written ? (
        <MoodFace mood={mood || 3} size="100%" ring />
      ) : today ? (
        <span className="diary-bounce relative grid size-full place-items-center rounded-full shadow-[0_0_0_6px_rgb(224_164_88/0.28)]">
          <MoodFace mood={4} color="#e0a458" size="100%" ring />
          <span className="absolute -right-1 -bottom-1 grid size-[42%] place-items-center rounded-full bg-[#1b1407] text-[#e0a458] shadow-md">
            <PenLine size={12} aria-hidden="true" />
          </span>
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

  // the path: the prints of a panda through every stone, amber between two written days and faint between the others
  const prints = dayRows.slice(0, -1).flatMap((a, k) => {
    const b = dayRows[k + 1];
    const solid = a.d.written && b.d.written;
    return PAWS.map((t, j) => {
      const { x, y, angle } = along(a, b, t);
      const side = (j % 2 ? 1 : -1) * 5.2; // left foot, right foot
      const turn = angle - 90; // the toes point up the path, towards today
      const rad = (turn * Math.PI) / 180;
      return { key: `${k}-${j}`, x: x + Math.cos(rad) * side, y: y + Math.sin(rad) * side, turn, solid, i: k * 4 + j };
    });
  });

  return (
    <div className="relative mx-auto w-full max-w-[30rem]" style={{ aspectRatio: `${W} / ${height}` }} data-journey>
      <svg viewBox={`0 0 ${W} ${height}`} className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <g id="niu-paw">
            <ellipse cx="0" cy="2" rx="3.7" ry="3.1" />
            <circle cx="-4.1" cy="-2.6" r="1.7" />
            <circle cx="-1.45" cy="-4.6" r="1.75" />
            <circle cx="1.45" cy="-4.6" r="1.75" />
            <circle cx="4.1" cy="-2.6" r="1.7" />
          </g>
        </defs>
        {prints.map((p) => (
          <g key={p.key} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.turn.toFixed(1)}) scale(1.35)`}>
            <use href="#niu-paw" className="diary-paw" fill={p.solid ? '#e0a458' : 'var(--dz-trail)'} opacity={p.solid ? 0.95 : 0.4} style={{ animationDelay: `${Math.min(p.i, 24) * 40}ms` }} />
          </g>
        ))}
      </svg>

      {rows.map((row) => {
        if (row.type === 'month') {
          return (
            <span key={`m-${row.day}`} className="absolute left-1/2 -translate-x-1/2 rounded-full border border-[color:var(--dz-text)]/10 bg-[color:var(--dz-chip)] px-3.5 py-1 font-body text-[0.78rem] leading-none font-medium tracking-[0.08em] whitespace-nowrap text-[#e0eaf5] uppercase backdrop-blur" style={{ top: pc(row.y + 10, height) }} data-month>
              {monthLabel(row.day, todayKey)}
            </span>
          );
        }
        const { d } = row;
        const left = row.x >= W / 2; // the card goes on the roomier side of the path
        const card = left ? { l: 10, w: row.x - R - 20 } : { l: row.x + R + 10, w: W - (row.x + R + 10) - 10 };
        const free = left ? { l: row.x + R + 8 } : { l: row.x - R - 8 - 54 };
        const mark = marks.get(d.day);
        const body = d.entry ? bodyOf(d.entry.text) : '';
        const photo = d.entry?.photos?.[0];
        const press = () => (d.written ? onOpen(d.day) : onWrite(d.day));
        return (
          <div key={d.day}>
            <Stone row={{ ...row, height }} mood={d.mood} onPress={press} today={d.isToday} />

            <div className="absolute flex flex-col justify-center" style={{ left: pc(card.l, W), width: pc(card.w, W), top: pc(row.y + 10, height), height: pc(DAY_H - 20, height) }}>
              {d.written ? (
                <button type="button" onClick={press} className="paper flex max-h-full min-w-0 items-center gap-2 overflow-hidden rounded-2xl p-2.5 text-left transition-transform active:scale-[0.97]" style={d.mood ? { borderLeft: `5px solid ${MOOD_COLORS[d.mood - 1]}` } : undefined} data-card>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-1.5 font-mono text-[0.62rem] tracking-[0.06em] text-[color:var(--dz-text-3)] uppercase">
                      {d.isToday ? tr('Hôm nay') : shortLabel(d.day)}
                      {d.mood && <b className="font-body text-[0.72rem] tracking-normal whitespace-nowrap text-[color:var(--dz-amber)] normal-case">{moodWord(d.mood)}</b>}
                    </span>
                    {mark && <span className="block font-display text-[0.98rem] leading-tight text-[color:var(--dz-amber)]">{mark.title}</span>}
                    <span className="mt-0.5 line-clamp-2 font-body text-[0.82rem] leading-snug text-[color:var(--dz-text)]">{excerptOf(body, 80) || tr('Một dấu chân không lời.')}</span>
                  </span>
                  {photo && <Thumb id={photo} size={38} className="!rounded-xl" />}
                </button>
              ) : (
                <button type="button" onClick={press} className={clsx('self-start rounded-full px-3 py-1.5 text-left font-body text-[0.85rem] leading-tight transition-transform active:scale-95', d.isToday ? 'bg-[#e0a458] font-semibold text-[#1b1407] shadow-lg' : 'bg-[color:var(--dz-text)]/10 text-[color:var(--dz-text)]/80')}>
                  {d.isToday ? tr('Hôm nay · viết gì đó nhé') : tr('{0} · chưa ghi', shortLabel(d.day))}
                </button>
              )}
            </div>

            {d.isToday && (
              <div className="absolute" style={{ left: pc(free.l - 2, W), top: pc(row.cy - 28, height), width: pc(52, W) }} data-pet-here>
                <Pet mood={pet.mood} outfit={pet.outfit} size="100%" />
              </div>
            )}
            {!d.isToday && mark && (
              <div className="absolute" style={{ left: pc(free.l, W), top: pc(row.cy - 22, height), width: pc(54, W) }}>
                <Landmark kind={mark.kind} className="w-full drop-shadow" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

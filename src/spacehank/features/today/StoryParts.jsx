import { Check, Flame, Footprints, Grid3x3, BookHeart, Images, ListChecks, Sparkles, StickyNote, Sprout, Sun, Wallet } from 'lucide-react';
import { usePhoto } from '../diary/photos';
import { useCountUp } from '../../core/motion/hooks';
import { tr } from '../../core/i18n/lang';
import { formatVnd } from '../wallet/model';
import Plant from '../habits/Plant';

// What the cards of the week's story draw: the big number, the chart of the seven days, and the things themselves.

const NUMBER = new Intl.NumberFormat('vi-VN');

/** The big number of a card, counting up as the card arrives. */
export function Figure({ slide }) {
  const counted = useCountUp(slide.value, { duration: 1100 });
  const shown = slide.format === 'vnd' ? formatVnd(counted) : NUMBER.format(Math.round(counted));
  return (
    <p className="story-figure font-display text-[clamp(3.4rem,17vw,7rem)] leading-none tracking-tight tabular-nums" aria-label={slide.format === 'vnd' ? formatVnd(slide.value) : String(slide.value)}>
      <span aria-hidden="true">{shown}</span>
      {slide.of ? <span aria-hidden="true" className="ml-2 text-[0.38em] text-bone-faint">/ {slide.of}</span> : null}
    </p>
  );
}

// ---- what a card draws of the seven days (all of it decorates numbers that are also written on the card)

const W = 320;
const xAt = (i, pad = 22) => pad + (i * (W - pad * 2)) / 6;

/** A smooth line through points: each step leaves and arrives flat, so the trail winds like a path. */
const smooth = (xs, ys) => xs.reduce((d, x, i) => (i === 0 ? `M${x} ${ys[0]}` : `${d} C${(xs[i - 1] + x) / 2} ${ys[i - 1]} ${(xs[i - 1] + x) / 2} ${ys[i]} ${x} ${ys[i]}`), '');

/** The week as a trail: a line that draws itself through seven stepping stones, higher on the busier days, the busiest one lit. */
function Trail({ days }) {
  const H = 132;
  const xs = days.map((_, i) => xAt(i));
  const ys = days.map((d) => 88 - d.v * 58);
  const line = smooth(xs, ys);
  const top = days.findIndex((d) => d.v === 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="trail-stroke" x1="0" x2="1">
          <stop offset="0" style={{ stopColor: 'var(--hl)' }} />
          <stop offset="1" style={{ stopColor: 'var(--hl2)' }} />
        </linearGradient>
        <linearGradient id="trail-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--hl)', stopOpacity: 0.3 }} />
          <stop offset="1" style={{ stopColor: 'var(--hl)', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={`${line} L${xs[6]} ${H - 26} L${xs[0]} ${H - 26} Z`} fill="url(#trail-fill)" className="trail-fill" />
      <path d={line} pathLength="1" fill="none" stroke="url(#trail-stroke)" strokeWidth="3" strokeLinecap="round" className="trail-line" />
      {days.map((d, i) => (
        <g key={d.label + i} style={{ '--i': i }}>
          {i === top && d.v > 0 && <circle cx={xs[i]} cy={ys[i]} r="11" fill="none" style={{ stroke: 'var(--hl)' }} strokeWidth="1.5" className="trail-node trail-halo" />}
          <circle cx={xs[i]} cy={ys[i]} r={d.v > 0 ? 5 : 3.2} fill={d.v > 0 ? 'var(--node)' : 'rgb(var(--sw) / 0.35)'} className="trail-node" />
          <text x={xs[i]} y={H - 8} textAnchor="middle" className="fill-bone-faint font-mono" fontSize="9.5">
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Seven bars rising from the floor, the highest one bright and named. `show` writes the value of a day. */
function Bars({ days, peak, show }) {
  return (
    <div className="flex w-full max-w-md items-end gap-2.5" aria-hidden="true">
      {days.map((d, i) => (
        <div key={d.label + i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="h-3 max-w-full truncate font-mono text-[0.58rem] text-bone-dim">{d.label === peak && d.raw > 0 ? show(d.raw) : ''}</span>
          <span className="flex h-24 w-full items-end">
            <i className="story-bar" data-peak={d.label === peak && d.raw > 0 ? '' : undefined} style={{ '--v': Math.max(d.v, 0.05), '--i': i }} />
          </span>
          <span className="font-mono text-[0.62rem] text-bone-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Seven rings, each filled as far as that day went (a tick when it went all the way). */
function Rings({ days }) {
  return (
    <div className="flex w-full max-w-md justify-between gap-1" aria-hidden="true">
      {days.map((d, i) => (
        <div key={d.label + i} className="flex flex-col items-center gap-1.5">
          <span className="story-dot" data-full={d.v >= 1 ? '' : undefined} style={{ '--p': d.v, '--i': i }}>
            {d.v >= 1 && <Check size={15} strokeWidth={3} />}
          </span>
          <span className="font-mono text-[0.62rem] text-bone-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** The mood of the days as a wave: a dot for each day that was written, joined to the next written day. */
function Wave({ days }) {
  const H = 118;
  const pts = days.map((d, i) => ({ x: xAt(i), y: 86 - d.v * 62, on: d.on }));
  const segments = pts.slice(1).flatMap((p, i) => (pts[i].on && p.on ? [`M${pts[i].x} ${pts[i].y} C${(pts[i].x + p.x) / 2} ${pts[i].y} ${(pts[i].x + p.x) / 2} ${p.y} ${p.x} ${p.y}`] : []));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md overflow-visible" aria-hidden="true">
      {segments.map((d, i) => (
        <path key={d} d={d} pathLength="1" fill="none" strokeWidth="2.6" strokeLinecap="round" className="trail-line" style={{ stroke: 'var(--hl)', '--i': i }} />
      ))}
      {days.map((d, i) => (
        <g key={d.label + i} style={{ '--i': i }}>
          <circle cx={pts[i].x} cy={pts[i].y} r={pts[i].on ? 6 : 3.2} fill={pts[i].on ? 'var(--node)' : 'none'} style={{ stroke: pts[i].on ? 'var(--hl)' : 'rgb(var(--sw) / 0.35)' }} strokeWidth={pts[i].on ? 3 : 1.4} className="trail-node" />
          <text x={pts[i].x} y={H - 6} textAnchor="middle" className="fill-bone-faint font-mono" fontSize="9.5">
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** How much of the open and done tasks is done, as a ring that draws itself. */
export function Ring({ done, total }) {
  const share = total > 0 ? done / total : 0;
  return (
    <span className="relative grid size-24 shrink-0 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(var(--sw) / 0.12)" strokeWidth="7" />
        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="7" strokeLinecap="round" pathLength="1" strokeDasharray="1" style={{ stroke: 'var(--hl)', '--share': share }} className="story-ring" />
      </svg>
      <b className="font-display text-xl text-bone tabular-nums">{Math.round(share * 100)}%</b>
    </span>
  );
}

export function Chart({ slide }) {
  const chart = slide.chart;
  if (!chart) return null;
  const show = slide.format === 'vnd' ? formatVnd : (n) => NUMBER.format(n);
  return (
    <div className="flex w-full justify-center sm:justify-start">
      {chart.kind === 'path' && <Trail days={chart.days} />}
      {chart.kind === 'bars' && <Bars days={chart.days} peak={chart.peak} show={show} />}
      {chart.kind === 'dots' && <Rings days={chart.days} />}
      {chart.kind === 'wave' && <Wave days={chart.days} />}
      {chart.kind === 'grid' && <Glance chart={chart} />}
    </div>
  );
}

// ---- the things themselves: each card shows what the week held, one by one (read on the device, never sent)

const ICONS = { tasks: ListChecks, habits: Sprout, money: Wallet, mind: BookHeart, diary: BookHeart, photos: Images, notes: StickyNote, best: Sun, glance: Grid3x3, intro: Footprints };
const FACES = ['😣', '😕', '😐', '🙂', '😄'];

/** A glass tile with the card's icon, floating and glowing in the card's colour. */
export function Emblem({ id }) {
  const Icon = ICONS[id] ?? Sparkles;
  return (
    <span className="emblem" aria-hidden="true">
      <Icon size={26} strokeWidth={1.7} />
    </span>
  );
}

/** The four small counts under the opening: an icon and a number each. */
export function Chips({ chips }) {
  if (!chips?.length) return null;
  return (
    <div className="flex flex-wrap gap-2" aria-hidden="true">
      {chips.map((c, i) => {
        const Icon = ICONS[c.icon];
        return (
          <span key={c.icon} className="glass-pill" style={{ '--i': i }}>
            <Icon size={15} strokeWidth={2} />
            <b className="font-display text-lead tabular-nums">{NUMBER.format(c.n)}</b>
          </span>
        );
      })}
    </div>
  );
}

/** The seven days as a grid: a row for each thing, a cell for each day, brighter the fuller the day was. */
function Glance({ chart }) {
  return (
    <div className="w-full max-w-md" aria-hidden="true">
      {chart.rows.map((row, r) => (
        <div key={row.id} className="mb-2 grid grid-cols-[3.9rem_repeat(7,minmax(0,1fr))] items-center gap-1.5">
          <span className="truncate font-mono text-[0.58rem] tracking-[0.12em] text-bone-faint">{row.label}</span>
          {row.cells.map((c, i) => (
            <i key={i} className="glance-cell" data-lit={c.v >= 0.6 ? '' : undefined} style={{ '--v': c.v, '--d': `${(r * 7 + i) * 38}ms` }} />
          ))}
        </div>
      ))}
      <div className="grid grid-cols-[3.9rem_repeat(7,minmax(0,1fr))] gap-1.5">
        <span />
        {chart.labels.map((l, i) => (
          <span key={l + i} className="text-center font-mono text-[0.6rem] text-bone-faint">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Tasks finished, one ticket for each, newest on top, each with a tick that is stamped on. */
function TaskList({ list }) {
  return (
    <ul className="flex w-full max-w-md flex-col gap-2" aria-hidden="true">
      {list.items.map((t, i) => (
        <li key={t.id} className="ticket" style={{ '--i': i }}>
          <span className="ticket-tick">
            <Check size={14} strokeWidth={3.2} />
          </span>
          <span className="min-w-0 flex-1 truncate text-body text-bone">{t.title}</span>
          <span className="font-mono text-[0.62rem] text-bone-faint uppercase">{t.label}</span>
        </li>
      ))}
      {list.more > 0 && (
        <li className="pl-1 font-mono text-[0.7rem] text-bone-faint" style={{ '--i': list.items.length }}>
          {tr('+{0} more', list.more)}
        </li>
      )}
    </ul>
  );
}

/** Each habit as the plant it has grown into, with its seven days as seven dots. */
function HabitList({ list }) {
  return (
    <ul className="flex w-full max-w-md flex-col gap-2" aria-hidden="true">
      {list.items.map((h, i) => (
        <li key={h.id} className="ticket habit-row" style={{ '--i': i, '--h': h.hue }}>
          <Plant stage={h.stage} wilting={h.wilting} hue={h.hue} className="size-12 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body text-bone">{h.name}</span>
            <span className="mt-1.5 flex gap-1.5">
              {h.pips.map((on, d) => (
                <i key={d} className="pip" data-on={on ? '' : undefined} style={{ '--d': `${300 + i * 90 + d * 45}ms` }} />
              ))}
            </span>
          </span>
          <b className="font-display text-lead text-bone tabular-nums">
            {h.daysDone}
            <small className="text-[0.7em] text-bone-faint">/7</small>
          </b>
          {h.streak >= 2 && (
            <span className="absolute -top-1.5 right-3 inline-flex items-center gap-0.5 rounded-full bg-[hsl(var(--hue)_80%_58%)] px-1.5 py-0.5 font-mono text-[0.58rem] font-semibold text-black">
              <Flame size={10} aria-hidden="true" />
              {h.streak}
            </span>
          )}
        </li>
      ))}
      {list.more > 0 && (
        <li className="pl-1 font-mono text-[0.7rem] text-bone-faint" style={{ '--i': list.items.length }}>
          {tr('+{0} more', list.more)}
        </li>
      )}
    </ul>
  );
}

/** Where the money went: a ring cut by category, the categories beside it, and the biggest single spends. */
function MoneyList({ list }) {
  let start = 0;
  return (
    <div className="flex w-full max-w-md flex-col gap-4" aria-hidden="true">
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90">
          <circle cx="50" cy="50" r="38" fill="none" stroke="rgb(var(--sw) / 0.08)" strokeWidth="13" />
          {list.items.map((c, i) => {
            const seg = (
              <circle key={c.label} cx="50" cy="50" r="38" fill="none" pathLength="100" strokeWidth="13" strokeDasharray={`${Math.max(c.pct - 1.2, 0.6)} ${100 - Math.max(c.pct - 1.2, 0.6)}`} strokeDashoffset={-start} className="donut-seg" style={{ stroke: `hsl(${c.hue} 85% var(--cat-l))`, '--i': i }} />
            );
            start += c.pct;
            return seg;
          })}
        </svg>
        <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
          {list.items.map((c, i) => (
            <li key={c.label} className="flex items-center gap-2 text-fine" style={{ '--i': i }}>
              <i className="size-2.5 shrink-0 rounded-full" style={{ background: `hsl(${c.hue} 85% var(--cat-l))` }} />
              <span className="min-w-0 flex-1 truncate text-bone">{c.label}</span>
              <span className="font-mono text-[0.68rem] text-bone-dim tabular-nums">{c.pct}%</span>
            </li>
          ))}
        </ul>
      </div>
      {list.spends.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-[0.6rem] tracking-[0.16em] text-bone-faint uppercase">{tr('Biggest spends')}</p>
          <div className="flex flex-wrap gap-2">
            {list.spends.map((s, i) => (
              <span key={s.id} className="glass-pill max-w-full" style={{ '--i': i + 3, borderColor: `hsl(${s.hue} 80% 55% / 0.45)` }}>
                <span className="truncate">{s.title}</span>
                <b className="font-mono text-[0.72rem] tabular-nums">{formatVnd(s.amount)}</b>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** One diary page of the week, quoted (the happiest one), with its face and its picture. */
function Quote({ list }) {
  const page = list.page;
  const photo = usePhoto(page?.photo);
  if (!page) return null;
  return (
    <figure className="quote-card w-full max-w-md" aria-hidden="true">
      {photo && <img src={photo} alt="" className="mb-3 h-36 w-full rounded-2xl object-cover" />}
      <blockquote className="font-display text-[1.15rem] leading-snug text-bone">“{page.excerpt}”</blockquote>
      <figcaption className="mt-2 flex items-center gap-2 font-mono text-[0.66rem] text-bone-dim uppercase">
        <span className="text-lead leading-none">{page.mood ? FACES[page.mood - 1] : '·'}</span>
        {page.label}
      </figcaption>
    </figure>
  );
}

/** A CD in its jewel case: the picture is the disc, with a clear hub, a hole in the middle and a sheen across it. */
function DiscCase({ id, label, i }) {
  const url = usePhoto(id);
  return (
    <figure className="disc-case" style={{ '--i': i, '--r': `${[-3, 2.5, -2, 3.5, -2.5, 2][i % 6]}deg` }}>
      <span className="disc-hinge" />
      <span className="disc">
        <span className="disc-pic">{url && <img src={url} alt="" className="size-full object-cover" />}</span>
        <span className="disc-sheen" />
        <span className="disc-hub" />
        <span className="disc-hole" />
      </span>
      <figcaption className="disc-cap">{label}</figcaption>
    </figure>
  );
}

/** The pictures of the diary pages as discs in their cases, laid out in a grid like a rack. */
function Photos({ list }) {
  const n = list.items.length;
  const cols = n === 1 ? 'grid-cols-1 max-w-[15rem]' : n === 2 || n === 4 ? 'grid-cols-2 max-w-xs' : 'grid-cols-3 max-w-sm';
  return (
    <div className={`grid w-full ${cols} gap-3`} aria-hidden="true">
      {list.items.map((p, i) => (
        <DiscCase key={p.id} id={p.id} label={p.label} i={i} />
      ))}
    </div>
  );
}

/** The notes written this week as a little pile of paper, the newest on top. */
function NoteStack({ list }) {
  return (
    <ul className="flex w-full max-w-md flex-col gap-2" aria-hidden="true">
      {list.items.map((n, i) => (
        <li key={n.id} className="week-note" style={{ '--i': i, '--r': `${[-1.6, 1.2, -0.8, 1.6][i % 4]}deg`, '--n': n.hue }}>
          <span className="min-w-0 flex-1 truncate font-display text-lead text-black/80">{n.title}</span>
          <span className="font-mono text-[0.6rem] text-black/45 uppercase">{n.label}</span>
        </li>
      ))}
      {list.more > 0 && (
        <li className="pl-1 font-mono text-[0.7rem] text-bone-faint" style={{ '--i': list.items.length }}>
          {tr('+{0} more', list.more)}
        </li>
      )}
    </ul>
  );
}

/** The busiest day: a sun with slow rays, and a pill for each thing that was done on it. */
function BestDay({ list }) {
  const d = list.day;
  const pills = [
    ...d.tasks.slice(0, 3).map((t) => ({ k: `t-${t}`, Icon: Check, text: t })),
    ...d.habits.slice(0, 3).map((h) => ({ k: `h-${h}`, Icon: Sprout, text: h })),
    ...(d.diary ? [{ k: 'diary', Icon: BookHeart, text: tr('Diary page') }] : []),
    ...(d.notes ? [{ k: 'notes', Icon: StickyNote, text: `${d.notes} ${d.notes === 1 ? tr('new note') : tr('new notes')}` }] : []),
    ...(d.spent > 0 ? [{ k: 'spent', Icon: Wallet, text: formatVnd(d.spent) }] : []),
  ];
  return (
    <div className="flex w-full max-w-md flex-col gap-4" aria-hidden="true">
      <div className="sun-burst">
        <span className="sun-rays" />
        <span className="sun-core" />
      </div>
      <div className="flex flex-wrap gap-2">
        {pills.map((p, i) => (
          <span key={p.k} className="glass-pill max-w-full" style={{ '--i': i + 2 }}>
            <p.Icon size={14} strokeWidth={2.4} className="shrink-0" />
            <span className="truncate">{p.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** What a card shows of the things themselves (instead of, or beside, the chart of the seven days). */
export function Items({ list }) {
  if (!list) return null;
  return (
    <div className="flex w-full justify-center sm:justify-start">
      {list.kind === 'tasks' && <TaskList list={list} />}
      {list.kind === 'habits' && <HabitList list={list} />}
      {list.kind === 'money' && <MoneyList list={list} />}
      {list.kind === 'quote' && <Quote list={list} />}
      {list.kind === 'photos' && <Photos list={list} />}
      {list.kind === 'notes' && <NoteStack list={list} />}
      {list.kind === 'best' && <BestDay list={list} />}
    </div>
  );
}

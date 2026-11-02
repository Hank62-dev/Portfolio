import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Crosshair, Hand, Minus, Plus, Search, Sparkles, X } from 'lucide-react';
import { Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { PageHead } from '../components/Page';
import { buildGraph, radiusOf, sampleNotes, stepLayout } from '../notes/graph';
import { createNote, deleteNote, loadNotes, notesStore } from '../notes/library';
import { excerpt } from '../notes/notes';
import { useStore } from '../store';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The sky of your notes: every note is a star, every shared tag or [[link]] a thread between two. The stars settle
 * by themselves into clusters; drag to look around, scroll to zoom, click a star to read what it is.
 */
export default function ConstellationView({ onOpenNote }) {
  const { loaded, notes } = useStore(notesStore);
  const canvas = useRef(null);
  const frame = useRef({ nodes: [], edges: [], energy: 1, view: { x: 0, y: 0, k: 1 }, hover: null, selected: null, drag: null, pointers: new Map(), pinch: null, size: { w: 600, h: 400 }, dirty: true });
  const [selected, setSelected] = useState(null);
  const [tag, setTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    void loadNotes();
  }, []);

  const graph = useMemo(() => buildGraph(notes), [notes]);

  // keep the positions of stars that were already there, so adding a note does not scramble the sky
  useEffect(() => {
    const before = new Map(frame.current.nodes.map((n) => [n.id, n]));
    for (const n of graph.nodes) {
      const old = before.get(n.id);
      if (old) Object.assign(n, { x: old.x, y: old.y, vx: old.vx, vy: old.vy });
    }
    frame.current.nodes = graph.nodes;
    frame.current.edges = graph.edges;
    frame.current.energy = 1;
    frame.current.dirty = true;
    if (reduced()) for (let i = 0; i < 400; i += 1) stepLayout(graph.nodes, graph.edges);
  }, [graph]);

  useEffect(() => {
    frame.current.selected = selected;
    frame.current.tag = tag;
    frame.current.dirty = true;
  }, [selected, tag]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    const ctx = el.getContext('2d');
    const f = frame.current;
    const dust = Array.from({ length: 90 }, (_, i) => ({ x: ((i * 9301 + 49297) % 233280) / 233280, y: ((i * 7919 + 12345) % 233280) / 233280, r: 0.4 + ((i * 31) % 10) / 14 }));
    let raf = 0;

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      el.width = el.clientWidth * ratio;
      el.height = el.clientHeight * ratio;
      f.size = { w: el.clientWidth, h: el.clientHeight, ratio };
      f.dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    const toWorld = (sx, sy) => ({ x: (sx - f.size.w / 2 - f.view.x) / f.view.k, y: (sy - f.size.h / 2 - f.view.y) / f.view.k });
    const pick = (sx, sy) => {
      const p = toWorld(sx, sy);
      let best = null;
      let bestD = Infinity;
      for (const n of f.nodes) {
        const d = Math.hypot(n.x - p.x, n.y - p.y);
        if (d < radiusOf(n) + 6 / f.view.k && d < bestD) {
          best = n;
          bestD = d;
        }
      }
      return best;
    };

    const neighbours = () => {
      const set = new Set();
      if (f.selected) {
        set.add(f.selected);
        for (const e of f.edges) {
          if (e.a === f.selected) set.add(e.b);
          if (e.b === f.selected) set.add(e.a);
        }
      }
      return set;
    };

    const draw = (time) => {
      raf = requestAnimationFrame(draw);
      if (f.energy > 0.02) {
        f.energy = stepLayout(f.nodes, f.edges);
        f.dirty = true;
      }
      const twinkle = !reduced();
      if (!f.dirty && !twinkle) return;
      f.dirty = false;
      const { w, h, ratio = 1 } = f.size;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7);
      bg.addColorStop(0, '#15131f');
      bg.addColorStop(1, '#07070a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      for (const d of dust) {
        ctx.fillStyle = `rgb(236 230 218 / ${0.18 + 0.12 * Math.sin(time / 1500 + d.x * 40)})`;
        ctx.beginPath();
        ctx.arc(((d.x * w + f.view.x * 0.15) % w + w) % w, ((d.y * h + f.view.y * 0.15) % h + h) % h, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(w / 2 + f.view.x, h / 2 + f.view.y);
      ctx.scale(f.view.k, f.view.k);
      const near = neighbours();
      const dim = (n) => (f.selected && !near.has(n.id)) || (f.tag && !n.tags.includes(f.tag));
      const byId = new Map(f.nodes.map((n) => [n.id, n]));

      for (const e of f.edges) {
        const a = byId.get(e.a);
        const b = byId.get(e.b);
        if (!a || !b) continue;
        const lit = f.selected && (e.a === f.selected || e.b === f.selected);
        ctx.strokeStyle = lit ? `hsl(${a.hue} 90% 72% / 0.85)` : `rgb(236 230 218 / ${dim(a) || dim(b) ? 0.05 : 0.12 + e.weight * 0.05})`;
        ctx.lineWidth = (lit ? 1.6 : 0.8 + e.weight * 0.3) / Math.sqrt(f.view.k);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      for (const n of f.nodes) {
        const r = radiusOf(n) * (n.id === f.hover ? 1.25 : 1);
        const faded = dim(n);
        const pulse = twinkle ? 0.85 + 0.15 * Math.sin(time / 700 + n.x) : 1;
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4.2);
        glow.addColorStop(0, `hsl(${n.hue} 95% 70% / ${(faded ? 0.12 : 0.55) * pulse})`);
        glow.addColorStop(1, `hsl(${n.hue} 95% 70% / 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = faded ? `hsl(${n.hue} 30% 45%)` : `hsl(${n.hue} 90% ${n.id === f.selected ? 88 : 76}%)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
        if (n.id === f.selected) {
          ctx.strokeStyle = '#ece6da';
          ctx.lineWidth = 1.5 / f.view.k;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (!faded && (n.id === f.hover || n.id === f.selected || (f.view.k > 0.7 && (n.degree > 1 || n.words > 25)))) {
          ctx.font = `${12 / Math.sqrt(f.view.k)}px "Geist", system-ui, sans-serif`;
          ctx.fillStyle = 'rgb(236 230 218 / 0.92)';
          ctx.textAlign = 'center';
          ctx.fillText(n.title.length > 26 ? `${n.title.slice(0, 25)}…` : n.title, n.x, n.y + r + 14 / Math.sqrt(f.view.k));
        }
      }
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);

    const rect = () => el.getBoundingClientRect();
    const zoomAt = (k, sx, sy) => {
      const before = toWorld(sx, sy);
      f.view.k = Math.max(0.25, Math.min(3, k));
      f.view.x = sx - f.size.w / 2 - before.x * f.view.k;
      f.view.y = sy - f.size.h / 2 - before.y * f.view.k;
      f.dirty = true;
    };
    const spread = () => {
      const [a, b] = [...f.pointers.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };
    const down = (e) => {
      setTouched(true);
      f.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (f.pointers.size === 2) {
        // a second finger: stop dragging and start pinching
        f.pinch = { d: spread().d, k: f.view.k };
        if (f.drag) f.drag.moved = true;
      } else {
        f.drag = { x: e.clientX, y: e.clientY, moved: false };
      }
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      const r = rect();
      if (f.pointers.has(e.pointerId)) f.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (f.pinch && f.pointers.size === 2) {
        const now = spread();
        zoomAt(f.pinch.k * (now.d / f.pinch.d), now.x - r.left, now.y - r.top);
        return;
      }
      if (f.drag) {
        const dx = e.clientX - f.drag.x;
        const dy = e.clientY - f.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) f.drag.moved = true;
        f.view.x += dx;
        f.view.y += dy;
        f.drag.x = e.clientX;
        f.drag.y = e.clientY;
        f.dirty = true;
      } else {
        const hit = pick(e.clientX - r.left, e.clientY - r.top);
        const id = hit?.id ?? null;
        if (id !== f.hover) {
          f.hover = id;
          el.style.cursor = id ? 'pointer' : 'grab';
          f.dirty = true;
        }
      }
    };
    const up = (e) => {
      const r = rect();
      f.pointers.delete(e.pointerId);
      if (f.pointers.size < 2) f.pinch = null;
      if (f.drag && !f.drag.moved && f.pointers.size === 0) {
        const hit = pick(e.clientX - r.left, e.clientY - r.top);
        setSelected(hit ? (hit.id === f.selected ? null : hit.id) : null);
      }
      if (f.pointers.size === 0) f.drag = null;
      else if (f.pointers.size === 1) {
        // one finger left after a pinch: carry on dragging from where it is
        const [rest] = f.pointers.values();
        f.drag = { x: rest.x, y: rest.y, moved: true };
      }
    };
    const wheel = (e) => {
      e.preventDefault();
      const r = rect();
      const before = toWorld(e.clientX - r.left, e.clientY - r.top);
      f.view.k = Math.max(0.25, Math.min(3, f.view.k * Math.exp(-e.deltaY * 0.0015)));
      f.view.x = e.clientX - r.left - f.size.w / 2 - before.x * f.view.k;
      f.view.y = e.clientY - r.top - f.size.h / 2 - before.y * f.view.k;
      f.dirty = true;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, []);

  const zoom = (by) => {
    const f = frame.current;
    f.view.k = Math.max(0.25, Math.min(3, f.view.k * by));
    f.dirty = true;
  };
  const fit = () => {
    const f = frame.current;
    f.view = { x: 0, y: 0, k: 1 };
    f.dirty = true;
  };

  const tags = useMemo(() => [...new Set(graph.nodes.flatMap((n) => n.tags))].sort(), [graph]);
  const picked = notes.find((n) => n.id === selected);
  const pickedNode = graph.nodes.find((n) => n.id === selected);
  const linked = useMemo(() => {
    if (!selected) return [];
    const ids = graph.edges.filter((e) => e.a === selected || e.b === selected).map((e) => (e.a === selected ? e.b : e.a));
    return graph.nodes.filter((n) => ids.includes(n.id));
  }, [graph, selected]);
  const stars = useMemo(() => [...graph.nodes].sort((a, b) => b.degree - a.degree || b.words - a.words), [graph]);
  const shownStars = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? stars.filter((n) => n.title.toLowerCase().includes(q)) : stars;
  }, [stars, query]);

  const addSamples = async () => {
    setBusy(true);
    for (const n of sampleNotes()) await createNote(n.text, { sample: true });
    setBusy(false);
  };
  const removeSamples = async () => {
    for (const n of notes.filter((x) => x.sample)) await deleteNote(n.id);
    setSelected(null);
  };
  const sparse = loaded && notes.length < 3;

  const card = picked && (
    <section className="rounded-3xl border border-line bg-ink-1 p-5 shadow-[0_30px_70px_-40px_rgb(0_0_0/0.95)]" data-selected>
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-2 font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">
          <i className="size-2 rounded-full" style={{ background: `hsl(${pickedNode?.hue ?? 30} 90% 70%)` }} aria-hidden="true" /> Selected star
        </span>
        <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="-mt-1 -mr-1 grid size-8 place-items-center rounded-full text-bone-faint hover:bg-white/5 hover:text-bone">
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <h2 className="mt-2 font-display text-h3 leading-tight text-bone">{pickedNode?.title}</h2>
      <p className="mt-2 line-clamp-3 text-fine leading-relaxed text-bone-dim">{excerpt(picked.text.replace(/^.*\n/, '') || picked.text, '', 200)}</p>
      {linked.length > 0 && (
        <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5 lg:flex-wrap">
          {linked.slice(0, 8).map((n) => (
            <button key={n.id} type="button" onClick={() => setSelected(n.id)} className="shrink-0 rounded-full border border-line px-2.5 py-1 font-mono text-[0.68rem] text-bone-dim hover:border-signal hover:text-bone">
              {n.title}
            </button>
          ))}
        </div>
      )}
      <Button size="sm" className="mt-4 w-full sm:w-auto" onClick={() => onOpenNote(picked.id)}>
        Open the note <ArrowUpRight size={14} aria-hidden="true" />
      </Button>
    </section>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHead eyebrow="Knowledge" title="Your" accent="Constellation." description="Your notes as a sky. Notes that share a tag or a [[link]] are drawn together, so the shape of what you know shows itself.">
        {notes.some((n) => n.sample) && (
          <Button variant="ghost" size="sm" onClick={removeSamples}>
            Remove sample notes
          </Button>
        )}
      </PageHead>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-[#07070a]">
          <canvas ref={canvas} className="block h-[min(66dvh,600px)] min-h-[340px] w-full cursor-grab touch-none max-sm:h-[62dvh]" aria-label="A map of your notes. Use the list beside it for a keyboard-friendly version." data-sky />

          <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 font-mono text-[0.68rem] text-bone-dim backdrop-blur">
              <b className="font-medium text-bone">{graph.nodes.length}</b> stars <i className="size-1 rounded-full bg-bone-faint" aria-hidden="true" /> <b className="font-medium text-bone">{graph.edges.length}</b> threads
            </span>
            {!touched && !selected && !sparse && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 font-mono text-[0.68rem] text-bone-faint backdrop-blur" data-hint>
                <Hand size={12} aria-hidden="true" /> Drag, pinch or scroll, tap a star
              </span>
            )}
          </div>

          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {[
              ['Zoom in', Plus, () => zoom(1.25)],
              ['Zoom out', Minus, () => zoom(0.8)],
              ['Fit to view', Crosshair, fit],
            ].map(([label, Icon, run]) => (
              <button key={label} type="button" aria-label={label} onClick={run} className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/45 text-bone-dim backdrop-blur transition-colors hover:text-bone active:scale-95 sm:size-9">
                <Icon size={15} aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3">
            {picked && <div className="lg:hidden">{card}</div>}
            {tags.length > 0 && !picked && (
              <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3" role="group" aria-label="Filter by tag">
                {tags.slice(0, 14).map((t) => (
                  <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)} className={clsx('shrink-0 rounded-full border px-3 py-1 font-mono text-[0.7rem] backdrop-blur transition-colors', tag === t ? 'border-transparent bg-bone text-ink-0' : 'border-white/10 bg-black/45 text-bone-dim hover:text-bone')}>
                    #{t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {sparse && (
            <div className="absolute inset-0 grid place-items-center bg-black/55 p-6 text-center backdrop-blur-[2px]">
              <div className="flex max-w-sm flex-col items-center gap-3">
                <h2 className="font-display text-h3 leading-tight text-bone">The sky is nearly empty</h2>
                <p className="text-fine text-bone-dim">It needs a few notes to draw. Write some in Second Brain, or light up a small example sky.</p>
                <Button size="sm" loading={busy} onClick={addSamples}>
                  <Sparkles size={14} aria-hidden="true" /> Try with sample notes
                </Button>
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3" aria-label="Stars">
          {picked && <div className="max-lg:hidden">{card}</div>}
          <section className="min-h-0 rounded-3xl border border-line bg-ink-1 p-3">
            <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-2">
              <h2 className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">All stars</h2>
              <small className="font-mono text-[0.64rem] text-bone-faint">threads</small>
            </div>
            <label className="relative mb-2 block">
              <Search size={14} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-bone-faint" aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a star" aria-label="Find a star" className="h-10 w-full rounded-full border border-line bg-ink-2 pr-4 pl-9 text-fine text-bone placeholder:text-bone-faint focus-visible:border-signal focus-visible:outline-none" />
            </label>
            <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
              {shownStars.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => setSelected(n.id === selected ? null : n.id)} aria-pressed={n.id === selected} className={clsx('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-fine transition-colors hover:bg-white/5', n.id === selected ? 'bg-white/10 text-bone' : 'text-bone-dim')}>
                    <i className="size-2 shrink-0 rounded-full" style={{ background: `hsl(${n.hue} 90% 70%)` }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{n.title}</span>
                    <small className="font-mono text-[0.64rem] text-bone-faint">{n.degree}</small>
                  </button>
                </li>
              ))}
              {!shownStars.length && <li className="px-2 py-3 font-mono text-fine text-bone-faint">{stars.length ? 'No star matches.' : 'No notes yet.'}</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

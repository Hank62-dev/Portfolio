import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Crosshair, Hand, Link2, Maximize2, Minimize2, Minus, Plus, RotateCcw, Search, X } from 'lucide-react';
import { Button } from '../../shared/ui';
import { clsx } from '../../shared/lib/format';
import { PageHead, Segmented } from '../components/Page';
import { buildGraph, radiusOf, stepLayout } from '../notes/graph';
import { deleteNote, loadNotes, notesStore } from '../notes/library';
import { useReadableNotes } from '../diary/useLock';
import { excerpt, hueOf } from '../notes/notes';
import { useStore } from '../store';
import { tr } from '../lang';
import { useDebounce } from '../../shared/hooks/useDebounce';

// roomier than the default, so the stars and their names have space
const SPACING = { repulsion: 5200, rest: 130 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const easeOut = (t) => 1 - (1 - t) ** 3;
// where the user dropped stars, kept in this browser only
const SPOTS = 'spacehank.constellation';
const readSpots = () => {
  try {
    return JSON.parse(localStorage.getItem(SPOTS) ?? '{}') ?? {};
  } catch {
    return {};
  }
};
const writeSpots = (nodes) => {
  try {
    const spots = {};
    for (const n of nodes) if (n.fixed) spots[n.id] = { x: Math.round(n.x), y: Math.round(n.y) };
    localStorage.setItem(SPOTS, JSON.stringify(spots));
  } catch {
    /* storage can be blocked; the stars just forget where they were put */
  }
};
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The sky of your notes: every note is a star, every shared tag or [[link]] a thread between two. The stars settle
 * by themselves into clusters; drag to look around, scroll to zoom, click a star to read what it is.
 */
export default function ConstellationView({ onOpenNote }) {
  const { loaded } = useStore(notesStore);
  const notes = useReadableNotes();
  const canvas = useRef(null);
  const frame = useRef({ nodes: [], edges: [], energy: 1, view: { x: 0, y: 0, k: 1 }, hover: null, selected: null, drag: null, pointers: new Map(), pinch: null, goal: null, glide: null, autoFit: true, size: { w: 600, h: 400 }, dirty: true });
  const [selected, setSelected] = useState(null);
  const [tag, setTag] = useState('');
  const [query, setQuery] = useState('');
  const search = useDebounce(query);
  const [touched, setTouched] = useState(false);
  const [expanded, setExpanded] = useState(false); // the sky fills the whole screen
  const [order, setOrder] = useState('linked'); // how the list of stars is sorted: 'linked' | 'az' | 'alone'
  const searchBox = useRef(null);

  useEffect(() => {
    void loadNotes();
  }, []);

  const graph = useMemo(() => buildGraph(notes), [notes]);

  // keep the positions of stars that were already there, so adding a note does not scramble the sky
  useEffect(() => {
    const before = new Map(frame.current.nodes.map((n) => [n.id, n]));
    const spots = readSpots();
    for (const n of graph.nodes) {
      const old = before.get(n.id);
      if (old) Object.assign(n, { x: old.x, y: old.y, vx: old.vx, vy: old.vy, a: old.a, fixed: old.fixed });
      else if (spots[n.id]) Object.assign(n, { x: spots[n.id].x, y: spots[n.id].y, fixed: true });
    }
    frame.current.nodes = graph.nodes;
    frame.current.edges = graph.edges;
    frame.current.energy = 1;
    frame.current.fitNow = true;
    frame.current.dirty = true;
    if (reduced()) for (let i = 0; i < 400; i += 1) stepLayout(graph.nodes, graph.edges, SPACING);
  }, [graph]);

  useEffect(() => {
    const f = frame.current;
    f.selected = selected;
    f.dirty = true;
    if (selected) f.focus?.(selected);
  }, [selected]);

  useEffect(() => {
    const f = frame.current;
    f.tag = tag;
    f.dirty = true;
    f.fitView?.();
  }, [tag]);

  // what is searched lights up in the sky: the other stars dim, and the view frames the ones that match
  useEffect(() => {
    const f = frame.current;
    const q = search.trim().toLowerCase();
    f.match = q ? new Set(graph.nodes.filter((n) => n.title.toLowerCase().includes(q)).map((n) => n.id)) : null;
    f.dirty = true;
    if (q && f.match.size) f.fitView?.();
  }, [search, graph]);

  // the full-screen sky: Escape closes it, and the page behind does not scroll
  useEffect(() => {
    if (!expanded) return undefined;
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = before;
    };
  }, [expanded]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    const ctx = el.getContext('2d');
    const f = frame.current;
    const calm = reduced();
    const dust = Array.from({ length: 90 }, (_, i) => ({ x: ((i * 9301 + 49297) % 233280) / 233280, y: ((i * 7919 + 12345) % 233280) / 233280, r: 0.4 + ((i * 31) % 10) / 14 }));
    let raf = 0;

    const resize = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      el.width = el.clientWidth * ratio;
      el.height = el.clientHeight * ratio;
      f.size = { w: el.clientWidth, h: el.clientHeight, ratio };
      if (f.autoFit) f.fitNow = true;
      f.dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    // The camera: `view` is what is drawn, `goal` is where it is heading, and every frame it covers a share of the way.
    const toWorld = (v, sx, sy) => ({ x: (sx - f.size.w / 2 - v.x) / v.k, y: (sy - f.size.h / 2 - v.y) / v.k });
    const aim = (goal) => {
      f.glide = null;
      f.dirty = true;
      if (calm) f.view = { ...goal };
      else f.goal = goal;
    };
    const fit = () => {
      const pool = f.nodes.filter((n) => (!f.tag || n.tags.includes(f.tag)) && (!f.match?.size || f.match.has(n.id)));
      if (!pool.length) return;
      const xs = pool.map((n) => n.x);
      const ys = pool.map((n) => n.y);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const k = clamp(Math.min(f.size.w / (x1 - x0 + 200), f.size.h / (y1 - y0 + 260)), 0.4, 1.5);
      aim({ x: (-(x0 + x1) / 2) * k, y: (-(y0 + y1) / 2) * k - 12, k });
    };
    f.fitView = () => {
      f.autoFit = true;
      fit();
    };
    f.focus = (id) => {
      const n = f.nodes.find((x) => x.id === id);
      if (!n) return;
      f.autoFit = false;
      const k = clamp(Math.max((f.goal ?? f.view).k, 1), 0.25, 3);
      // on a phone the card covers the lower part, so the star sits a little higher
      aim({ x: -n.x * k, y: -n.y * k - (f.size.w < 700 ? f.size.h * 0.14 : 0), k });
    };
    f.relax = () => {
      // let go of every star the user placed and let the sky settle again by itself
      for (const n of f.nodes) n.fixed = false;
      writeSpots(f.nodes);
      f.energy = 1;
      f.autoFit = true;
      f.dirty = true;
    };
    f.zoomBy = (by) => {
      f.autoFit = false;
      const base = f.goal ?? f.view;
      const k = clamp(base.k * by, 0.25, 3);
      aim({ k, x: (base.x * k) / base.k, y: (base.y * k) / base.k });
    };

    const pick = (sx, sy) => {
      const p = toWorld(f.view, sx, sy);
      let best = null;
      let bestD = Infinity;
      for (const n of f.nodes) {
        const d = Math.hypot(n.x - p.x, n.y - p.y);
        if (d < radiusOf(n) + 8 / f.view.k && d < bestD) {
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
      const dt = Math.min(64, time - (f.last || time));
      f.last = time;
      // how much of the way to a target a value covers this frame; time is the "half-life" in milliseconds
      const ease = (ms) => (calm ? 1 : 1 - Math.exp(-dt / ms));

      if (f.energy > 0.02) {
        f.energy = stepLayout(f.nodes, f.edges, SPACING);
        f.dirty = true;
      }
      if (f.autoFit && f.nodes.length && (f.energy > 0.02 || f.fitNow)) {
        fit();
        f.fitNow = false;
      }
      if (f.goal) {
        const e = ease(120);
        f.view.x += (f.goal.x - f.view.x) * e;
        f.view.y += (f.goal.y - f.view.y) * e;
        f.view.k += (f.goal.k - f.view.k) * e;
        if (Math.abs(f.goal.x - f.view.x) < 0.2 && Math.abs(f.goal.y - f.view.y) < 0.2 && Math.abs(f.goal.k - f.view.k) < 0.001) {
          f.view = { ...f.goal };
          f.goal = null;
        }
        f.dirty = true;
      } else if (f.glide) {
        // let go of a drag and the sky keeps drifting a moment, then settles
        f.view.x += f.glide.x * dt;
        f.view.y += f.glide.y * dt;
        const slow = Math.exp(-dt / 260);
        f.glide.x *= slow;
        f.glide.y *= slow;
        if (Math.hypot(f.glide.x, f.glide.y) < 0.01) f.glide = null;
        f.dirty = true;
      }
      if (calm && !f.dirty) return;
      f.dirty = false;

      const { w, h, ratio = 1 } = f.size;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7);
      bg.addColorStop(0, '#15131f');
      bg.addColorStop(1, '#07070a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      // slow clouds of colour drifting behind the stars
      for (const [i, hue] of [265, 18, 200].entries()) {
        const bx = w * (0.5 + 0.3 * Math.cos(time / 9000 + i * 2.1)) + f.view.x * 0.1;
        const by = h * (0.5 + 0.28 * Math.sin(time / 11000 + i * 1.7)) + f.view.y * 0.1;
        const cloud = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(w, h) * 0.5);
        cloud.addColorStop(0, `hsl(${hue} 80% 55% / 0.11)`);
        cloud.addColorStop(1, `hsl(${hue} 80% 55% / 0)`);
        ctx.fillStyle = cloud;
        ctx.fillRect(0, 0, w, h);
      }
      for (const d of dust) {
        ctx.fillStyle = `rgb(236 230 218 / ${0.18 + 0.12 * Math.sin(time / 1500 + d.x * 40)})`;
        ctx.beginPath();
        ctx.arc((((d.x * w + f.view.x * 0.15) % w) + w) % w, (((d.y * h + f.view.y * 0.15) % h) + h) % h, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(w / 2 + f.view.x, h / 2 + f.view.y);
      ctx.scale(f.view.k, f.view.k);
      const sk = Math.sqrt(f.view.k);
      const near = neighbours();
      const isDim = (n) => (f.selected && !near.has(n.id)) || (f.tag && !n.tags.includes(f.tag)) || (!f.selected && f.match && !f.match.has(n.id));

      // every star keeps a few values that glide towards where they should be: hover, selected, dimmed, shown
      f.nodes.forEach((n, i) => {
        n.a ??= { hover: 0, sel: 0, dim: 0, appear: calm ? 1 : 0, label: 0, born: time + i * 70 };
        const a = n.a;
        a.hover += ((n.id === f.hover ? 1 : 0) - a.hover) * ease(110);
        a.sel += ((n.id === f.selected ? 1 : 0) - a.sel) * ease(170);
        a.dim += ((isDim(n) ? 1 : 0) - a.dim) * ease(200);
        if (a.appear < 1) a.appear = calm ? 1 : clamp((time - a.born) / 900, 0, 1);
        n.life = easeOut(a.appear);
        // a tiny float, so the sky never looks pinned down
        n.px = n.x + (calm ? 0 : Math.sin(time / 2300 + i * 1.7) * 2.4 * n.life);
        n.py = n.y + (calm ? 0 : Math.cos(time / 2700 + i * 2.3) * 2.4 * n.life);
      });
      const byId = new Map(f.nodes.map((n) => [n.id, n]));

      for (const e of f.edges) {
        const a = byId.get(e.a);
        const b = byId.get(e.b);
        if (!a || !b) continue;
        e.lit = (e.lit ?? 0) + ((f.selected && (e.a === f.selected || e.b === f.selected) ? 1 : 0) - (e.lit ?? 0)) * ease(170);
        const dimmed = Math.max(a.a.dim, b.a.dim);
        const alpha = Math.min(a.life, b.life) * ((0.1 + e.weight * 0.03) * (1 - 0.7 * dimmed) + 0.5 * e.lit);
        const bend = a.id < b.id ? 0.12 : -0.12;
        const cx = (a.px + b.px) / 2 - (b.py - a.py) * bend;
        const cy = (a.py + b.py) / 2 + (b.px - a.px) * bend;
        const line = ctx.createLinearGradient(a.px, a.py, b.px, b.py);
        line.addColorStop(0, `hsl(${a.hue} 35% 78% / ${alpha})`);
        line.addColorStop(1, `hsl(${b.hue} 35% 78% / ${alpha})`);
        ctx.strokeStyle = line;
        ctx.lineWidth = (0.9 + e.weight * 0.3 + e.lit) / sk;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.quadraticCurveTo(cx, cy, b.px, b.py);
        ctx.stroke();
        if (e.lit > 0.05 && !calm) {
          // a spark of light running out from the selected star along each of its threads
          const raw = (time / 1700 + ((a.x * 0.013) % 1) + 1) % 1;
          const t = e.a === f.selected ? raw : 1 - raw;
          const [from, to] = e.a === f.selected ? [a, b] : [b, a];
          const sx = (1 - t) * (1 - t) * a.px + 2 * (1 - t) * t * cx + t * t * b.px;
          const sy = (1 - t) * (1 - t) * a.py + 2 * (1 - t) * t * cy + t * t * b.py;
          const spark = ctx.createRadialGradient(sx, sy, 0, sx, sy, 8 / sk);
          spark.addColorStop(0, `hsl(${from.hue} 95% 88% / ${0.95 * e.lit})`);
          spark.addColorStop(1, `hsl(${to.hue} 95% 70% / 0)`);
          ctx.fillStyle = spark;
          ctx.beginPath();
          ctx.arc(sx, sy, 8 / sk, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Each note is a small round asteroid in its tag's colour, glowing in that colour too: its craters and grit are laid out once from its id
      // (so each looks its own and never changes), it is lit from the upper left so it has form, and it turns slowly.
      // The glow breathes a little and brightens under the pointer or when chosen.
      const rockOf = (n) => {
        f.rocks ??= new Map();
        let rock = f.rocks.get(n.id);
        if (rock) return rock;
        let seed = [...n.id].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
        const rnd = () => {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        const craters = Array.from({ length: 3 + Math.floor(rnd() * 4) }, () => ({ angle: rnd() * Math.PI * 2, dist: Math.sqrt(rnd()) * 0.62, size: 0.07 + rnd() * 0.16 }));
        const grit = Array.from({ length: 14 }, () => ({ angle: rnd() * Math.PI * 2, dist: Math.sqrt(rnd()) * 0.8, size: 0.02 + rnd() * 0.035, light: rnd() < 0.5 }));
        rock = { craters, grit, turn: rnd() * Math.PI * 2, spin: (rnd() < 0.5 ? -1 : 1) * (0.00004 + rnd() * 0.00008) };
        f.rocks.set(n.id, rock);
        return rock;
      };
      const traceRock = (size) => {
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
      };
      // zoomed out, a rock shrinks less than the map does, so a far view still shows rocks and not specks
      const grow = 1 / Math.sqrt(Math.min(1, f.view.k));
      for (const n of f.nodes) {
        const a = n.a;
        const lift = a.hover + a.sel;
        const size = radiusOf(n) * grow * 1.15 * (0.55 + 0.45 * n.life) * (1 + 0.18 * a.hover + 0.1 * a.sel);
        const rock = rockOf(n);
        const angle = rock.turn + (calm ? 0 : time * rock.spin);
        ctx.globalAlpha = n.life * (1 - 0.75 * a.dim);

        const breathe = calm ? 1 : 0.88 + 0.12 * Math.sin(time / 1400 + n.x * 0.05);
        const reach = size * (2.6 + 0.9 * lift);
        const glow = ctx.createRadialGradient(n.px, n.py, size * 0.7, n.px, n.py, reach);
        glow.addColorStop(0, `hsl(${n.hue} 85% 66% / ${0.34 * breathe + 0.22 * lift})`);
        glow.addColorStop(0.45, `hsl(${n.hue} 85% 62% / ${0.1 + 0.08 * lift})`);
        glow.addColorStop(1, `hsl(${n.hue} 85% 60% / 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.px, n.py, reach, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(n.px, n.py);
        ctx.rotate(angle);
        traceRock(size);
        ctx.fillStyle = `hsl(${n.hue} 62% ${52 + 8 * lift}%)`;
        ctx.fill();
        ctx.clip();
        for (const g of rock.grit) {
          ctx.fillStyle = g.light ? `hsl(${n.hue} 80% 82% / 0.3)` : `hsl(${n.hue} 60% 22% / 0.3)`;
          ctx.beginPath();
          ctx.arc(Math.cos(g.angle) * g.dist * size, Math.sin(g.angle) * g.dist * size, g.size * size, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const c of rock.craters) {
          const cx = Math.cos(c.angle) * c.dist * size;
          const cy = Math.sin(c.angle) * c.dist * size;
          const cr = c.size * size;
          ctx.fillStyle = `hsl(${n.hue} 55% 24% / 0.75)`;
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `hsl(${n.hue} 80% 80% / 0.4)`;
          ctx.beginPath();
          ctx.arc(cx + cr * 0.25, cy + cr * 0.25, cr * 0.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `hsl(${n.hue} 55% 34% / 0.9)`;
          ctx.beginPath();
          ctx.arc(cx - cr * 0.08, cy - cr * 0.08, cr * 0.62, 0, Math.PI * 2);
          ctx.fill();
        }
        // back to the screen's own axes, so the light always comes from the upper left however the rock has turned
        ctx.rotate(-angle);
        const light = ctx.createRadialGradient(-size * 0.5, -size * 0.55, size * 0.02, -size * 0.2, -size * 0.2, size * 1.25);
        light.addColorStop(0, `hsl(${n.hue} 90% 92% / 0.6)`);
        light.addColorStop(0.32, `hsl(${n.hue} 90% 85% / 0.08)`);
        light.addColorStop(0.58, `hsl(${n.hue} 60% 12% / 0.22)`);
        light.addColorStop(1, `hsl(${n.hue} 60% 8% / 0.85)`);
        ctx.fillStyle = light;
        ctx.fillRect(-size * 1.4, -size * 1.4, size * 2.8, size * 2.8);
        ctx.restore();
        // a thin bright rim where the light catches the upper-left edge
        ctx.beginPath();
        ctx.arc(n.px, n.py, size, 0, Math.PI * 2);
        const rim = ctx.createLinearGradient(n.px - size, n.py - size, n.px + size * 0.4, n.py + size * 0.4);
        rim.addColorStop(0, `hsl(${n.hue} 90% 85% / ${0.6 + 0.3 * lift})`);
        rim.addColorStop(0.5, `hsl(${n.hue} 90% 85% / 0)`);
        ctx.strokeStyle = rim;
        ctx.lineWidth = Math.max(0.6, size * 0.06);
        ctx.stroke();
      }

      // the chosen rock is marked as on a star chart: four ticks and a slowly turning dashed ring around it
      for (const n of f.nodes) {
        const a = n.a;
        if (a.sel < 0.02) continue;
        const r = radiusOf(n) * grow * 1.15 * (1 + 0.1 * a.sel);
        const ring = r * 1.25 + 6 / sk + 5 * (1 - a.sel);
        ctx.globalAlpha = n.life * a.sel;
        ctx.strokeStyle = 'rgb(236 230 218 / 0.85)';
        ctx.lineWidth = 1.2 / sk;
        ctx.setLineDash([4 / sk, 5 / sk]);
        ctx.beginPath();
        ctx.arc(n.px, n.py, ring, calm ? 0 : time / 4000, (calm ? 0 : time / 4000) + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1.6 / sk;
        for (let q = 0; q < 4; q += 1) {
          const angle = (q * Math.PI) / 2 + Math.PI / 4;
          const from = ring + 3 / sk;
          const to = ring + 10 / sk;
          ctx.beginPath();
          ctx.moveTo(n.px + Math.cos(angle) * from, n.py + Math.sin(angle) * from);
          ctx.lineTo(n.px + Math.cos(angle) * to, n.py + Math.sin(angle) * to);
          ctx.stroke();
        }
        if (!calm) {
          // a faint pulse of light leaves the star every couple of seconds
          const phase = (time % 2600) / 2600;
          ctx.strokeStyle = `hsl(${n.hue} 95% 82% / ${(1 - phase) * 0.4})`;
          ctx.lineWidth = 1 / sk;
          ctx.beginPath();
          ctx.arc(n.px, n.py, ring + phase * 26, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // names: the ones that matter most are placed first, and any that would land on top of another stay hidden
      ctx.font = `${12 / sk}px "Geist", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgb(0 0 0 / 0.9)';
      ctx.shadowBlur = 6;
      const rank = (n) => n.a.sel * 100 + n.a.hover * 80 + (near.has(n.id) ? 20 : 0) + n.degree * 2 + Math.min(n.words, 100) / 50;
      const placed = [];
      for (const n of [...f.nodes].sort((p, q) => rank(q) - rank(p))) {
        const important = n.id === f.selected || n.id === f.hover;
        const text = n.title.length > 26 ? `${n.title.slice(0, 25)}…` : n.title;
        const width = ctx.measureText(text).width;
        const x = n.px;
        const y = n.py + radiusOf(n) * grow * 1.15 * (1 + 0.1 * n.a.sel) + 14 / sk;
        const box = [x - width / 2 - 5 / sk, y - 13 / sk, x + width / 2 + 5 / sk, y + 5 / sk];
        let want = n.life > 0.6 && n.a.dim < 0.5 && (important || (f.selected && near.has(n.id)) || f.view.k > 0.55);
        if (want && !important && placed.some((p) => box[0] < p[2] && box[2] > p[0] && box[1] < p[3] && box[3] > p[1])) want = false;
        if (want) placed.push(box);
        n.a.label += ((want ? 1 : 0) - n.a.label) * ease(150);
        if (n.a.label > 0.02) {
          ctx.fillStyle = `rgb(236 230 218 / ${0.92 * n.a.label * n.life})`;
          ctx.fillText(text, x, y);
        }
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);

    const rect = () => el.getBoundingClientRect();
    const spread = () => {
      const [a, b] = [...f.pointers.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };
    const down = (e) => {
      setTouched(true);
      f.autoFit = false;
      f.goal = null;
      f.glide = null;
      f.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (f.pointers.size === 2) {
        // a second finger: stop dragging and start pinching
        f.pinch = { d: spread().d, k: f.view.k };
        if (f.drag) Object.assign(f.drag, { moved: true, node: null });
      } else {
        // pressing on a star picks it up; pressing on empty sky drags the sky
        const r = rect();
        const node = pick(e.clientX - r.left, e.clientY - r.top);
        const p = toWorld(f.view, e.clientX - r.left, e.clientY - r.top);
        f.drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, t: performance.now(), vx: 0, vy: 0, node, ox: node ? p.x - node.x : 0, oy: node ? p.y - node.y : 0 };
      }
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      const r = rect();
      if (f.pointers.has(e.pointerId)) f.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (f.pinch && f.pointers.size === 2) {
        const now = spread();
        const k = clamp(f.pinch.k * (now.d / f.pinch.d), 0.25, 3);
        const before = toWorld(f.view, now.x - r.left, now.y - r.top);
        f.view = { k, x: now.x - r.left - f.size.w / 2 - before.x * k, y: now.y - r.top - f.size.h / 2 - before.y * k };
        f.dirty = true;
        return;
      }
      if (f.drag) {
        const dx = e.clientX - f.drag.x;
        const dy = e.clientY - f.drag.y;
        if (!f.drag.moved && Math.hypot(e.clientX - f.drag.sx, e.clientY - f.drag.sy) > 4) {
          f.drag.moved = true;
          el.style.cursor = 'grabbing';
        }
        if (f.drag.node) {
          // a star in hand follows the pointer and stays where it is let go; the others sway around it
          if (f.drag.moved) {
            const p = toWorld(f.view, e.clientX - r.left, e.clientY - r.top);
            Object.assign(f.drag.node, { x: p.x - f.drag.ox, y: p.y - f.drag.oy, vx: 0, vy: 0, fixed: true });
            f.hover = f.drag.node.id;
            f.energy = Math.max(f.energy, 0.5);
          }
          f.dirty = true;
          return;
        }
        const now = performance.now();
        const gap = Math.max(1, now - f.drag.t);
        f.drag.vx = f.drag.vx * 0.6 + (dx / gap) * 0.4;
        f.drag.vy = f.drag.vy * 0.6 + (dy / gap) * 0.4;
        f.drag.t = now;
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
      if (f.drag?.node?.fixed && f.drag.moved) writeSpots(f.nodes);
      if (f.drag && !f.drag.moved && f.pointers.size === 0) {
        const hit = pick(e.clientX - r.left, e.clientY - r.top);
        setSelected(hit ? (hit.id === f.selected ? null : hit.id) : null);
      }
      if (f.drag?.moved && !f.drag.node && f.pointers.size === 0 && !calm && performance.now() - f.drag.t < 90 && Math.hypot(f.drag.vx, f.drag.vy) > 0.05) {
        f.glide = { x: f.drag.vx, y: f.drag.vy };
      }
      if (f.drag?.node && f.drag.moved) f.hover = null;
      el.style.cursor = f.hover ? 'pointer' : 'grab';
      if (f.pointers.size === 0) f.drag = null;
      else if (f.pointers.size === 1) {
        // one finger left after a pinch: carry on dragging from where it is
        const [rest] = f.pointers.values();
        f.drag = { x: rest.x, y: rest.y, sx: rest.x, sy: rest.y, moved: true, t: performance.now(), vx: 0, vy: 0, node: null };
      }
    };
    const wheel = (e) => {
      e.preventDefault();
      f.autoFit = false;
      const r = rect();
      const [sx, sy] = [e.clientX - r.left, e.clientY - r.top];
      // zoom from where the last wheel tick is heading, so a quick spin adds up instead of restarting
      const base = f.goal ?? f.view;
      const before = toWorld(base, sx, sy);
      const k = clamp(base.k * Math.exp(-e.deltaY * 0.0015), 0.25, 3);
      aim({ k, x: sx - f.size.w / 2 - before.x * k, y: sy - f.size.h / 2 - before.y * k });
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

  const zoom = (by) => frame.current.zoomBy?.(by);
  const fit = () => frame.current.fitView?.();
  const relax = () => frame.current.relax?.();
  const lookAt = (id) => {
    frame.current.hover = id;
    frame.current.dirty = true;
  };

  // the tags, the most used first, with how many stars carry each
  const tags = useMemo(() => {
    const count = new Map();
    for (const n of graph.nodes) for (const t of n.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, n]) => ({ name, n }));
  }, [graph]);
  const picked = notes.find((n) => n.id === selected);
  const pickedNode = graph.nodes.find((n) => n.id === selected);
  const linked = useMemo(() => {
    if (!selected) return [];
    const ids = new Set(graph.edges.filter((e) => e.a === selected || e.b === selected).map((e) => (e.a === selected ? e.b : e.a)));
    return graph.nodes.filter((n) => ids.has(n.id)).sort((a, b) => b.degree - a.degree);
  }, [graph, selected]);
  const lonely = useMemo(() => graph.nodes.filter((n) => n.degree === 0).length, [graph]);
  const stars = useMemo(() => {
    const list = [...graph.nodes];
    if (order === 'az') return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    if (order === 'alone') return list.filter((n) => n.degree === 0).sort((a, b) => b.words - a.words);
    return list.sort((a, b) => b.degree - a.degree || b.words - a.words);
  }, [graph, order]);
  const shownStars = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? stars.filter((n) => n.title.toLowerCase().includes(q)) : stars;
  }, [stars, search]);
  const matchCount = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? graph.nodes.filter((n) => n.title.toLowerCase().includes(q)).length : null;
  }, [graph, search]);

  /** Goes to the star before or after the chosen one, in the order of the list: a walk through the sky. */
  const step = (by) => {
    if (!shownStars.length) return;
    const at = shownStars.findIndex((n) => n.id === selected);
    setSelected(shownStars[at < 0 ? 0 : (at + by + shownStars.length) % shownStars.length].id);
  };

  // the keys: / searches, + and - zoom, 0 frames everything, F fills the screen, the arrows walk from star to star, Escape steps back
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
      if (e.key === 'Escape') {
        if (e.target === searchBox.current) {
          if (query) setQuery('');
          else searchBox.current.blur();
        } else if (typing) return;
        else if (selected) setSelected(null);
        else if (expanded) setExpanded(false);
        else if (tag) setTag('');
        else return;
        e.preventDefault();
        return;
      }
      if (typing || e.target.closest?.('[role="dialog"]')) return;
      if (e.key === '/') searchBox.current?.focus();
      else if (e.key === '+' || e.key === '=') zoom(1.25);
      else if (e.key === '-') zoom(0.8);
      else if (e.key === '0') fit();
      else if (e.key === 'f' || e.key === 'F') setExpanded((now) => !now);
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') step(1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') step(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const removeSamples = async () => {
    for (const n of notes.filter((x) => x.sample)) await deleteNote(n.id);
    setSelected(null);
  };
  const sparse = loaded && notes.length < 1; // one note is already a star
  const chip = 'rounded-full border px-2.5 py-1 font-mono text-[0.68rem] transition-colors';
  const glass = 'border border-wash/10 bg-shade/55 backdrop-blur-md';

  const card = picked && pickedNode && (
    <section key={picked.id} className="animate-fade-in max-h-[48dvh] overflow-y-auto overscroll-contain rounded-3xl border border-line bg-ink-1/95 p-4 max-sm:max-h-[40dvh] shadow-[0_30px_70px_-40px_rgb(var(--shadow-rgb)/0.95)] backdrop-blur-xl sm:p-5" data-selected>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 font-mono text-[0.66rem] tracking-[0.12em] text-bone-faint uppercase">
          <i className="size-2 shrink-0 rounded-full" style={{ background: `hsl(${pickedNode.hue} 90% 70%)`, boxShadow: `0 0 10px hsl(${pickedNode.hue} 90% 70%)` }} aria-hidden="true" />
          {pickedNode.day ? tr('Journal') : tr('Note')}
          {shownStars.length > 1 && shownStars.some((n) => n.id === selected) && (
            <span className="tracking-normal normal-case">
              · {shownStars.findIndex((n) => n.id === selected) + 1}/{shownStars.length}
            </span>
          )}
        </span>
        <span className="-mr-1 flex shrink-0 items-center">
          {shownStars.length > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label={tr('Previous star')} title={tr('Previous star')} className="grid size-8 place-items-center rounded-full text-bone-faint hover:bg-wash/5 hover:text-bone">
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => step(1)} aria-label={tr('Next star')} title={tr('Next star')} className="grid size-8 place-items-center rounded-full text-bone-faint hover:bg-wash/5 hover:text-bone">
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </>
          )}
          <button type="button" onClick={() => setSelected(null)} aria-label={tr('Close')} className="grid size-8 place-items-center rounded-full text-bone-faint hover:bg-wash/5 hover:text-bone">
            <X size={15} aria-hidden="true" />
          </button>
        </span>
      </div>
      <h2 className="mt-1.5 line-clamp-2 font-display text-h3 leading-tight text-bone max-sm:text-[1.35rem]">{pickedNode.title}</h2>
      <p className="mt-1 font-mono text-[0.68rem] text-bone-faint">
        {tr('{0} words', pickedNode.words)} · {pickedNode.degree === 1 ? tr('1 thread') : tr('{0} threads', pickedNode.degree)}
      </p>
      <p className="mt-2.5 line-clamp-3 text-fine leading-relaxed text-bone-dim max-sm:mt-2 max-sm:line-clamp-2">{excerpt(picked.text.replace(/^.*\n/, '') || picked.text, '', 200)}</p>
      {pickedNode.tags.length > 0 && (
        <div className="no-scrollbar mt-3 flex gap-1.5 max-sm:overflow-x-auto sm:flex-wrap">
          {pickedNode.tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTag(t);
                setSelected(null);
              }}
              title={tr('Show only #{0}', t)}
              className={clsx(chip, 'shrink-0 border-transparent text-bone hover:brightness-125')}
              style={{ background: `hsl(${hueOf(t)} 70% 55% / 0.2)` }}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
      {linked.length > 0 ? (
        <div className="mt-4">
          <h3 className="mb-1.5 font-mono text-[0.62rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Connected to ({0})', linked.length)}</h3>
          <div className="no-scrollbar flex gap-1.5 max-sm:overflow-x-auto sm:flex-wrap">
            {linked.slice(0, 10).map((n) => (
              <button key={n.id} type="button" onClick={() => setSelected(n.id)} onMouseEnter={() => lookAt(n.id)} onMouseLeave={() => lookAt(null)} className={clsx(chip, 'inline-flex max-w-full shrink-0 items-center gap-1.5 border-line text-bone-dim hover:border-signal hover:text-bone max-sm:max-w-[14rem]')}>
                <i className="size-1.5 shrink-0 rounded-full" style={{ background: `hsl(${n.hue} 90% 70%)` }} aria-hidden="true" />
                <span className="truncate">{n.title}</span>
              </button>
            ))}
            {linked.length > 10 && <span className="shrink-0 px-1 py-1 font-mono text-[0.68rem] text-bone-faint">{tr('+{0} more', linked.length - 10)}</span>}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-fine text-bone-faint">{tr('A lone star: give it a tag or a [[link]] to join it to the others.')}</p>
      )}
      <Button size="sm" className="mt-4 w-full sm:w-auto" onClick={() => onOpenNote(picked.id)}>
        {tr('Open the note')} <ArrowUpRight size={14} aria-hidden="true" />
      </Button>
    </section>
  );

  const controls = [
    [tr('Zoom in'), Plus, () => zoom(1.25), '+'],
    [tr('Zoom out'), Minus, () => zoom(0.8), '−'],
    [tr('Fit to view'), Crosshair, fit, '0'],
    [tr('Reset star positions'), RotateCcw, relax, ''],
  ];
  const fullLabel = expanded ? tr('Exit full screen') : tr('Full screen');

  return (
    <div className="flex flex-col gap-5">
      <PageHead eyebrow={tr('Knowledge')} title={tr('Your')} accent="Constellation." description={tr('Your notes as a sky. Notes that share a tag or a [[link]] are drawn together, so the shape of what you know shows itself.')}>
        {notes.some((n) => n.sample) && (
          <Button variant="ghost" size="sm" onClick={removeSamples}>
            {tr('Remove sample notes')}
          </Button>
        )}
      </PageHead>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className={clsx('dark-island overflow-hidden bg-[#07070a]', expanded ? 'fixed inset-0 z-[80]' : 'relative self-start rounded-3xl border border-line')} data-expanded={expanded ? '' : undefined}>
          <canvas ref={canvas} className={clsx('block w-full cursor-grab touch-none', expanded ? 'h-[100dvh]' : 'h-[min(66dvh,600px)] min-h-[340px] max-sm:h-[62dvh]')} aria-label={tr('A map of your notes. Use the list beside it for a keyboard-friendly version.')} data-sky />

          {/* top left: find a star (the ones that match light up), and what the sky holds */}
          <div className="absolute top-3 right-16 left-3 flex flex-col items-start gap-2 sm:right-auto sm:w-72">
            <label className={clsx(glass, 'flex h-10 w-full items-center gap-2 rounded-full px-3.5 transition-colors focus-within:border-signal/60')}>
              <Search size={14} className="shrink-0 text-bone-faint" aria-hidden="true" />
              <input
                ref={searchBox}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && shownStars[0]) {
                    setSelected(shownStars[0].id);
                    e.currentTarget.blur();
                  }
                }}
                placeholder={tr('Find a star')}
                aria-label={tr('Find a star')}
                className="min-w-0 flex-1 bg-transparent text-fine text-bone placeholder:text-bone-faint focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <>
                  {matchCount !== null && <small className={clsx('shrink-0 font-mono text-[0.64rem]', matchCount ? 'text-bone-faint' : 'text-danger')}>{matchCount}</small>}
                  <button type="button" onClick={() => setQuery('')} aria-label={tr('Clear the search')} className="shrink-0 text-bone-faint hover:text-bone">
                    <X size={14} aria-hidden="true" />
                  </button>
                </>
              ) : (
                <kbd className="shrink-0 rounded border border-wash/15 px-1.5 font-mono text-[0.6rem] text-bone-faint max-md:hidden">/</kbd>
              )}
            </label>
            <span className={clsx(glass, 'pointer-events-none inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[0.68rem] text-bone-dim')}>
              <b className="font-medium text-bone">{graph.nodes.length}</b> {graph.nodes.length === 1 ? tr('star') : tr('stars')} <i className="size-1 rounded-full bg-bone-faint" aria-hidden="true" /> <b className="font-medium text-bone">{graph.edges.length}</b> {graph.edges.length === 1 ? tr('thread') : tr('threads')}
            </span>
            {!touched && !selected && !sparse && !query && (
              <span className={clsx(glass, 'pointer-events-none inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[0.68rem] text-bone-faint')} data-hint>
                <Hand size={12} aria-hidden="true" /> {tr('Drag a star to move it, tap to read')}
              </span>
            )}
          </div>

          {/* top right: the camera controls in one column, and the full-screen switch below them */}
          <div className="absolute top-3 right-3 flex flex-col items-center gap-2">
            <div className={clsx(glass, 'flex flex-col overflow-hidden rounded-full')}>
              {controls.map(([label, Icon, run, key]) => (
                <button key={label} type="button" aria-label={label} title={key ? `${label} (${key})` : label} onClick={run} className="grid size-10 place-items-center text-bone-dim transition-colors hover:bg-wash/10 hover:text-bone active:scale-90 sm:size-9">
                  <Icon size={15} aria-hidden="true" />
                </button>
              ))}
            </div>
            <button type="button" aria-label={fullLabel} title={`${fullLabel} (F)`} aria-pressed={expanded} onClick={() => setExpanded(!expanded)} className={clsx(glass, 'grid size-10 place-items-center rounded-full text-bone-dim transition-colors hover:text-bone active:scale-90 sm:size-9')}>
              {expanded ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
            </button>
          </div>

          {/* bottom: the chosen star's card (beside the sky on a wide screen, unless the sky fills the screen), else the tags */}
          <div className={clsx('absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3', expanded && 'pb-[calc(0.75rem+env(safe-area-inset-bottom))]')}>
            {picked && <div className={expanded ? 'sm:max-w-md' : 'lg:hidden'}>{card}</div>}
            {tags.length > 0 && !picked && (
              <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 [mask-image:linear-gradient(to_right,transparent,#000_12px,#000_calc(100%-24px),transparent)]" role="group" aria-label={tr('Filter by tag')}>
                {tag && (
                  <button type="button" onClick={() => setTag('')} className={clsx(chip, glass, 'inline-flex shrink-0 items-center gap-1 text-bone')}>
                    <X size={11} aria-hidden="true" /> {tr('All')}
                  </button>
                )}
                {tags.map(({ name, n }) => (
                  <button key={name} type="button" aria-pressed={tag === name} onClick={() => setTag(tag === name ? '' : name)} className={clsx(chip, 'inline-flex shrink-0 items-center gap-1.5 backdrop-blur-md', tag === name ? 'border-transparent bg-bone text-ink-0' : 'border-wash/10 bg-shade/55 text-bone-dim hover:text-bone')}>
                    <i className="size-1.5 rounded-full" style={{ background: `hsl(${hueOf(name)} 90% 70%)` }} aria-hidden="true" />#{name}
                    <span className={clsx('text-[0.6rem]', tag === name ? 'text-ink-0/60' : 'text-bone-faint')}>{n}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {sparse && (
            <div className="absolute inset-0 grid place-items-center bg-shade/55 p-6 text-center backdrop-blur-[2px]">
              <div className="flex max-w-sm flex-col items-center gap-3">
                <h2 className="font-display text-h3 leading-tight text-bone">{tr('The sky is empty')}</h2>
                <p className="text-fine text-bone-dim">{tr('Every note is a star. Write one in Second Brain and it appears here.')}</p>
              </div>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3" aria-label={tr('Stars')}>
          {picked && <div className="max-lg:hidden">{card}</div>}
          <section className="flex min-h-0 flex-col gap-2 rounded-3xl border border-line bg-ink-1 p-3">
            <div className="flex items-center justify-between gap-2 px-2 pt-1">
              <h2 className="truncate font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{search.trim() ? tr('Matching “{0}”', search.trim()) : tr('All stars')}</h2>
              <small className="font-mono text-[0.64rem] text-bone-faint">{shownStars.length}</small>
            </div>
            <div className="px-1">
              <Segmented
                label={tr('Sort the stars')}
                value={order}
                onChange={setOrder}
                options={[
                  { id: 'linked', label: tr('Most linked') },
                  { id: 'az', label: tr('A–Z') },
                  { id: 'alone', label: lonely ? tr('Alone ({0})', lonely) : tr('Alone') },
                ]}
                round
              />
            </div>
            <ul className="flex max-h-[26rem] flex-col gap-0.5 overflow-y-auto">
              {shownStars.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => setSelected(n.id === selected ? null : n.id)} onMouseEnter={() => lookAt(n.id)} onMouseLeave={() => lookAt(null)} onFocus={() => lookAt(n.id)} onBlur={() => lookAt(null)} aria-pressed={n.id === selected} className={clsx('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-fine transition-colors hover:bg-wash/5', n.id === selected ? 'bg-wash/10 text-bone' : 'text-bone-dim')}>
                    <i className="size-2 shrink-0 rounded-full" style={{ background: `hsl(${n.hue} 90% 70%)` }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{n.title}</span>
                    <small className="inline-flex items-center gap-1 font-mono text-[0.64rem] text-bone-faint" title={n.degree === 1 ? tr('1 thread') : tr('{0} threads', n.degree)}>
                      {n.degree}
                      <Link2 size={10} aria-hidden="true" />
                    </small>
                  </button>
                </li>
              ))}
              {!shownStars.length && <li className="px-2 py-3 font-mono text-fine text-bone-faint">{search.trim() ? tr('No star matches.') : order === 'alone' && graph.nodes.length ? tr('Every star is joined to another.') : tr('No notes yet.')}</li>}
            </ul>
            <p className="px-2 pb-1 font-mono text-[0.6rem] text-bone-faint max-md:hidden">{tr('/ find · ← → walk · + − zoom · 0 fit · F full screen')}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

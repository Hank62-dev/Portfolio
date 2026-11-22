import { useEffect, useRef, useState } from 'react';
import { LAYERS } from '../../data/projects';
import { prefersReducedMotion } from '../../motion/gsap';
import { box, cylinder, flat, iso, plateAt } from './axonometric';
import { heroStore } from './heroStore';

// the sheet
const W = 640;
const H = 640;
const CX = 250;
const TOP = 112;
const STEP = 128;
const S = 95; // half a plate's side
const THICK = 6;
const HALF = 2 * S * 0.34 + 4; // half a plate's drawn height (for pointing at it)
const RIGHT = iso(0, 0, S, -S)[0]; // how far a plate's right corner is from its centre
const pad2 = (n) => String(n).padStart(2, '0');

/** A line that draws itself in: every stroke has a length of 1, so one dash of 1 hides or shows all of it. */
const Ln = ({ as: Tag = 'path', ...rest }) => <Tag pathLength="1" className="bp-ln" {...rest} />;

const P = (x, y) => [x, y];
const rect = (x, y, w, d) => [P(x, y), P(x + w, y), P(x + w, y + d), P(x, y + d)];

/** A box with the three faces we see: `shelves` draws lines round its near faces (a rack's units), `ribs` uprights along its front (a container's side), `hot` inks it in the accent. */
const Block = ({ cx, cy, x, y, w, d, h, z0 = 0, hot = false, shelves = 0, ribs = 0 }) => {
  const b = box(cx, cy, x, y, w, d, h, z0);
  const tone = hot ? ' bp-hot' : '';
  return (
    <g>
      <Ln as="polygon" points={b.left} className={`bp-ln bp-fill${tone}`} />
      <Ln as="polygon" points={b.right} className={`bp-ln bp-fill bp-shade${tone}`} />
      <Ln as="polygon" points={b.top} className={`bp-ln bp-fill${tone}`} />
      {Array.from({ length: shelves }, (_, k) => (
        <Ln
          key={`s${k}`}
          as="polyline"
          points={flat(cx, cy, [P(x, y + d), P(x + w, y + d), P(x + w, y)], z0 + ((k + 1) * h) / (shelves + 1))}
          className="bp-ln bp-thin"
        />
      ))}
      {Array.from({ length: ribs }, (_, k) => {
        const xr = x + ((k + 1) * w) / (ribs + 1);
        const [ax, ay] = iso(cx, cy, xr, y + d, z0 + 2);
        const [bx, by] = iso(cx, cy, xr, y + d, z0 + h - 2);
        return <Ln key={`r${k}`} as="line" x1={ax} y1={ay} x2={bx} y2={by} className="bp-ln bp-thin" />;
      })}
    </g>
  );
};

/** Boxes drawn from the back of the plate to the front (and bottom to top), so nearer ones cover further ones. */
const blocks = (cx, cy, list) =>
  [...list]
    .sort((a, b) => a.x + a.w / 2 + a.y + a.d / 2 + (a.z0 ?? 0) * 0.01 - (b.x + b.w / 2 + b.y + b.d / 2 + (b.z0 ?? 0) * 0.01))
    .map((b, k) => <Block key={k} cx={cx} cy={cy} {...b} />);

const dot = (cx, cy, x, y, z = 0, hot = false, r = 1.6) => {
  const [sx, sy] = iso(cx, cy, x, y, z);
  return <circle key={`${x},${y},${z}`} cx={sx} cy={sy} r={r} className={hot ? 'bp-centre' : 'bp-node'} />;
};

/** Dashed uprights from the plate to something floating over it. */
const drops = (cx, cy, corners, z) =>
  corners.map(([x, y]) => {
    const [ax, ay] = iso(cx, cy, x, y, 0);
    const [bx, by] = iso(cx, cy, x, y, z);
    return <Ln key={`${x},${y},${z}`} as="line" x1={ax} y1={ay} x2={bx} y2={by} className="bp-dashed bp-thin" strokeDasharray="0.06 0.06" />;
  });

/** What is drawn on each plate, in plate coordinates, centred on (cx, cy). */
const contents = {
  // a browser window and a phone floating over the plate, a cursor, and the design tokens laid out on the plate itself
  interface: (cx, cy) => {
    const z = 16;
    const zp = 30;
    const win = rect(-84, -74, 112, 104);
    const phone = rect(44, -70, 30, 56);
    return (
      <>
        {[0, 1, 2].flatMap((r) =>
          [0, 1, 2, 3].map((c) => (
            <Ln key={`t${r}${c}`} as="polygon" points={flat(cx, cy, rect(36 + c * 13, 30 + r * 13, 9, 9))} className={`bp-ln ${r === 1 && c === 2 ? 'bp-hot' : 'bp-thin'}`} />
          ))
        )}
        {drops(cx, cy, win, z)}
        <Ln as="polygon" points={flat(cx, cy, win, z)} className="bp-ln bp-fill" />
        <Ln as="polyline" points={flat(cx, cy, [P(-84, -60), P(28, -60)], z)} />
        {[-78, -73, -68].map((x) => dot(cx, cy, x, -67, z, false, 1.2))}
        {/* the sidebar, one item chosen */}
        <Ln as="polyline" points={flat(cx, cy, [P(-64, -60), P(-64, 30)], z)} className="bp-ln bp-thin" />
        {[-50, -42, -34, -26].map((y, k) => (
          <Ln key={y} as="polyline" points={flat(cx, cy, [P(-80, y), P(-68, y)], z)} className={`bp-ln ${k === 1 ? 'bp-hot' : 'bp-thin'}`} />
        ))}
        {/* cards, the first a picture: a box with a cross, the way drawings mark an image */}
        {[
          [-58, -52, 26, 26],
          [-28, -52, 26, 26],
          [2, -52, 22, 26],
        ].map(([x, y, w, d], k) => (
          <g key={x}>
            <Ln as="polygon" points={flat(cx, cy, rect(x, y, w, d), z)} className="bp-ln bp-thin" />
            {k === 0 && <Ln as="polyline" points={flat(cx, cy, [P(x, y), P(x + w, y + d)], z)} className="bp-ln bp-thin" />}
            {k === 0 && <Ln as="polyline" points={flat(cx, cy, [P(x + w, y), P(x, y + d)], z)} className="bp-ln bp-thin" />}
          </g>
        ))}
        <Ln as="polygon" points={flat(cx, cy, rect(-58, -18, 82, 9), z)} className="bp-ln bp-hot" />
        {[
          [0, 10],
          [9, -4],
          [18, -20],
        ].map(([y, end]) => (
          <Ln key={y} as="polyline" points={flat(cx, cy, [P(-58, y), P(end, y)], z)} className="bp-ln bp-thin" />
        ))}
        {/* the cursor */}
        <Ln as="polygon" points={flat(cx, cy, [P(6, -4), P(16, 6), P(11, 6), P(14, 12), P(12, 13), P(9, 7), P(6, 10)], z + 1)} className="bp-ln bp-fill" />
        {/* the phone */}
        {drops(cx, cy, phone, zp)}
        <Ln as="polygon" points={flat(cx, cy, phone, zp)} className="bp-ln bp-fill" />
        <Ln as="polyline" points={flat(cx, cy, [P(54, -66), P(64, -66)], zp)} className="bp-ln bp-thin" />
        {[-58, -48, -38].map((y) => (
          <Ln key={y} as="polygon" points={flat(cx, cy, rect(48, y, 22, 7), zp)} className="bp-ln bp-thin" />
        ))}
        <Ln as="polygon" points={flat(cx, cy, rect(48, -26, 22, 7), zp)} className="bp-ln bp-hot" />
      </>
    );
  },
  // a gateway, the services behind it, a queue between them, and the routes that join them on the plate
  service: (cx, cy) => {
    const routes = [
      [P(-58, 6), P(-58, -50), P(-40, -50)],
      [P(-58, -20), P(8, -20), P(8, -64)],
      [P(-58, -20), P(52, -20), P(52, -48)],
      [P(-58, 6), P(-58, 54), P(-42, 54)],
      [P(14, -20), P(14, 14), P(42, 14)],
      [P(14, 14), P(14, 48)],
    ];
    return (
      <>
        {routes.map((r, k) => (
          <Ln key={k} as="polyline" points={flat(cx, cy, r)} className={`bp-ln ${k === 4 ? 'bp-hot' : 'bp-thin'}`} />
        ))}
        {[P(-58, -20), P(8, -20), P(14, -20), P(14, 14), P(-58, 6), P(52, -20)].map(([x, y]) => dot(cx, cy, x, y))}
        {blocks(cx, cy, [
          { x: -84, y: -12, w: 24, d: 30, h: 34, shelves: 2 }, // the gateway, taller than the rest
          { x: -40, y: -80, w: 26, d: 20, h: 14 },
          { x: -4, y: -86, w: 24, d: 20, h: 20, shelves: 1 },
          { x: 40, y: -70, w: 26, d: 22, h: 12 },
          { x: 42, y: 4, w: 26, d: 22, h: 16, hot: true },
          { x: -42, y: 44, w: 28, d: 20, h: 10 },
          { x: 2, y: 48, w: 26, d: 22, h: 14, shelves: 1 },
          // the queue: thin slabs one over another
          ...[0, 1, 2, 3].map((k) => ({ x: -12, y: -8, w: 20, d: 18, h: 3, z0: k * 5 })),
        ])}
      </>
    );
  },
  // stores as cylinders kept in step, a cache as stacked slabs, a vector index as a field of points
  data: (cx, cy) => {
    const stores = [
      [4, -66, 13, 24],
      [-48, -44, 18, 34],
      [50, -40, 15, 30],
      [-60, 28, 12, 20],
    ];
    return (
      <>
        <Ln as="polyline" points={flat(cx, cy, [P(-48, -44), P(4, -66), P(50, -40)])} className="bp-dashed bp-thin" strokeDasharray="0.04 0.04" />
        <Ln as="polyline" points={flat(cx, cy, [P(-48, -44), P(-60, 28)])} className="bp-dashed bp-thin" strokeDasharray="0.06 0.06" />
        <Ln as="polygon" points={flat(cx, cy, rect(24, 28, 56, 45))} className="bp-ln bp-thin" />
        {[0, 1, 2, 3, 4].flatMap((c) => [0, 1, 2, 3].map((r) => dot(cx, cy, 30 + c * 11, 34 + r * 11, 0, (c + r) % 4 === 1, 1.4)))}
        {stores.map(([x, y, r, h]) => {
          const c = cylinder(cx, cy, x, y, r, h);
          return (
            <g key={x}>
              <Ln d={c.body} className="bp-ln bp-fill" />
              <Ln d={c.band} className="bp-ln bp-thin" />
              <Ln as="ellipse" {...c.top} className="bp-ln bp-fill" />
            </g>
          );
        })}
        {blocks(cx, cy, [0, 1, 2, 3].map((k) => ({ x: -14, y: 6, w: 28, d: 24, h: 4, z0: k * 7, hot: k === 3 })))}
      </>
    );
  },
  // a pallet of crates, a container, a server rack, the pipeline that builds them and the route out
  delivery: (cx, cy) => (
    <>
      {[0, 1, 2, 3].map((k) => (
        <g key={k}>
          <Ln as="polygon" points={flat(cx, cy, rect(-78 + k * 24, 62, 14, 14))} className={`bp-ln ${k === 3 ? 'bp-hot' : 'bp-thin'}`} />
          {k < 3 && <Ln as="polyline" points={flat(cx, cy, [P(-62 + k * 24, 69), P(-56 + k * 24, 69)])} className="bp-ln bp-thin" />}
        </g>
      ))}
      <Ln as="polyline" points={flat(cx, cy, [P(-20, 30), P(30, 30), P(30, 50), P(92, 50)])} className="bp-dashed bp-hot" strokeDasharray="0.03 0.025" />
      <Ln as="polygon" points={flat(cx, cy, [P(86, 44), P(96, 50), P(86, 56)])} className="bp-ln bp-hot" />
      {blocks(cx, cy, [
        { x: -84, y: -2, w: 24, d: 24, h: 18 },
        { x: -58, y: -2, w: 24, d: 24, h: 18 },
        { x: -84, y: 24, w: 24, d: 24, h: 18 },
        { x: -84, y: -2, w: 24, d: 24, h: 18, z0: 18 },
        { x: -58, y: -2, w: 24, d: 24, h: 18, z0: 18, hot: true },
        { x: -40, y: -82, w: 72, d: 26, h: 24, ribs: 7 }, // the container
        { x: 46, y: -40, w: 26, d: 26, h: 46, shelves: 5 }, // the rack
      ])}
    </>
  ),
};

/**
 * The hero's picture: the system drawn as an architect's exploded axonometric, four plates taken apart floor by floor
 * (interface, service, data, delivery), each with what lives on it drawn in hairlines, a dimension line down the left, a
 * callout to every plate naming it and its most used tools, and a title block in the corner. The lines draw themselves in
 * when the page opens. The plates drift apart a little with the pointer and further as the hero scrolls away; the plate
 * under the pointer is inked in the accent colour with its callout. Decorative: the page says all of it in words.
 */
export default function Blueprint({ labels, techs, className = '' }) {
  const svg = useRef(null);
  const plates = useRef([]);
  const [lit, setLit] = useState(-1);

  useEffect(() => {
    const still = prefersReducedMotion();
    const cur = LAYERS.map(() => ({ x: 0, y: 0 }));
    let raf = 0;
    const tick = () => {
      LAYERS.forEach((_, i) => {
        const depth = 1.5 - i; // the top plate is nearest, the bottom furthest
        const tx = heroStore.pointerX * depth * 5;
        const ty = heroStore.pointerY * depth * 3 + (i - 1.5) * heroStore.scroll * 46;
        cur[i].x += (tx - cur[i].x) * 0.08;
        cur[i].y += (ty - cur[i].y) * 0.08;
        const g = plates.current[i];
        if (g) g.style.transform = `translate(${cur[i].x.toFixed(2)}px, ${cur[i].y.toFixed(2)}px)`;
      });
      raf = requestAnimationFrame(tick);
    };
    if (!still) raf = requestAnimationFrame(tick);

    // the plate under the pointer
    const onMove = (e) => {
      const el = svg.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        setLit(-1);
        return;
      }
      const y = ((e.clientY - r.top) / r.height) * H;
      setLit(plateAt(y, LAYERS.map((_, i) => TOP + i * STEP), HALF));
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  const order = [...LAYERS.keys()].reverse(); // the bottom plate first, so the plates above cover it
  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className={`bp ${className}`} role="presentation" focusable="false">
      {/* the axis every plate is threaded on */}
      <Ln as="line" x1={CX} y1={TOP - 96} x2={CX} y2={TOP + 3 * STEP + 92} className="bp-ln bp-axis" style={{ '--d': '0s' }} />

      {/* the dimension line down the left */}
      <g className="bp-dim" style={{ '--d': '0.2s' }}>
        <Ln as="line" x1={44} y1={TOP} x2={44} y2={TOP + 3 * STEP} className="bp-ln bp-thin" />
        {LAYERS.map((layer, i) => (
          <g key={layer}>
            <Ln as="line" x1={38} y1={TOP + i * STEP} x2={50} y2={TOP + i * STEP} className="bp-ln bp-thin" />
            <Ln as="line" x1={40} y1={TOP + i * STEP + 4} x2={48} y2={TOP + i * STEP - 4} className="bp-ln bp-thin" />
            {i < 3 && (
              <text x={36} y={TOP + i * STEP + STEP / 2} className="bp-text bp-small" textAnchor="end" dominantBaseline="middle">
                L{i + 1}–{i + 2}
              </text>
            )}
          </g>
        ))}
      </g>

      {order.map((i) => {
        const layer = LAYERS[i];
        const cy = TOP + i * STEP;
        const corners = [
          [-S, -S],
          [S, -S],
          [S, S],
          [-S, S],
        ];
        const [rx, ry] = iso(CX, cy, S, -S);
        return (
          <g
            key={layer}
            ref={(el) => {
              plates.current[i] = el;
            }}
            className={`bp-plate${lit === i ? ' is-lit' : ''}`}
            style={{ '--d': `${0.35 + i * 0.28}s` }}
          >
            {/* the slab: its two near edges, then its top */}
            <Ln as="polygon" points={[iso(CX, cy, S, -S), iso(CX, cy, S, S), iso(CX, cy, S, S, -THICK), iso(CX, cy, S, -S, -THICK)].map((p) => p.join(',')).join(' ')} className="bp-ln bp-fill bp-shade" />
            <Ln as="polygon" points={[iso(CX, cy, -S, S), iso(CX, cy, S, S), iso(CX, cy, S, S, -THICK), iso(CX, cy, -S, S, -THICK)].map((p) => p.join(',')).join(' ')} className="bp-ln bp-fill bp-shade" />
            <Ln as="polygon" points={flat(CX, cy, corners)} className="bp-ln bp-fill bp-slab" />
            {/* a fine grid on the slab */}
            {[-S / 2, 0, S / 2].map((v) => (
              <g key={v}>
                <Ln as="polyline" points={flat(CX, cy, [[v, -S], [v, S]])} className="bp-ln bp-grid" />
                <Ln as="polyline" points={flat(CX, cy, [[-S, v], [S, v]])} className="bp-ln bp-grid" />
              </g>
            ))}
            {contents[layer](CX, cy)}
            <circle cx={CX} cy={cy} r="3" className="bp-centre" />

            {/* the callout */}
            <g className="bp-callout">
              <Ln as="polyline" points={`${rx + 4},${ry} ${CX + RIGHT + 30},${ry} ${CX + RIGHT + 42},${ry - 12}`} className="bp-ln bp-thin" />
              <circle cx={rx + 4} cy={ry} r="2" className="bp-node" />
              <text x={CX + RIGHT + 46} y={ry - 16} className="bp-text bp-label">
                <tspan className="bp-no">{pad2(i + 1)}</tspan> {String(labels[layer] ?? layer).toUpperCase()}
              </text>
              <text x={CX + RIGHT + 46} y={ry - 2} className="bp-text bp-small">
                {(techs?.[layer] ?? []).join(' · ')}
              </text>
            </g>
          </g>
        );
      })}

      {/* the title block */}
      <g className="bp-titleblock" style={{ '--d': '1.6s' }}>
        <Ln as="rect" x={W - 244} y={H - 64} width={230} height={50} className="bp-ln bp-thin" />
        <Ln as="line" x1={W - 244} y1={H - 44} x2={W - 14} y2={H - 44} className="bp-ln bp-thin" />
        <Ln as="line" x1={W - 140} y1={H - 44} x2={W - 140} y2={H - 14} className="bp-ln bp-thin" />
        <text x={W - 236} y={H - 50} className="bp-text bp-small">SYSTEM · EXPLODED AXONOMETRIC</text>
        <text x={W - 236} y={H - 25} className="bp-text bp-label">
          DWG <tspan className="bp-no">HK-01</tspan>
        </text>
        <text x={W - 132} y={H - 25} className="bp-text bp-small">SCALE 1:1 · REV {new Date().getFullYear()}</text>
      </g>
    </svg>
  );
}

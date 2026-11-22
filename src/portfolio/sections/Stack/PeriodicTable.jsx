import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LAYERS, getProject } from '../../data/projects';
import { clsx } from '../../../shared/lib/format';
import { elements, fitGrid } from './table';
import { useActiveLayer, useFocusedTech } from './stackStore';

const GAP = 5;
const FAMILY_GAP = 12;
const LEGEND = 34; // the row of families above the table
const MAX_TILE = 84;

/**
 * The Stack section's picture: the stack as a periodic table. Every technology is an element (a symbol of its own, its
 * number how many projects used it), the four layers its families, each a block of its own colour. Pointing at an element
 * (or at its name in the lists beside) turns it over and brings it forward: its full name, how many projects, and which.
 * The layer being read is the family lit; a chosen project leaves only its own elements lit. Decorative: the lists say the same.
 */
export default function PeriodicTable({ stack, words, selected }) {
  const box = useRef(null);
  const [room, setRoom] = useState({ width: 0, height: 0 });
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(null); // the element turned over by the pointer or a tap
  const active = useActiveLayer();
  const focus = useFocusedTech();
  const list = useMemo(() => elements(stack, LAYERS), [stack]);
  const families = useMemo(() => LAYERS.map((layer) => list.filter((e) => e.layer === layer)), [list]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRoom((p) => (p.width === r.width && p.height === r.height ? p : { width: r.width, height: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.15 });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const bottom = room.width >= 900 ? 64 : 8; // the hint under the picture on wide screens
  const grid = fitGrid(
    families.map((f) => f.length),
    room.width,
    Math.max(0, room.height - LEGEND - bottom),
    GAP,
    FAMILY_GAP
  );
  const size = Math.min(MAX_TILE, grid.size);
  const usedText = (n) => words.used(n);

  let order = 0;
  return (
    <div ref={box} className="absolute inset-0 flex flex-col justify-center" style={{ paddingBottom: bottom }}>
      {room.width > 0 && (
        <div className={clsx('pt-table', shown && 'is-shown', size < 46 && 'is-small')} style={{ '--tile': `${size}px`, '--gap': `${GAP}px` }}>
          <div className="pt-legend" style={{ height: LEGEND }}>
            {LAYERS.map((layer, i) => (
              <span key={layer} className={clsx('pt-legend-item', active === i && 'is-active')} style={{ '--fam': `var(--pt-${i})` }}>
                <i />
                {words.layers[layer]}
              </span>
            ))}
          </div>
          {families.map((fam, fi) => (
            <div key={LAYERS[fi]} className="pt-family" style={{ gridTemplateColumns: `repeat(${grid.cols}, var(--tile))`, marginTop: fi ? FAMILY_GAP : 0 }}>
              {fam.map((e, k) => {
                order += 1;
                const key = `${e.layer}:${e.tech}`;
                const mine = !selected || e.slugs.includes(selected);
                const turned = open === key || focus === e.tech;
                const col = k % grid.cols;
                // a tile at an edge grows inward, so it stays in the picture
                const originX = grid.cols === 1 ? 'center' : col === 0 ? 'left' : col === grid.cols - 1 ? 'right' : 'center';
                const originY = fi === LAYERS.length - 1 && k >= fam.length - grid.cols ? 'bottom' : fi === 0 && k < grid.cols ? 'top' : 'center';
                return (
                  <div
                    key={key}
                    className={clsx(
                      'pt-tile',
                      turned && 'is-turned',
                      !mine && 'is-out',
                      selected && mine && 'is-mine',
                      !selected && active === fi && 'is-lit'
                    )}
                    style={{ '--fam': `var(--pt-${fi})`, '--i': order, transformOrigin: `${originX} ${originY}` }}
                    onPointerEnter={(ev) => ev.pointerType === 'mouse' && setOpen(key)}
                    onPointerLeave={(ev) => ev.pointerType === 'mouse' && setOpen((o) => (o === key ? null : o))}
                    onClick={() => setOpen((o) => (o === key ? null : key))}
                  >
                    <div className="pt-flip">
                      <div className="pt-face">
                        <span className="pt-number">{e.number}</span>
                        <span className="pt-symbol">{e.symbol}</span>
                        {size >= 52 && <span className="pt-name">{e.tech}</span>}
                      </div>
                      <div className="pt-face pt-back">
                        <span className="pt-back-name">{e.tech}</span>
                        <span className="pt-back-used">{usedText(e.number)}</span>
                        <span className="pt-back-projects">
                          {e.slugs
                            .slice(0, 3)
                            .map((s) => getProject(s)?.name ?? s)
                            .join(' · ')}
                          {e.slugs.length > 3 ? ` +${e.slugs.length - 3}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

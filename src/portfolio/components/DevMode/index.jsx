import { useEffect, useRef, useState } from 'react';
import { useLang } from '../../i18n';
import { clsx } from '../../../shared/lib/format';
import { gsap } from '../../motion/gsap';
import { sound } from '../../motion/sound';

const COLUMNS = 12;

const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** "h2.font-display.text-h2" for an element, short enough for a label. */
export const describe = (el) => {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = typeof el.className === 'string' ? el.className.split(/\s+/).filter((c) => c && !c.includes(':') && !c.includes('[')).slice(0, 2) : [];
  return `${tag}${id}${classes.map((c) => `.${c}`).join('')}`;
};

const px = (v) => parseFloat(v) || 0;

/**
 * A developer's view of the page, for whoever is curious how it is put together: G lays the column grid
 * over everything, D turns the pointer into an inspector (the box under it with its margin and padding,
 * its name and size, and rulers across the screen), and a click while inspecting pins a numbered marker
 * there, like a comment in a design tool. A small panel shows the frame rate. Esc leaves.
 */
export default function DevMode() {
  const { c } = useLang();
  const d = c.dev;
  const [grid, setGrid] = useState(false);
  const [inspect, setInspect] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [fps, setFps] = useState(60);
  const box = useRef(null);
  const label = useRef(null);
  const ruleX = useRef(null);
  const ruleY = useRef(null);
  const hud = useRef(null);
  const [columns, setColumns] = useState({ left: 0, width: 0, gap: 24 });
  const on = grid || inspect || markers.length > 0;

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(document.activeElement)) return;
      const key = e.key.toLowerCase();
      if (key === 'g') {
        setGrid((v) => !v);
        sound.click();
      } else if (key === 'd') {
        setInspect((v) => !v);
        sound.click();
      } else if (key === 'escape') {
        setGrid(false);
        setInspect(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // the grid follows the page's own content column
  useEffect(() => {
    if (!grid) return undefined;
    const measure = () => {
      const wrap = document.querySelector('main .wrap');
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const s = getComputedStyle(wrap);
      setColumns({ left: r.left + px(s.paddingLeft), width: r.width - px(s.paddingLeft) - px(s.paddingRight), gap: window.innerWidth >= 1024 ? 24 : 16 });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [grid]);

  useEffect(() => {
    if (!on) return undefined;
    gsap.fromTo(hud.current, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out' });
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const count = (now) => {
      frames += 1;
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(count);
    };
    raf = requestAnimationFrame(count);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  useEffect(() => {
    if (!inspect) return undefined;
    let target = null;
    let x = 0;
    let y = 0;
    let raf = 0;
    const paint = () => {
      raf = 0;
      ruleX.current.style.transform = `translateY(${y}px)`;
      ruleY.current.style.transform = `translateX(${x}px)`;
      if (!target) return;
      const r = target.getBoundingClientRect();
      const s = getComputedStyle(target);
      const b = box.current;
      b.style.transform = `translate(${r.left}px, ${r.top}px)`;
      b.style.width = `${r.width}px`;
      b.style.height = `${r.height}px`;
      // margin outside the box, padding inside it, drawn as borders of the two layers
      b.firstChild.style.borderWidth = `${px(s.marginTop)}px ${px(s.marginRight)}px ${px(s.marginBottom)}px ${px(s.marginLeft)}px`;
      b.firstChild.style.inset = `-${px(s.marginTop)}px -${px(s.marginRight)}px -${px(s.marginBottom)}px -${px(s.marginLeft)}px`;
      b.lastChild.style.borderWidth = `${px(s.paddingTop)}px ${px(s.paddingRight)}px ${px(s.paddingBottom)}px ${px(s.paddingLeft)}px`;
      label.current.textContent = `${describe(target)}  ${Math.round(r.width)} × ${Math.round(r.height)}`;
      label.current.style.transform = `translate(${Math.min(window.innerWidth - 280, Math.max(6, r.left))}px, ${r.top > 30 ? r.top - 26 : r.bottom + 6}px)`;
      label.current.dataset.pos = `${Math.round(x)}, ${Math.round(y)}`;
    };
    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      const el = document.elementFromPoint(x, y);
      target = el && !el.closest('[data-devmode]') ? el : target;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onClick = (e) => {
      if (e.target.closest('[data-devmode]')) return;
      e.preventDefault();
      e.stopPropagation();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      sound.tick();
      setMarkers((m) => [...m, { x: e.pageX, y: e.pageY, what: el ? describe(el) : '' }]);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('click', onClick, true);
    document.documentElement.classList.add('dev-inspect');
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('click', onClick, true);
      document.documentElement.classList.remove('dev-inspect');
    };
  }, [inspect]);

  const colWidth = (columns.width - columns.gap * (COLUMNS - 1)) / COLUMNS;

  return (
    <div data-devmode aria-hidden={!on} className={clsx(!on && 'hidden')}>
      {grid && (
        <div className="pointer-events-none fixed inset-0 z-[88]">
          {Array.from({ length: COLUMNS }, (_, i) => (
            <i
              key={i}
              className="absolute inset-y-0 border-x border-signal/40 bg-signal/[0.06]"
              style={{ left: columns.left + i * (colWidth + columns.gap), width: colWidth }}
            />
          ))}
          <i className="absolute inset-0 [background-image:linear-gradient(rgb(255_91_46/0.12)_1px,transparent_1px)] [background-size:100%_8px]" />
        </div>
      )}

      {inspect && (
        <div className="pointer-events-none fixed inset-0 z-[89]">
          <i ref={ruleX} className="absolute inset-x-0 top-0 h-px bg-signal/50" />
          <i ref={ruleY} className="absolute inset-y-0 left-0 w-px bg-signal/50" />
          <div ref={box} className="absolute top-0 left-0 outline outline-1 outline-signal">
            <i className="absolute border-solid border-[#f0b45a]/30" />
            <i className="absolute inset-0 border-solid border-[#7fd6a2]/30 bg-[#6ab0ff]/10" />
          </div>
          <p
            ref={label}
            className="absolute top-0 left-0 rounded bg-signal px-2 py-1 font-mono text-[0.68rem] whitespace-nowrap text-ink-0 after:ml-3 after:opacity-70 after:content-[attr(data-pos)]"
          />
        </div>
      )}

      {/* the pins live on the page, so they scroll with it */}
      <div className="pointer-events-none absolute top-0 left-0 z-[87]">
        {markers.map((m, i) => (
          <span
            key={i}
            className="absolute flex -translate-y-full items-end gap-1.5"
            style={{ left: m.x, top: m.y }}
          >
            <b className="grid size-7 place-items-center rounded-full rounded-bl-none bg-signal font-mono text-[0.7rem] text-ink-0 shadow-pop">{i + 1}</b>
            <small className="mb-1 rounded bg-ink-0/85 px-1.5 py-0.5 font-mono text-[0.62rem] text-bone-dim">{m.what}</small>
          </span>
        ))}
      </div>

      {on && (
        <div
          ref={hud}
          className="fixed bottom-4 left-4 z-[90] flex flex-wrap items-center gap-2 rounded-full border border-line-strong bg-ink-0/90 py-1.5 pr-1.5 pl-4 font-mono text-[0.7rem] text-bone-dim shadow-pop backdrop-blur"
        >
          <b className="text-signal">{d.title}</b>
          <span className={fps < 45 ? 'text-warn' : 'text-ok'}>
            {fps} {d.fps}
          </span>
          <span className="hidden lg:inline">{d.help}</span>
          {[
            [d.grid, grid, () => setGrid((v) => !v)],
            [d.inspect, inspect, () => setInspect((v) => !v)],
          ].map(([text, active, toggle]) => (
            <button
              key={text}
              type="button"
              aria-pressed={active}
              onClick={toggle}
              className={clsx('rounded-full px-3 py-1', active ? 'bg-signal text-ink-0' : 'bg-ink-2 text-bone hover:bg-ink-3')}
            >
              {text}
            </button>
          ))}
          {markers.length > 0 && (
            <button type="button" onClick={() => setMarkers([])} className="rounded-full bg-ink-2 px-3 py-1 text-bone hover:bg-ink-3">
              {d.clear} {markers.length}
            </button>
          )}
          <button
            type="button"
            aria-label="Esc"
            onClick={() => {
              setGrid(false);
              setInspect(false);
              setMarkers([]);
            }}
            className="grid size-7 place-items-center rounded-full bg-ink-2 text-bone hover:bg-ink-3"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

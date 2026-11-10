import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  BookHeart,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Eraser,
  Eye,
  EyeOff,
  Grid3x3,
  Hand,
  Highlighter,
  ImagePlus,
  Layers,
  Maximize,
  Minus,
  Move,
  MoveUpRight,
  MoreHorizontal,
  NotebookPen,
  PaintBucket,
  Palette,
  Pencil,
  Pipette,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Slash,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { clsx } from '../../../lib/format';
import { tr } from '../lang';
import { PaintEngine } from './engine';
import { PALETTE, fitView, zoomAt } from './model';
import { newDrawingId, saveDrawing } from './store';
import { sendToDiary, sendToNote } from './share';

// The drawing screen: a full-screen workspace with the tools on one side, the colours and layers on the other (under a button on a
// phone), and the drawing in the middle, which can be zoomed and moved. It saves by itself a moment after every change.

const TOOLS = [
  { id: 'pen', icon: Pencil, label: tr('Pen'), key: 'p' },
  { id: 'marker', icon: Highlighter, label: tr('Highlighter'), key: 'h' },
  { id: 'eraser', icon: Eraser, label: tr('Eraser'), key: 'e' },
  { id: 'fill', icon: PaintBucket, label: tr('Fill'), key: 'g' },
  { id: 'pick', icon: Pipette, label: tr('Pick a colour'), key: 'i' },
  { id: 'line', icon: Slash, label: tr('Line'), key: 'l' },
  { id: 'arrow', icon: MoveUpRight, label: tr('Arrow'), key: 'a' },
  { id: 'rect', icon: Square, label: tr('Rectangle'), key: 'r' },
  { id: 'ellipse', icon: Circle, label: tr('Ellipse'), key: 'o' },
  { id: 'text', icon: Type, label: tr('Text'), key: 't' },
  { id: 'move', icon: Move, label: tr('Move the layer'), key: 'v' },
  { id: 'pan', icon: Hand, label: tr('Hand'), key: 'm' },
];
const SHAPE_TOOLS = ['rect', 'ellipse'];

/** The engine's changes as a number that goes up, so React draws again whenever the engine says so. */
const useEngine = (engine) => useSyncExternalStore(
  useCallback((fn) => (engine ? engine.subscribe(fn) : () => {}), [engine]),
  () => engine?.stamp ?? 0
);

const checker = 'repeating-conic-gradient(#d9d9de 0% 25%, #f5f5f7 0% 50%) 0 0 / 24px 24px';

function ToolButton({ tool, active, onPick, row }) {
  const Icon = tool.icon;
  return (
    <button type="button" onClick={() => onPick(tool.id)} aria-label={tool.label} aria-pressed={active} title={`${tool.label} (${tool.key.toUpperCase()})`} className={clsx('paint-tool grid shrink-0 place-items-center rounded-xl transition-colors', row ? 'size-11' : 'size-10', active ? 'bg-signal text-ink-0' : 'text-bone-dim hover:bg-wash/10 hover:text-bone')} data-tool={tool.id}>
      <Icon size={19} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
    </button>
  );
}

/** Colours: the current one, a palette, and any colour at all. */
function ColorPanel({ engine }) {
  const color = engine.color;
  const hidden = useRef(null);
  return (
    <section aria-label={tr('Colour')}>
      <p className="mb-2 font-mono text-[0.62rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Colour')}</p>
      <div className="grid grid-cols-8 gap-1.5">
        {PALETTE.map((c) => (
          <button key={c} type="button" onClick={() => engine.setColor(c)} aria-label={c} aria-pressed={color === c} className={clsx('aspect-square rounded-full border transition-transform active:scale-90', color === c ? 'scale-110 border-bone ring-2 ring-signal/60' : 'border-line-strong')} style={{ background: c }} />
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <button type="button" onClick={() => hidden.current?.click()} className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-line-strong" style={{ background: color }} aria-label={tr('Any colour')}>
          <Palette size={16} className="mix-blend-difference text-white" aria-hidden="true" />
          <input ref={hidden} type="color" value={color} onChange={(e) => engine.setColor(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" tabIndex={-1} />
        </button>
        <code className="font-mono text-[0.72rem] text-bone-dim uppercase">{color}</code>
      </div>
    </section>
  );
}

/** How thick the line is, with a dot that shows it. */
function SizePanel({ engine }) {
  const showFill = SHAPE_TOOLS.includes(engine.tool);
  return (
    <section aria-label={tr('Size')}>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[0.62rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Size')}</p>
        <span className="font-mono text-[0.72rem] text-bone-dim tabular-nums">{engine.size}</span>
      </div>
      <div className="flex items-center gap-3">
        <input type="range" min="1" max="80" value={engine.size} onChange={(e) => engine.setSize(Number(e.target.value))} aria-label={tr('Size')} className="paint-range min-w-0 flex-1" />
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-ink-2">
          <i className="block rounded-full" style={{ width: Math.min(34, Math.max(3, engine.size)), height: Math.min(34, Math.max(3, engine.size)), background: engine.tool === 'eraser' ? 'var(--color-bone-faint)' : engine.color }} />
        </span>
      </div>
      {showFill && (
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-fine text-bone-dim">
          <input type="checkbox" checked={engine.fill} onChange={(e) => engine.setFill(e.target.checked)} className="size-4 accent-[var(--color-signal)]" /> {tr('Filled shape')}
        </label>
      )}
    </section>
  );
}

/** The layers, the top one first: show or hide, choose, move, take out, and how see-through. */
function LayersPanel({ engine }) {
  const rows = [...engine.layers].reverse();
  const dragStart = useRef(1);
  return (
    <section aria-label={tr('Layers')} className="flex min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[0.62rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Layers')}</p>
        <button type="button" onClick={() => engine.addLayer()} className="inline-flex h-7 items-center gap-1 rounded-full border border-line-strong px-2.5 font-mono text-[0.68rem] text-bone-dim hover:text-bone active:scale-95" data-add-layer>
          <Plus size={12} aria-hidden="true" /> {tr('New layer')}
        </button>
      </div>
      <ul className="flex min-h-0 flex-col gap-1.5 overflow-y-auto">
        {rows.map((layer, i) => {
          const chosen = layer.id === engine.activeId;
          return (
            <li key={layer.id}>
              <div className={clsx('flex items-center gap-1.5 rounded-xl border px-1.5 py-1.5 transition-colors', chosen ? 'border-signal bg-signal-soft' : 'border-line bg-ink-2/60')}>
                <button type="button" onClick={() => engine.setLayer(layer.id, { visible: !layer.visible })} aria-label={layer.visible ? tr('Hide layer') : tr('Show layer')} className="grid size-7 shrink-0 place-items-center rounded-lg text-bone-dim hover:text-bone">
                  {layer.visible ? <Eye size={15} aria-hidden="true" /> : <EyeOff size={15} aria-hidden="true" />}
                </button>
                <button type="button" onClick={() => engine.setActive(layer.id)} className="min-w-0 flex-1 truncate text-left text-fine text-bone" aria-pressed={chosen} onDoubleClick={() => {
                  const name = window.prompt(tr('Name of the layer'), layer.name);
                  if (name?.trim()) engine.setLayer(layer.id, { name: name.trim().slice(0, 40) });
                }}>
                  {layer.name}
                </button>
                <button type="button" onClick={() => engine.shiftLayer(layer.id, 1)} disabled={i === 0} aria-label={tr('Move the layer up')} className="grid size-6 place-items-center rounded-md text-bone-faint hover:text-bone disabled:opacity-25">
                  <ChevronUp size={14} aria-hidden="true" />
                </button>
                <button type="button" onClick={() => engine.shiftLayer(layer.id, -1)} disabled={i === rows.length - 1} aria-label={tr('Move the layer down')} className="grid size-6 place-items-center rounded-md text-bone-faint hover:text-bone disabled:opacity-25">
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
              </div>
              {chosen && (
                <div className="mt-1.5 flex items-center gap-2 px-1.5">
                  <span className="font-mono text-[0.6rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Opacity')}</span>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={Math.round(layer.opacity * 100)}
                    onPointerDown={() => {
                      dragStart.current = layer.opacity;
                    }}
                    onChange={(e) => engine.previewOpacity(layer.id, Number(e.target.value) / 100)}
                    onPointerUp={() => engine.commitOpacity(layer.id, dragStart.current, layer.opacity)}
                    onKeyUp={() => engine.commitOpacity(layer.id, dragStart.current, layer.opacity)}
                    aria-label={tr('Opacity')}
                    className="paint-range min-w-0 flex-1"
                  />
                  <button type="button" onClick={() => engine.removeLayer(layer.id)} disabled={engine.layers.length < 2} aria-label={tr('Delete layer')} className="grid size-7 place-items-center rounded-lg text-bone-faint hover:text-danger disabled:opacity-25">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** A small menu that opens under a button. */
function Menu({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!e.target.closest?.('[data-paint-menu]')) onClose();
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div data-paint-menu className="absolute top-full right-0 z-30 mt-2 flex w-60 animate-fade-in flex-col gap-0.5 rounded-2xl border border-line-strong bg-ink-1 p-1.5 shadow-pop">
      {children}
    </div>
  );
}

const MenuItem = ({ icon: Icon, children, onClick, danger }) => (
  <button type="button" onClick={onClick} className={clsx('flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-fine transition-colors hover:bg-wash/10', danger ? 'text-danger' : 'text-bone')}>
    <Icon size={16} aria-hidden="true" /> {children}
  </button>
);

/**
 * `source` is `{ record }` (a drawing kept in the library) or `{ create: { width, height, background, name, image? } }` (a new one,
 * with a picture to draw over, maybe). `onClose` is called once it has been saved.
 */
export default function PaintEditor({ source, onClose, onNotify }) {
  const [engine, setEngine] = useState(null);
  const [failed, setFailed] = useState('');
  const [name, setName] = useState(() => source.record?.name ?? source.create?.name ?? '');
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const [panel, setPanel] = useState(null); // 'color' | 'layers' | null (phone sheets)
  const [menu, setMenu] = useState(false);
  const [grid, setGrid] = useState(false);
  const [saved, setSaved] = useState('saved'); // saved | saving | dirty
  const [textEdit, setTextEdit] = useState(null); // { x, y } in the drawing's pixels, while text is being typed
  const [space, setSpace] = useState(false);
  const stageRef = useRef(null);
  const hostRef = useRef(null);
  const fileRef = useRef(null);
  const id = useRef(source.record?.id ?? newDrawingId());
  const created = useRef(source.record?.createdAt ?? Date.now());
  const fitted = useRef(true);
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const drawing = useRef(false);
  const panning = useRef(null);
  const textAt = useRef(null);
  const savedVersion = useRef(0);
  const nameRef = useRef(name);
  nameRef.current = name;
  const stamp = useEngine(engine);

  // ---- opening ----
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const made = source.record ? await PaintEngine.fromRecord(source.record) : await PaintEngine.create(source.create);
        if (!live) return;
        if (source.create?.image) made.version = 1; // a picture opened to draw on is worth keeping at once
        setEngine(made);
      } catch {
        if (live) setFailed(tr('This drawing could not be opened.'));
      }
    })();
    return () => {
      live = false;
    };
    // the source of an editor never changes: a new one is opened with a new key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- view ----
  const stageSize = () => {
    const box = stageRef.current?.getBoundingClientRect();
    return { width: box?.width ?? 800, height: box?.height ?? 600 };
  };
  const fit = useCallback(() => {
    if (!engine) return;
    fitted.current = true;
    setView(fitView(stageSize(), engine, 28));
  }, [engine]);

  useEffect(() => {
    if (!engine) return undefined;
    engine.attach(hostRef.current);
    fit();
    const observer = new ResizeObserver(() => {
      if (fitted.current) setView(fitView(stageSize(), engine, 28));
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [engine, fit]);

  // a quarter turn swaps the sides (by the button, or by undo and redo): show the whole drawing again the other way up
  const shape = engine ? `${engine.width}x${engine.height}` : '';
  const lastShape = useRef(shape);
  useEffect(() => {
    if (!shape || lastShape.current === shape) return;
    lastShape.current = shape;
    fit();
  }, [shape, fit]);

  const rotate = (turn) => {
    setMenu(false);
    setTextEdit(null);
    engine?.rotate(turn);
  };

  // the wheel zooms about the cursor (a trackpad pinch arrives as a wheel with Ctrl held)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !engine) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const box = stage.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
      fitted.current = false;
      setView((v) => zoomAt(v, v.k * factor, e.clientX - box.left, e.clientY - box.top));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [engine]);

  // ---- saving ----
  const save = useCallback(async () => {
    if (!engine || engine.version === savedVersion.current) return;
    const version = engine.version;
    setSaved('saving');
    try {
      const record = await engine.toRecord({ id: id.current, name: nameRef.current.trim() || tr('Drawing'), createdAt: created.current });
      await saveDrawing(record);
      savedVersion.current = version;
      setSaved(engine.version === version ? 'saved' : 'dirty');
    } catch {
      setSaved('dirty');
      onNotify?.(tr('The drawing could not be saved.'));
    }
  }, [engine, onNotify]);

  useEffect(() => {
    if (!engine || engine.version === savedVersion.current) return undefined;
    setSaved('dirty');
    const timer = window.setTimeout(() => void save(), 1400);
    return () => window.clearTimeout(timer);
  }, [engine, stamp, name, save]);

  useEffect(() => {
    const away = () => document.visibilityState === 'hidden' && void save();
    document.addEventListener('visibilitychange', away);
    return () => document.removeEventListener('visibilitychange', away);
  }, [save]);

  const close = async () => {
    await save();
    onClose();
  };

  // ---- pointer: draw, pan, pinch ----
  const toDoc = (e) => {
    const box = stageRef.current.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (e.clientX - box.left - v.x) / v.k, y: (e.clientY - box.top - v.y) / v.k, pressure: e.pressure, type: e.pointerType };
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), view: viewRef.current, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
  };

  const down = (e) => {
    if (!engine || textEdit) return;
    stageRef.current.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      engine.cancel();
      drawing.current = false;
      panning.current = null;
      startPinch();
      return;
    }
    if (pointers.current.size > 2) return;
    const handMove = e.button === 1 || space || engine.tool === 'pan';
    if (handMove) {
      panning.current = { x: e.clientX, y: e.clientY, view: viewRef.current };
      return;
    }
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const p = toDoc(e);
    if (engine.tool === 'text') {
      textAt.current = p; // the box is opened when the finger is up: opened now, the click's own focus change would shut it at once
      return;
    }
    drawing.current = engine.begin(p);
  };

  const moveTo = (e) => {
    if (!engine) return;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const box = stageRef.current.getBoundingClientRect();
      const g = gesture.current;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      fitted.current = false;
      const zoomed = zoomAt(g.view, g.view.k * (dist / (g.dist || 1)), g.mid.x - box.left, g.mid.y - box.top);
      setView({ ...zoomed, x: zoomed.x + (mid.x - g.mid.x), y: zoomed.y + (mid.y - g.mid.y) });
      return;
    }
    if (panning.current) {
      fitted.current = false;
      const start = panning.current;
      setView({ ...start.view, x: start.view.x + (e.clientX - start.x), y: start.view.y + (e.clientY - start.y) });
      return;
    }
    if (drawing.current) {
      const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
      for (const part of events.length ? events : [e.nativeEvent]) engine.move(toDoc(part), e.shiftKey);
    }
  };

  const up = (e) => {
    pointers.current.delete(e.pointerId);
    if (gesture.current && pointers.current.size < 2) gesture.current = null;
    panning.current = null;
    if (textAt.current) {
      setTextEdit({ x: textAt.current.x, y: textAt.current.y });
      textAt.current = null;
    }
    if (drawing.current && pointers.current.size === 0) {
      drawing.current = false;
      engine?.end();
    }
  };

  // ---- text ----
  const commitText = (value) => {
    if (textEdit && value.trim()) engine.addText(textEdit.x, textEdit.y, value);
    setTextEdit(null);
  };

  // ---- keyboard ----
  useEffect(() => {
    if (!engine) return undefined;
    const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName ?? '') && e.target.type !== 'range' && e.target.type !== 'checkbox';
    const onKey = (e) => {
      if (typing(e)) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) engine.redo();
        else engine.undo();
      } else if (mod && key === 'y') {
        e.preventDefault();
        engine.redo();
      } else if (e.key === ' ') {
        e.preventDefault();
        setSpace(true);
      } else if (!mod && key === '[') engine.setSize(Math.max(1, engine.size - (engine.size > 12 ? 4 : 1)));
      else if (!mod && key === ']') engine.setSize(Math.min(80, engine.size + (engine.size >= 12 ? 4 : 1)));
      else if (!mod) {
        const tool = TOOLS.find((t) => t.key === key);
        if (tool) engine.setTool(tool.id);
      }
    };
    const onUp = (e) => e.key === ' ' && setSpace(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onUp);
    };
  }, [engine]);

  // ---- pictures in: the button, and a paste ----
  const addPicture = useCallback(
    async (file) => {
      if (!engine || !file?.type?.startsWith('image/')) return;
      try {
        const bitmap = await createImageBitmap(file);
        engine.addImageLayer(bitmap);
        bitmap.close?.();
      } catch {
        onNotify?.(tr('That picture could not be opened.'));
      }
    },
    [engine, onNotify]
  );

  useEffect(() => {
    const onPaste = (e) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
      if (file) {
        e.preventDefault();
        void addPicture(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addPicture]);

  // ---- sending ----
  const send = async (where) => {
    setMenu(false);
    try {
      const png = await engine.toPng();
      onNotify?.(await (where === 'note' ? sendToNote(png, nameRef.current.trim() || tr('Drawing')) : sendToDiary(png)));
    } catch {
      onNotify?.(tr('That did not work. Try again.'));
    }
  };

  const tool = TOOLS.find((t) => t.id === engine?.tool);
  const cursor = space || engine?.tool === 'pan' ? 'grab' : engine?.tool === 'text' ? 'text' : engine?.tool === 'move' ? 'move' : 'crosshair';
  const status = { saved: tr('Saved'), saving: tr('Saving…'), dirty: tr('Unsaved') }[saved];

  // worked out every time: a quarter turn changes the drawing's sides without a new engine
  const hostStyle = engine ? { width: engine.width, height: engine.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, background: engine.background ?? checker } : {};

  const picked = (id2) => {
    engine.setTool(id2);
    if (id2 === 'text') setTextEdit(null);
  };

  const phoneBar = (
    <div className="no-scrollbar flex items-center gap-1 overflow-x-auto px-2 py-1.5 lg:hidden">
      <button type="button" onClick={() => setPanel(panel === 'color' ? null : 'color')} aria-label={tr('Colour')} aria-pressed={panel === 'color'} className="grid size-11 shrink-0 place-items-center rounded-xl border border-line-strong" data-open-color>
        <i className="block size-6 rounded-full border border-line-strong" style={{ background: engine?.color }} />
      </button>
      <button type="button" onClick={() => setPanel(panel === 'layers' ? null : 'layers')} aria-label={tr('Layers')} aria-pressed={panel === 'layers'} className={clsx('grid size-11 shrink-0 place-items-center rounded-xl', panel === 'layers' ? 'bg-signal text-ink-0' : 'text-bone-dim')} data-open-layers>
        <Layers size={19} aria-hidden="true" />
      </button>
      <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden="true" />
      {engine && TOOLS.map((t) => <ToolButton key={t.id} tool={t} active={engine.tool === t.id} onPick={picked} row />)}
    </div>
  );

  const ui = (
    <div className="fixed inset-0 z-[90] flex flex-col bg-ink-0 text-bone" data-paint-editor>
      {/* top bar */}
      <header className="relative z-20 flex items-center gap-1.5 border-b border-line bg-ink-1 px-2 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
        <button type="button" onClick={close} aria-label={tr('Back to the drawings')} className="grid size-10 shrink-0 place-items-center rounded-xl text-bone-dim hover:bg-wash/10 hover:text-bone" data-close-paint>
          <ArrowLeft size={19} aria-hidden="true" />
        </button>
        <input value={name} onChange={(e) => {
          setName(e.target.value.slice(0, 60));
          engine?.touch();
        }} aria-label={tr('Name of the drawing')} placeholder={tr('Drawing')} className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 font-display text-[1.15rem] text-bone outline-none placeholder:text-bone-faint focus:bg-wash/5 sm:max-w-xs sm:flex-none" />
        <span className={clsx('hidden items-center gap-1 font-mono text-[0.66rem] sm:flex', saved === 'saved' ? 'text-ok' : 'text-bone-faint')} role="status" data-save-state={saved}>
          {saved === 'saved' && <Check size={12} aria-hidden="true" />} {status}
        </span>
        <span className="flex-1 max-sm:hidden" />
        <button type="button" onClick={() => engine?.undo()} disabled={!engine?.canUndo} aria-label={tr('Undo')} title={`${tr('Undo')} (Ctrl+Z)`} className="grid size-10 place-items-center rounded-xl text-bone-dim hover:bg-wash/10 hover:text-bone disabled:opacity-30" data-undo>
          <Undo2 size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => engine?.redo()} disabled={!engine?.canRedo} aria-label={tr('Redo')} title={`${tr('Redo')} (Ctrl+Shift+Z)`} className="grid size-10 place-items-center rounded-xl text-bone-dim hover:bg-wash/10 hover:text-bone disabled:opacity-30" data-redo>
          <Redo2 size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={fit} aria-label={tr('Fit to the screen')} title={tr('Fit to the screen')} className="hidden h-10 items-center gap-1.5 rounded-xl px-2.5 font-mono text-[0.72rem] text-bone-dim tabular-nums hover:bg-wash/10 hover:text-bone sm:inline-flex">
          <Maximize size={14} aria-hidden="true" /> {Math.round(view.k * 100)}%
        </button>
        <button type="button" onClick={() => rotate(1)} disabled={!engine} aria-label={tr('Turn it a quarter turn')} title={tr('Turn it a quarter turn (wide ↔ tall)')} className="grid size-10 place-items-center rounded-xl text-bone-dim hover:bg-wash/10 hover:text-bone disabled:opacity-30" data-rotate>
          <RotateCw size={18} aria-hidden="true" />
        </button>
        <div className="relative" data-paint-menu>
          <button type="button" onClick={() => setMenu(!menu)} aria-label={tr('More')} aria-expanded={menu} className="grid size-10 place-items-center rounded-xl text-bone-dim hover:bg-wash/10 hover:text-bone" data-paint-more>
            <MoreHorizontal size={19} aria-hidden="true" />
          </button>
          <Menu open={menu} onClose={() => setMenu(false)}>
            <MenuItem icon={ImagePlus} onClick={() => { setMenu(false); fileRef.current?.click(); }}>
              {tr('Add a picture')}
            </MenuItem>
            <MenuItem icon={RotateCw} onClick={() => rotate(1)}>
              {tr('Turn right')}
            </MenuItem>
            <MenuItem icon={RotateCcw} onClick={() => rotate(-1)}>
              {tr('Turn left')}
            </MenuItem>
            <MenuItem icon={Grid3x3} onClick={() => { setGrid(!grid); setMenu(false); }}>
              {grid ? tr('Hide the grid') : tr('Show the grid')}
            </MenuItem>
            <MenuItem icon={NotebookPen} onClick={() => send('note')}>
              {tr('Send to a new note')}
            </MenuItem>
            <MenuItem icon={BookHeart} onClick={() => send('diary')}>
              {tr("Add to today's diary")}
            </MenuItem>
            <MenuItem icon={Minus} danger onClick={() => { setMenu(false); engine?.clearLayer(); }}>
              {tr('Clear this layer')}
            </MenuItem>
          </Menu>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void addPicture(e.target.files?.[0]); e.target.value = ''; }} />
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* the tools, on the left (on a phone they are along the bottom) */}
        <nav aria-label={tr('Tools')} className="no-scrollbar hidden w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-line bg-ink-1 py-2 lg:flex">
          {engine && TOOLS.map((t) => <ToolButton key={t.id} tool={t} active={engine.tool === t.id} onPick={picked} />)}
        </nav>

        {/* the drawing */}
        <div
          ref={stageRef}
          className="paint-stage relative min-w-0 flex-1 touch-none overflow-hidden bg-ink-2 select-none"
          style={{ cursor }}
          onPointerDown={down}
          onPointerMove={moveTo}
          onPointerUp={up}
          onPointerCancel={up}
          data-paint-stage
        >
          {!engine && !failed && <p className="absolute inset-0 grid place-items-center font-mono text-fine text-bone-faint">{tr('Opening the drawing…')}</p>}
          {failed && <p className="absolute inset-0 grid place-items-center px-6 text-center text-fine text-danger" role="alert">{failed}</p>}
          <div ref={hostRef} className="paint-doc absolute top-0 left-0 origin-top-left shadow-[0_18px_60px_-20px_rgb(0_0_0/0.6)]" style={hostStyle} data-paint-doc />
          {engine && grid && (
            <div className="pointer-events-none absolute top-0 left-0 origin-top-left" style={{ width: engine.width, height: engine.height, transform: hostStyle.transform, backgroundImage: 'linear-gradient(rgb(128 128 140 / 0.35) 1px, transparent 1px), linear-gradient(90deg, rgb(128 128 140 / 0.35) 1px, transparent 1px)', backgroundSize: '40px 40px' }} aria-hidden="true" />
          )}
          {textEdit && engine && (
            <textarea
              autoFocus
              aria-label={tr('Text')}
              rows={2}
              placeholder={tr('Type here')}
              onBlur={(e) => commitText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setTextEdit(null);
                else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  commitText(e.currentTarget.value);
                }
                e.stopPropagation();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute z-10 min-w-24 resize-none rounded-md border border-dashed border-signal bg-transparent p-0 leading-[1.2] font-semibold outline-none"
              style={{ left: view.x + textEdit.x * view.k, top: view.y + textEdit.y * view.k, color: engine.color, fontSize: Math.max(16, engine.size * 4) * view.k }}
            />
          )}
          {engine && (engine.active && !engine.active.visible) && <p className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-ink-1/90 px-3 py-1.5 font-mono text-[0.72rem] text-warn">{tr('This layer is hidden')}</p>}
          {engine && tool && <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink-1/80 px-3 py-1 font-mono text-[0.66rem] text-bone-dim backdrop-blur max-lg:hidden">{tool.label}</p>}
        </div>

        {/* colours, size and layers, on the right */}
        <aside className="hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto border-l border-line bg-ink-1 p-4 lg:flex" aria-label={tr('Colour, size and layers')}>
          {engine && (
            <>
              <ColorPanel engine={engine} />
              <SizePanel engine={engine} />
              <LayersPanel engine={engine} />
            </>
          )}
        </aside>
      </div>

      {/* on a phone: the sheet for colours and size, or for layers, over the tools */}
      {engine && panel && (
        <div className="max-h-[46dvh] shrink-0 animate-sheet-up overflow-y-auto border-t border-line bg-ink-1 p-4 lg:hidden" data-paint-sheet={panel}>
          {panel === 'color' ? (
            <div className="flex flex-col gap-5">
              <ColorPanel engine={engine} />
              <SizePanel engine={engine} />
            </div>
          ) : (
            <LayersPanel engine={engine} />
          )}
        </div>
      )}
      <div className="shrink-0 border-t border-line bg-ink-1 pb-[env(safe-area-inset-bottom)] lg:hidden">{phoneBar}</div>
    </div>
  );

  return createPortal(ui, document.body);
}


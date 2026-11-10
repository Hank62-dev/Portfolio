import { useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Palette, Plus, Trash2 } from 'lucide-react';
import { clsx } from '../../../shared/lib/format';
import { tr } from '../../core/i18n/lang';
import { PALETTE } from './model';

// The side parts of the drawing screen (PaintEditor): the tool buttons, the colour, size and layer panels, the menu.

export const SHAPE_TOOLS = ['rect', 'ellipse'];

export function ToolButton({ tool, active, onPick, row }) {
  const Icon = tool.icon;
  return (
    <button type="button" onClick={() => onPick(tool.id)} aria-label={tool.label} aria-pressed={active} title={`${tool.label} (${tool.key.toUpperCase()})`} className={clsx('paint-tool grid shrink-0 place-items-center rounded-xl transition-colors', row ? 'size-11' : 'size-10', active ? 'bg-signal text-ink-0' : 'text-bone-dim hover:bg-wash/10 hover:text-bone')} data-tool={tool.id}>
      <Icon size={19} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
    </button>
  );
}

/** Colours: the current one, a palette, and any colour at all. */
export function ColorPanel({ engine }) {
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
export function SizePanel({ engine }) {
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
export function LayersPanel({ engine }) {
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
export function Menu({ open, onClose, children }) {
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

export const MenuItem = ({ icon: Icon, children, onClick, danger }) => (
  <button type="button" onClick={onClick} className={clsx('flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-fine transition-colors hover:bg-wash/10', danger ? 'text-danger' : 'text-bone')}>
    <Icon size={16} aria-hidden="true" /> {children}
  </button>
);

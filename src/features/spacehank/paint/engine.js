import { tr } from '../lang.js';
import { HISTORY_LIMIT, bboxOf, cropData, floodRegion, hexToRgba, layerAfterRemoving, moveLayer, newLayerMeta, nextLayerName, paintMask } from './model.js';

// The drawing itself: a stack of canvases (one for each layer) with the tools that draw on them, the undo history, and the way
// to turn it all into a picture or into a record to keep. It knows nothing about React; the editor listens to it with `subscribe`
// and gives it points in the drawing's own pixels. Layers are kept in paint order: the first is the bottom.

const HIGHLIGHT_ALPHA = 0.4;
const FILL_TOLERANCE = 32;

const canvasOf = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none';
  return canvas;
};

const asImageData = (part) => new ImageData(new Uint8ClampedArray(part.data), part.width, part.height);

const toBlob = (canvas, type = 'image/png', quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The picture could not be made'))), type, quality);
  });

/** Pulls the second point onto a straight line at a multiple of 45 degrees, or onto a square: for a drawn shape held with Shift. */
const constrain = (tool, a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (tool === 'rect' || tool === 'ellipse') {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: a.x + Math.sign(dx || 1) * side, y: a.y + Math.sign(dy || 1) * side };
  }
  const step = Math.PI / 4;
  const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  const length = Math.hypot(dx, dy);
  return { x: a.x + Math.cos(angle) * length, y: a.y + Math.sin(angle) * length };
};

const drawShape = (ctx, tool, a, b, { color, size, fill }) => {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (tool === 'rect') {
    ctx.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    if (fill) ctx.fill();
    else ctx.stroke();
  } else if (tool === 'ellipse') {
    ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
    if (fill) ctx.fill();
    else ctx.stroke();
  } else {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    if (tool === 'arrow' && (a.x !== b.x || a.y !== b.y)) {
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const head = Math.max(14, size * 3.4);
      ctx.beginPath();
      ctx.moveTo(b.x - Math.cos(angle - 0.5) * head, b.y - Math.sin(angle - 0.5) * head);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(b.x - Math.cos(angle + 0.5) * head, b.y - Math.sin(angle + 0.5) * head);
      ctx.stroke();
    }
  }
  ctx.restore();
};

const SHAPES = ['line', 'arrow', 'rect', 'ellipse'];

export class PaintEngine {
  constructor({ width, height, background = '#ffffff' }) {
    this.width = width;
    this.height = height;
    this.background = background; // a colour, or null for a transparent one
    this.layers = []; // paint order, bottom first
    this.pool = new Map(); // every layer ever made, so a layer that is taken out can come back with undo
    this.activeId = null;
    this.tool = 'pen';
    this.color = '#111114';
    this.size = 8;
    this.fill = false; // rectangles and ellipses: filled or just the outline
    this.history = [];
    this.future = [];
    this.version = 0; // goes up with every change to the picture, for the autosave
    this.stamp = 0; // goes up with every change of anything (a tool, a layer), for the screen to draw again
    this.listeners = new Set();
    this.op = null;
    this.host = null;
    this.preview = canvasOf(width, height);
    this.preview.style.zIndex = '2';
  }

  // ---- making one ----------------------------------------------------------------------------------------------------

  /** A new drawing: an empty layer, or, with a picture, the picture on the layer below and an empty one to draw on. */
  static async create({ width, height, background, image }) {
    const engine = new PaintEngine({ width, height, background });
    if (image) {
      engine.insertLayer(engine.makeLayer(newLayerMeta(tr('Picture'))), false);
      const layer = engine.layers[0];
      layer.ctx.drawImage(image, 0, 0, width, height);
    }
    engine.insertLayer(engine.makeLayer(newLayerMeta(image ? tr('Drawing') : nextLayerName([]))), false);
    engine.activeId = engine.layers.at(-1).id;
    return engine;
  }

  /** A drawing as it was kept: its layers are PNG blobs. */
  static async fromRecord(record) {
    const engine = new PaintEngine({ width: record.width, height: record.height, background: record.background ?? null });
    for (const meta of record.layers) {
      const layer = engine.makeLayer({ id: meta.id, name: meta.name, visible: meta.visible, opacity: meta.opacity });
      const bitmap = await createImageBitmap(meta.blob);
      layer.ctx.drawImage(bitmap, 0, 0);
      bitmap.close?.();
      engine.insertLayer(layer, false);
    }
    if (!engine.layers.length) engine.insertLayer(engine.makeLayer(newLayerMeta(nextLayerName([]))), false);
    engine.activeId = engine.layers.at(-1).id;
    return engine;
  }

  makeLayer(meta) {
    const canvas = canvasOf(this.width, this.height);
    return { ...meta, canvas, ctx: canvas.getContext('2d', { willReadFrequently: true }) };
  }

  insertLayer(layer, record = true, index = this.layers.length) {
    this.pool.set(layer.id, layer);
    const before = record ? this.snapshot() : null;
    this.layers.splice(index, 0, layer);
    if (record) this.pushStructure(before);
  }

  // ---- listening ------------------------------------------------------------------------------------------------------

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    this.stamp += 1;
    this.syncDom();
    this.listeners.forEach((fn) => fn());
  }

  /** Something outside the pixels changed (the name), and is worth saving. */
  touch() {
    this.changed();
  }

  changed() {
    this.version += 1;
    this.emit();
  }

  /** Puts the layers into the element that shows the drawing (in order, with their visibility and opacity). */
  attach(host) {
    this.host = host;
    this.syncDom();
  }

  syncDom() {
    const host = this.host;
    if (!host) return;
    const want = [...this.layers.map((l) => l.canvas), this.preview];
    if (host.children.length !== want.length || want.some((canvas, i) => host.children[i] !== canvas)) host.replaceChildren(...want);
    for (const layer of this.layers) {
      layer.canvas.style.display = layer.visible ? 'block' : 'none';
      layer.canvas.style.opacity = String(layer.opacity);
    }
  }

  // ---- layers ---------------------------------------------------------------------------------------------------------

  get active() {
    return this.layers.find((l) => l.id === this.activeId) ?? null;
  }

  setActive(id) {
    if (this.pool.has(id)) this.activeId = id;
    this.emit();
  }

  snapshot() {
    return { order: this.layers.map((l) => l.id), props: Object.fromEntries(this.layers.map((l) => [l.id, { name: l.name, visible: l.visible, opacity: l.opacity }])), active: this.activeId };
  }

  applySnapshot(shot) {
    this.layers = shot.order.map((id) => this.pool.get(id));
    for (const layer of this.layers) Object.assign(layer, shot.props[layer.id]);
    this.activeId = this.layers.some((l) => l.id === shot.active) ? shot.active : this.layers.at(-1)?.id ?? null;
  }

  pushStructure(before) {
    this.remember({ kind: 'structure', before, after: this.snapshot() });
    this.changed();
  }

  addLayer(name) {
    const layer = this.makeLayer(newLayerMeta(name || nextLayerName(this.layers)));
    const at = this.layers.findIndex((l) => l.id === this.activeId) + 1 || this.layers.length;
    this.insertLayer(layer, true, at);
    this.activeId = layer.id;
    this.emit();
    return layer;
  }

  /** A picture as a layer of its own, shrunk to fit inside the drawing and put in the middle. */
  addImageLayer(image, name) {
    const layer = this.makeLayer(newLayerMeta(name || tr('Picture')));
    const w = image.width || image.naturalWidth;
    const h = image.height || image.naturalHeight;
    const k = Math.min(this.width / w, this.height / h, 1);
    layer.ctx.drawImage(image, (this.width - w * k) / 2, (this.height - h * k) / 2, w * k, h * k);
    const at = this.layers.findIndex((l) => l.id === this.activeId) + 1 || this.layers.length;
    this.insertLayer(layer, true, at);
    this.activeId = layer.id;
    this.changed();
    return layer;
  }

  removeLayer(id) {
    if (this.layers.length < 2) return;
    const before = this.snapshot();
    const next = layerAfterRemoving(this.layers, id);
    this.layers = this.layers.filter((l) => l.id !== id);
    if (this.activeId === id) this.activeId = next;
    this.pushStructure(before);
  }

  /** Moves a layer one step towards the front (`1`) or the back (`-1`). */
  shiftLayer(id, step) {
    const order = moveLayer(this.layers, id, step);
    if (order === this.layers) return;
    const before = this.snapshot();
    this.layers = order;
    this.pushStructure(before);
  }

  setLayer(id, patch) {
    const layer = this.pool.get(id);
    if (!layer) return;
    const before = this.snapshot();
    Object.assign(layer, patch);
    this.pushStructure(before);
  }

  /** The slider was let go: the opacity is `final`, and undo goes back to `start` (what it was before the drag). */
  commitOpacity(id, start, final) {
    const layer = this.pool.get(id);
    if (!layer || start === final) return;
    layer.opacity = start;
    this.setLayer(id, { opacity: final });
  }

  /** Opacity while a slider is being dragged: shown at once, and one history step when it is let go. */
  previewOpacity(id, opacity) {
    const layer = this.pool.get(id);
    if (!layer) return;
    layer.opacity = opacity;
    this.stamp += 1;
    this.syncDom();
    this.listeners.forEach((fn) => fn());
  }

  // ---- history --------------------------------------------------------------------------------------------------------

  remember(entry) {
    this.history.push(entry);
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.future = [];
  }

  get canUndo() {
    return this.history.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  step(entry, direction) {
    if (entry.kind === 'rotate') {
      this.turnAll(direction === 'undo' ? -entry.turn : entry.turn);
    } else if (entry.kind === 'pixels') {
      const layer = this.pool.get(entry.id);
      const part = direction === 'undo' ? entry.before : entry.after;
      layer?.ctx.putImageData(part instanceof ImageData ? part : asImageData(part), entry.rect.x, entry.rect.y);
    } else {
      this.applySnapshot(direction === 'undo' ? entry.before : entry.after);
    }
  }

  undo() {
    if (this.op) this.cancel();
    const entry = this.history.pop();
    if (!entry) return;
    this.step(entry, 'undo');
    this.future.push(entry);
    this.changed();
  }

  redo() {
    const entry = this.future.pop();
    if (!entry) return;
    this.step(entry, 'redo');
    this.history.push(entry);
    this.changed();
  }

  // ---- drawing --------------------------------------------------------------------------------------------------------

  setTool(tool) {
    this.tool = tool;
    this.emit();
  }

  setColor(color) {
    this.color = color;
    this.emit();
  }

  setSize(size) {
    this.size = size;
    this.emit();
  }

  setFill(fill) {
    this.fill = fill;
    this.emit();
  }

  /** How thick the line is at a point: a pen pressed harder draws a thicker line; a mouse draws the same all the way. */
  widthAt(p) {
    return p.type === 'pen' && p.pressure > 0 ? Math.max(1, this.size * (0.35 + 0.65 * p.pressure)) : this.size;
  }

  /** The colour of the picture as seen, at a point: for the eyedropper. */
  sample(x, y) {
    const flat = this.composite();
    const px = flat.getContext('2d').getImageData(Math.min(this.width - 1, Math.max(0, Math.floor(x))), Math.min(this.height - 1, Math.max(0, Math.floor(y))), 1, 1).data;
    return px;
  }

  /** A finger or pen has gone down at `p` ({ x, y, pressure, type }). Returns whether something is now being drawn. */
  begin(p) {
    const layer = this.active;
    const tool = this.tool;
    if (tool === 'pick') {
      const [r, g, b, a] = this.sample(p.x, p.y);
      if (a > 0) this.setColor(`#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`);
      return false;
    }
    if (!layer || !layer.visible) return false;
    if (tool === 'fill') {
      this.fillAt(p.x, p.y);
      return false;
    }
    if (tool === 'text') return false;
    const before = layer.ctx.getImageData(0, 0, this.width, this.height);
    this.op = { tool, layer, before, points: [p], start: p, end: p, mid: p, dx: 0, dy: 0 };
    if (tool === 'pen' || tool === 'eraser') {
      const ctx = layer.ctx;
      ctx.save();
      ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.fillStyle = tool === 'eraser' ? '#000' : this.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.widthAt(p) / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (tool === 'marker') {
      this.preview.style.opacity = String(HIGHLIGHT_ALPHA);
      this.paintSegment(this.preview.getContext('2d'), p, p);
    }
    return true;
  }

  paintSegment(ctx, from, to, mid) {
    const op = this.op;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const tool = op.tool;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = tool === 'eraser' ? '#000' : this.color;
    ctx.lineWidth = tool === 'marker' ? this.size * 2.6 : this.widthAt(to);
    ctx.beginPath();
    ctx.moveTo(op.mid.x, op.mid.y);
    if (mid) ctx.quadraticCurveTo(from.x, from.y, mid.x, mid.y);
    else ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  /** The pointer has moved to `p` while down. `shift` straightens a line and squares a rectangle. */
  move(p, shift = false) {
    const op = this.op;
    if (!op) return;
    if (op.tool === 'pen' || op.tool === 'eraser' || op.tool === 'marker') {
      const last = op.points.at(-1);
      op.points.push(p);
      const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
      this.paintSegment(op.tool === 'marker' ? this.preview.getContext('2d') : op.layer.ctx, last, p, mid);
      op.mid = mid;
    } else if (SHAPES.includes(op.tool)) {
      const end = shift ? constrain(op.tool, op.start, p) : p;
      op.end = end;
      const ctx = this.preview.getContext('2d');
      ctx.clearRect(0, 0, this.width, this.height);
      this.preview.style.opacity = '1';
      drawShape(ctx, op.tool, op.start, end, { color: this.color, size: this.size, fill: this.fill });
    } else if (op.tool === 'move') {
      op.dx = Math.round(p.x - op.start.x);
      op.dy = Math.round(p.y - op.start.y);
      op.layer.canvas.style.transform = `translate(${(op.dx / this.width) * 100}%, ${(op.dy / this.height) * 100}%)`;
    }
  }

  /** The pointer has gone up: what was drawn becomes part of the layer, and one step of history. */
  end() {
    const op = this.op;
    if (!op) return;
    this.op = null;
    const { layer, tool, before } = op;
    const ctx = layer.ctx;
    let rect;
    if (tool === 'pen' || tool === 'eraser') {
      const last = op.points.at(-1);
      this.op = op;
      this.paintSegment(ctx, last, last);
      this.op = null;
      rect = bboxOf(op.points, this.size * 1.6 + 3, this.width, this.height);
    } else if (tool === 'marker') {
      const last = op.points.at(-1);
      this.op = op;
      this.paintSegment(this.preview.getContext('2d'), last, last);
      this.op = null;
      ctx.save();
      ctx.globalAlpha = HIGHLIGHT_ALPHA;
      ctx.drawImage(this.preview, 0, 0);
      ctx.restore();
      this.clearPreview();
      rect = bboxOf(op.points, this.size * 1.6 + 3, this.width, this.height);
    } else if (SHAPES.includes(tool)) {
      this.clearPreview();
      if (op.start.x !== op.end.x || op.start.y !== op.end.y) {
        drawShape(ctx, tool, op.start, op.end, { color: this.color, size: this.size, fill: this.fill });
        rect = bboxOf([op.start, op.end], this.size * 4 + 6, this.width, this.height);
      }
    } else if (tool === 'move') {
      layer.canvas.style.transform = '';
      if (op.dx || op.dy) {
        const copy = canvasOf(this.width, this.height);
        copy.getContext('2d').drawImage(layer.canvas, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.drawImage(copy, op.dx, op.dy);
        rect = { x: 0, y: 0, w: this.width, h: this.height };
      }
    }
    if (!rect) {
      ctx.putImageData(before, 0, 0);
      return;
    }
    this.remember({ kind: 'pixels', id: layer.id, rect, before: cropData(before, rect), after: ctx.getImageData(rect.x, rect.y, rect.w, rect.h) });
    this.changed();
  }

  /** Throws away what is being drawn (a second finger came down, so it was a pinch and not a stroke). */
  cancel() {
    const op = this.op;
    if (!op) return;
    this.op = null;
    this.clearPreview();
    op.layer.canvas.style.transform = '';
    op.layer.ctx.putImageData(op.before, 0, 0);
  }

  clearPreview() {
    this.preview.getContext('2d').clearRect(0, 0, this.width, this.height);
    this.preview.style.opacity = '1';
  }

  /** Paints the room a point is in (as the whole picture shows it) with the colour, on the chosen layer. */
  fillAt(x, y) {
    const layer = this.active;
    if (!layer || !layer.visible) return;
    const flat = this.composite().getContext('2d').getImageData(0, 0, this.width, this.height);
    const { mask, rect } = floodRegion(flat.data, this.width, this.height, x, y, FILL_TOLERANCE);
    if (!rect) return;
    const pad = { x: Math.max(0, rect.x - 2), y: Math.max(0, rect.y - 2) };
    const box = { ...pad, w: Math.min(this.width, rect.x + rect.w + 2) - pad.x, h: Math.min(this.height, rect.y + rect.h + 2) - pad.y };
    const image = layer.ctx.getImageData(0, 0, this.width, this.height);
    const before = cropData(image, box);
    paintMask(image.data, this.width, this.height, mask, hexToRgba(this.color), 1);
    layer.ctx.putImageData(image, 0, 0);
    this.remember({ kind: 'pixels', id: layer.id, rect: box, before, after: layer.ctx.getImageData(box.x, box.y, box.w, box.h) });
    this.changed();
  }

  /** Writes text with its top left corner at (x, y), on the chosen layer. */
  addText(x, y, text) {
    const layer = this.active;
    const value = String(text ?? '').trimEnd();
    if (!layer || !layer.visible || !value) return;
    const ctx = layer.ctx;
    const fontSize = Math.max(16, this.size * 4);
    const lines = value.split('\n');
    const before = ctx.getImageData(0, 0, this.width, this.height);
    ctx.save();
    ctx.font = `600 ${fontSize}px "Geist", system-ui, sans-serif`;
    ctx.fillStyle = this.color;
    ctx.textBaseline = 'top';
    let widest = 0;
    lines.forEach((line, i) => {
      ctx.fillText(line, x, y + i * fontSize * 1.2);
      widest = Math.max(widest, ctx.measureText(line).width);
    });
    ctx.restore();
    const rect = bboxOf([{ x, y }, { x: x + widest, y: y + lines.length * fontSize * 1.2 }], 4, this.width, this.height);
    if (!rect) {
      ctx.putImageData(before, 0, 0);
      return;
    }
    this.remember({ kind: 'pixels', id: layer.id, rect, before: cropData(before, rect), after: ctx.getImageData(rect.x, rect.y, rect.w, rect.h) });
    this.changed();
  }

  // ---- turning ----------------------------------------------------------------------------------------------------------

  /**
   * Turns the whole drawing a quarter turn, clockwise (`1`) or the other way (`-1`): every layer goes with it, so a wide drawing
   * stands up tall and a tall one lies down. Nothing is lost (a quarter turn moves pixels, it does not blend them), so undo just
   * turns it back.
   */
  rotate(turn = 1) {
    if (this.op) this.cancel();
    const way = turn < 0 ? -1 : 1;
    this.turnAll(way);
    this.remember({ kind: 'rotate', turn: way });
    this.changed();
  }

  /** Turns every layer (the ones taken out too, so undo can bring them back at the right size) and swaps the sides. */
  turnAll(way) {
    const { width, height } = this;
    const spare = canvasOf(width, height);
    const spareCtx = spare.getContext('2d');
    for (const layer of this.pool.values()) {
      spareCtx.clearRect(0, 0, width, height);
      spareCtx.drawImage(layer.canvas, 0, 0);
      layer.canvas.width = height; // resizing empties the canvas; the context stays the same one
      layer.canvas.height = width;
      const ctx = layer.ctx;
      ctx.save();
      if (way > 0) {
        ctx.translate(height, 0);
        ctx.rotate(Math.PI / 2);
      } else {
        ctx.translate(0, width);
        ctx.rotate(-Math.PI / 2);
      }
      ctx.drawImage(spare, 0, 0);
      ctx.restore();
    }
    this.preview.width = height;
    this.preview.height = width;
    this.width = height;
    this.height = width;
  }

  clearLayer() {
    const layer = this.active;
    if (!layer) return;
    const rect = { x: 0, y: 0, w: this.width, h: this.height };
    const before = cropData(layer.ctx.getImageData(0, 0, this.width, this.height), rect);
    layer.ctx.clearRect(0, 0, this.width, this.height);
    this.remember({ kind: 'pixels', id: layer.id, rect, before, after: layer.ctx.getImageData(0, 0, this.width, this.height) });
    this.changed();
  }

  // ---- out ------------------------------------------------------------------------------------------------------------

  /** The drawing as one picture: the background and every layer that is shown. `scale` makes it smaller (a thumbnail). */
  composite(scale = 1, withBackground = true) {
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(this.width * scale));
    out.height = Math.max(1, Math.round(this.height * scale));
    const ctx = out.getContext('2d', { willReadFrequently: true });
    if (withBackground && this.background) {
      ctx.fillStyle = this.background;
      ctx.fillRect(0, 0, out.width, out.height);
    }
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layer.canvas, 0, 0, out.width, out.height);
    }
    ctx.globalAlpha = 1;
    return out;
  }

  /** The picture as a PNG file, to put in a note or a diary page. */
  toPng() {
    return toBlob(this.composite());
  }

  /** What is kept in the library: the size, the background, each layer as a PNG, and a small picture for the list. */
  async toRecord(base) {
    const layers = await Promise.all(this.layers.map(async (l) => ({ id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, blob: await toBlob(l.canvas) })));
    const thumb = await toBlob(this.composite(Math.min(1, 520 / Math.max(this.width, this.height))));
    return { ...base, width: this.width, height: this.height, background: this.background, layers, thumb, updatedAt: Date.now() };
  }
}

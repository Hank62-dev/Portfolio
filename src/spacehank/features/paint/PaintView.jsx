import { useEffect, useRef, useState } from 'react';
import { BookHeart, ImagePlus, NotebookPen, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, Skeleton } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { PageHead } from '../../ui/Page';
import { locale, tr } from '../../core/i18n/lang';
import Pet from '../pet/Pet';
import { sendToDiary, sendToNote } from './share';
import { BACKGROUNDS, SIZES, defaultName, fitDoc } from './model';
import PaintEditor from './PaintEditor';
import { PaintEngine } from './engine';
import { deleteDrawing, loadDrawings, paintStore } from './store';
import { useStore } from '../../core/store';

const checker = 'repeating-conic-gradient(#d9d9de 0% 25%, #f5f5f7 0% 50%) 0 0 / 16px 16px';

/** The address of a stored picture while a card shows it. */
const useBlobUrl = (blob) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) return undefined;
    const made = URL.createObjectURL(blob);
    setUrl(made);
    return () => URL.revokeObjectURL(made);
  }, [blob]);
  return url;
};

/** A drawing in the library: its picture, its name, when it was last drawn on, and what can be done with it. */
function DrawingCard({ drawing, onOpen, onNotify, onRemove }) {
  const url = useBlobUrl(drawing.thumb);
  const [confirm, setConfirm] = useState(false);
  const sendPng = async (where) => {
    try {
      const engine = await PaintEngine.fromRecord(drawing);
      const png = await engine.toPng();
      onNotify?.(await (where === 'note' ? sendToNote(png, drawing.name) : sendToDiary(png)));
    } catch {
      onNotify?.(tr('That did not work. Try again.'));
    }
  };
  const when = new Date(drawing.updatedAt).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
  return (
    <li className="paint-card group flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-line bg-ink-1" data-drawing={drawing.id}>
      <button type="button" onClick={onOpen} aria-label={`${tr('Open')} ${drawing.name}`} className="relative block aspect-[4/3] w-full overflow-hidden" style={{ background: checker }}>
        {drawing.background && <span className="absolute inset-0" style={{ background: drawing.background }} aria-hidden="true" />}
        {url && <img src={url} alt="" className="relative size-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" />}
      </button>
      <div className="flex items-center gap-2 px-3.5 pt-3">
        <b className="min-w-0 flex-1 truncate font-display text-[1.1rem] leading-tight font-normal text-bone">{drawing.name}</b>
        <span className="font-mono text-[0.64rem] text-bone-faint uppercase">{when}</span>
      </div>
      <div className="flex items-center gap-1 px-2.5 pt-1.5 pb-2.5">
        <span className="px-1 font-mono text-[0.62rem] text-bone-faint">{drawing.width}×{drawing.height}</span>
        <span className="flex-1" />
        {confirm ? (
          <>
            <button type="button" onClick={onRemove} className="h-8 rounded-full bg-danger/15 px-3 font-mono text-[0.7rem] text-danger" data-confirm-delete>
              {tr('Delete')}
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="h-8 rounded-full px-3 font-mono text-[0.7rem] text-bone-dim">
              {tr('Keep')}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => sendPng('note')} aria-label={tr('Send to a new note')} title={tr('Send to a new note')} className="grid size-8 place-items-center rounded-full text-bone-faint transition-colors hover:bg-wash/10 hover:text-bone">
              <NotebookPen size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => sendPng('diary')} aria-label={tr("Add to today's diary")} title={tr("Add to today's diary")} className="grid size-8 place-items-center rounded-full text-bone-faint transition-colors hover:bg-wash/10 hover:text-bone">
              <BookHeart size={15} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setConfirm(true)} aria-label={tr('Delete the drawing')} title={tr('Delete the drawing')} className="grid size-8 place-items-center rounded-full text-bone-faint transition-colors hover:bg-danger/10 hover:text-danger">
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

/** Choosing the size and the background of a new drawing. */
function NewDrawing({ onCreate, onCancel }) {
  const [size, setSize] = useState('wide');
  const [bg, setBg] = useState('white');
  return (
    <section className="ink-panel flex flex-col gap-5 rounded-[1.75rem] p-5" aria-label={tr('A new drawing')} data-new-drawing>
      <div>
        <p className="mb-2.5 font-mono text-[0.64rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Size')}</p>
        <div className="flex flex-wrap gap-2.5">
          {SIZES.map((s) => {
            const k = 44 / Math.max(s.width, s.height);
            return (
              <button key={s.id} type="button" onClick={() => setSize(s.id)} aria-pressed={size === s.id} className={clsx('flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors', size === s.id ? 'border-signal bg-signal-soft' : 'border-line bg-ink-2/60 hover:border-line-strong')}>
                <span className="block rounded-[0.3rem] border border-bone-faint" style={{ width: s.width * k, height: s.height * k }} />
                <span>
                  <b className="block text-fine font-medium text-bone">{s.label}</b>
                  <small className="font-mono text-[0.62rem] text-bone-faint">{s.width}×{s.height}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-2.5 font-mono text-[0.64rem] tracking-[0.14em] text-bone-faint uppercase">{tr('Background')}</p>
        <div className="flex flex-wrap gap-2.5">
          {BACKGROUNDS.map((b) => (
            <button key={b.id} type="button" onClick={() => setBg(b.id)} aria-pressed={bg === b.id} className={clsx('flex items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 transition-colors', bg === b.id ? 'border-signal bg-signal-soft' : 'border-line bg-ink-2/60 hover:border-line-strong')}>
              <span className="block size-8 rounded-full border border-line-strong" style={{ background: b.color ?? checker }} />
              <span className="text-fine text-bone">{b.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onCreate(SIZES.find((s) => s.id === size), BACKGROUNDS.find((b) => b.id === bg))} data-create-drawing>
          <Plus size={14} aria-hidden="true" /> {tr('Start drawing')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {tr('Cancel')}
        </Button>
      </div>
    </section>
  );
}

/** Paint: a library of drawings, and the screen to draw in. */
export default function PaintView({ onNotify }) {
  const { items, loaded, error } = useStore(paintStore);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // { key, source }
  const picture = useRef(null);

  useEffect(() => {
    void loadDrawings();
  }, []);

  const open = (source) => {
    setCreating(false);
    setEditing({ key: Date.now(), source });
  };

  const openPicture = async (file) => {
    if (!file?.type?.startsWith('image/')) return;
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const { width, height } = fitDoc(bitmap.width, bitmap.height);
      open({ create: { width, height, background: '#ffffff', name: defaultName(), image: bitmap } });
    } catch {
      onNotify?.(tr('That picture could not be opened.'));
    }
  };

  return (
    <div className="flex flex-col gap-6" data-paint>
      <PageHead eyebrow={tr('PAINT')} title={tr('Your')} accent={tr('drawings')} description={tr('Draw with layers, or draw over a picture. Drawings are kept in this browser.')} keepOnPhone>
        <Button size="sm" onClick={() => setCreating(!creating)} data-new-paint>
          <Plus size={15} aria-hidden="true" /> {tr('New drawing')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => picture.current?.click()}>
          <ImagePlus size={15} aria-hidden="true" /> {tr('Draw over a picture')}
        </Button>
        <input ref={picture} type="file" accept="image/*" hidden onChange={(e) => { void openPicture(e.target.files?.[0]); e.target.value = ''; }} />
      </PageHead>

      {creating && (
        <NewDrawing
          onCancel={() => setCreating(false)}
          onCreate={(size, bg) => open({ create: { width: size.width, height: size.height, background: bg.color, name: defaultName() } })}
        />
      )}

      {!loaded ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-[1.5rem]" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-fine text-danger">
          {error}
        </p>
      ) : items.length === 0 && !creating ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="w-28">
            <Pet mood="happy" outfit={{ sprout: true }} size="100%" />
          </div>
          <EmptyState title={tr('A blank page is waiting')} description={tr('Start a drawing, or open a picture and draw over it.')} />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {items.map((drawing) => (
            <DrawingCard key={drawing.id} drawing={drawing} onNotify={onNotify} onOpen={() => open({ record: drawing })} onRemove={() => void deleteDrawing(drawing.id)} />
          ))}
        </ul>
      )}

      {editing && <PaintEditor key={editing.key} source={editing.source} onNotify={onNotify} onClose={() => setEditing(null)} />}
    </div>
  );
}

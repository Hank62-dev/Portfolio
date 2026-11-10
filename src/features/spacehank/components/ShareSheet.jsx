import { tr } from '../lang';
import { useEffect, useMemo, useState } from 'react';
import { Check, NotebookPen, Palette, Trash2 } from 'lucide-react';
import { Button, Dialog, Skeleton } from '../../../shared/ui';
import { createNote, sendIntent } from '../notes/library';
import { textToHtml } from '../notes/notes';
import { clearShare, readShare } from '../share/inbox';
import { describeShare, hasContent, noteFromShare } from '../share/compose';
import { saveImage } from '../studio/gallery';

const NONE = [];

/**
 * What another app shared to Hank62, with the choice of where it goes: words and links to Second Brain, pictures to
 * Image Studio. Nothing is saved until one of the buttons is pressed. `onDone(tab)` closes the sheet (and may open a tab).
 */
export default function ShareSheet({ onDone, onNotify }) {
  const [share, setShare] = useState(undefined); // undefined while it loads, null when nothing is waiting
  const [saved, setSaved] = useState({ note: false, pictures: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    readShare().then((value) => live && setShare(value));
    return () => {
      live = false;
    };
  }, []);

  const files = share?.files ?? NONE;
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  // nothing came through (the link was opened by hand, or the share is a day old): just carry on to the app
  useEffect(() => {
    if (share === null || (share && !hasContent(share, files.length))) {
      void clearShare();
      onNotify?.(tr('Nothing was waiting from that share'));
      onDone();
    }
  }, [share, files.length, onDone, onNotify]);

  if (!share || !hasContent(share, files.length)) return null;

  const text = noteFromShare(share);
  const hasText = Boolean(text);
  const hasPictures = files.length > 0;

  const finish = async (message, tab) => {
    await clearShare();
    onNotify?.(message);
    onDone(tab);
  };

  const mark = async (part, work) => {
    setBusy(true);
    try {
      await work();
    } catch {
      onNotify?.(tr('That could not be saved on this device'));
      setBusy(false);
      return null;
    }
    setBusy(false);
    const next = { ...saved, [part]: true };
    setSaved(next);
    return next;
  };

  const saveNote = async () => {
    let id = null;
    const next = await mark('note', async () => {
      id = (await createNote(text, { html: textToHtml(text) })).id;
    });
    if (!next) return;
    if (id) sendIntent('notes', { open: id });
    if (!hasPictures || next.pictures) await finish(tr('Saved to Second Brain'), 'notes');
  };

  const savePictures = async () => {
    const next = await mark('pictures', async () => {
      for (const blob of files) await saveImage({ prompt: share.title.trim() || tr('Shared picture'), blob });
    });
    if (!next) return;
    if (!hasText || next.note) await finish(tr('Saved {0} to Image Studio', files.length === 1 ? tr('the picture') : tr('{0} pictures', files.length)), 'studio');
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && finish(saved.note || saved.pictures ? 'Saved' : 'Discarded', undefined)}
      eyebrow={tr('SHARED TO HANK62')}
      title={tr('Where should this go?')}
      description={tr('You shared {0}.', describeShare(share, files.length))}
      footer={
        <Button variant="ghost" size="sm" onClick={() => finish('Discarded', undefined)}>
          <Trash2 size={14} aria-hidden="true" /> {tr('Discard')}
        </Button>
      }
    >
      {hasText && (
        <p className="line-clamp-5 rounded-sm border border-line bg-ink-2 px-3 py-2 font-mono text-fine break-words whitespace-pre-line text-bone-dim" data-share-text>
          {text}
        </p>
      )}
      {hasPictures && (
        <ul className="flex flex-wrap gap-2" aria-label={tr('Shared pictures')}>
          {previews.map((url, i) => (
            <li key={url} className="size-20 overflow-hidden rounded-sm border border-line bg-ink-2">
              <img src={url} alt={tr('Shared picture {0}', i + 1)} className="size-full object-cover" />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        {hasText && (
          <Button onClick={saveNote} disabled={busy || saved.note} data-share-note>
            {busy ? <Skeleton className="size-3.5 rounded-full bg-ink-0/30" /> : saved.note ? <Check size={15} aria-hidden="true" /> : <NotebookPen size={15} aria-hidden="true" />}
            {saved.note ? tr('Saved to Second Brain') : tr('Save to Second Brain')}
          </Button>
        )}
        {hasPictures && (
          <Button variant={hasText ? 'secondary' : 'primary'} onClick={savePictures} disabled={busy || saved.pictures} data-share-pictures>
            {saved.pictures ? <Check size={15} aria-hidden="true" /> : <Palette size={15} aria-hidden="true" />}
            {saved.pictures ? tr('Saved to Image Studio') : files.length === 1 ? tr('Save the picture to Image Studio') : tr('Save {0} pictures to Image Studio', files.length)}
          </Button>
        )}
      </div>
    </Dialog>
  );
}

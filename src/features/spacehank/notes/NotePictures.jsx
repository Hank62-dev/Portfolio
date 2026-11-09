import { useState } from 'react';
import { X } from 'lucide-react';
import PhotoViewer from '../diary/PhotoViewer';
import { removePhoto, usePhoto } from '../diary/photos';
import { tr } from '../lang';
import { updateNote } from './library';

function Picture({ id, onOpen, onRemove }) {
  const url = usePhoto(id);
  return (
    <li className="group relative">
      <button type="button" onClick={onOpen} aria-label={tr('Open the picture')} className="block h-32 cursor-zoom-in overflow-hidden rounded-2xl border border-line bg-ink-2 sm:h-40">
        {url ? <img src={url} alt="" className="h-full w-auto max-w-[78vw] object-contain" /> : <span className="block h-full w-40" />}
      </button>
      <button type="button" onClick={onRemove} aria-label={tr('Remove the picture')} className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-ink-0/80 text-bone opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100">
        <X size={14} aria-hidden="true" />
      </button>
    </li>
  );
}

/** The pictures kept on a note (a drawing sent from Paint, say): a row to look at, tap to see it large, and a cross to take it off. */
export default function NotePictures({ note }) {
  const ids = note.photos ?? [];
  const [viewing, setViewing] = useState(null);
  if (!ids.length) return null;
  const remove = async (id) => {
    await updateNote(note.id, { photos: ids.filter((p) => p !== id) });
    await removePhoto(id).catch(() => {});
  };
  return (
    <>
      <ul className="mx-auto flex w-full max-w-3xl gap-3 overflow-x-auto pb-1" aria-label={tr('Pictures')} data-note-pictures>
        {ids.map((id, i) => (
          <Picture key={id} id={id} onOpen={() => setViewing(i)} onRemove={() => void remove(id)} />
        ))}
      </ul>
      {viewing !== null && <PhotoViewer ids={ids} start={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

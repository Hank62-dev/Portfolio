import { PenLine } from 'lucide-react';
import MoodFace from './MoodFace';
import { bodyOf, dayLabel, moodWord } from './model';
import { PaperSheet, SheetClose, SoftButton, Thumb } from './ui';
import { usePhoto } from './photos';

/** A big picture inside a page being read. */
function Photo({ id }) {
  const url = usePhoto(id);
  return <div className="overflow-hidden rounded-3xl bg-[color:var(--dz-photo)]">{url && <img src={url} alt="Ảnh kỷ niệm" className="max-h-80 w-full object-cover" />}</div>;
}

/** Reading one day's page again. `label` is a line above the date ("Một tuần trước"), for pages brought back as memories. */
export default function EntrySheet({ entry, label, onClose, onEdit }) {
  const body = bodyOf(entry.text);
  const photos = entry.photos ?? [];
  return (
    <PaperSheet open onClose={onClose} title={`Nhật ký ${dayLabel(entry.day)}`} description="Đọc lại trang nhật ký.">
      <article className="flex flex-col gap-4 px-5 pt-2 pb-5" data-entry>
        <header className="flex items-start justify-between gap-3">
          <div>
            {label && <p className="font-display text-[1.2rem] leading-none text-[color:var(--dz-amber)]">{label}</p>}
            <h2 className="font-display text-[2rem] leading-tight text-[color:var(--dz-text)]">{dayLabel(entry.day)}</h2>
            {entry.mood && (
              <p className="mt-1 flex items-center gap-2 font-body text-[0.95rem] text-[color:var(--dz-text-2)]">
                <MoodFace mood={entry.mood} size={30} /> {moodWord(entry.mood)}
              </p>
            )}
          </div>
          <SheetClose />
        </header>
        {photos.length === 1 && <Photo id={photos[0]} />}
        {photos.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((id) => (
              <Thumb key={id} id={id} size={92} />
            ))}
          </div>
        )}
        {body ? <p className="font-display text-[1.3rem] leading-relaxed whitespace-pre-wrap text-[color:var(--dz-text)]">{body}</p> : <p className="font-body text-[0.98rem] text-[color:var(--dz-text-3)]">Trang này chưa có chữ nào, chỉ có một dấu chân.</p>}
        <footer className="flex gap-2 pt-1">
          <SoftButton tone="soft" className="flex-1" onClick={onEdit}>
            <PenLine size={16} aria-hidden="true" /> Sửa trang này
          </SoftButton>
        </footer>
      </article>
    </PaperSheet>
  );
}

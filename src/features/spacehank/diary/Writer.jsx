import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { clsx } from '../../../lib/format';
import MoodFace from './MoodFace';
import { MOOD_WORDS, bodyOf, dayLabel, promptsFor } from './model';
import { clearDraft, readDraft, writeDraft } from './draft';
import { addPhoto, removePhoto } from './photos';
import { removeEntry, saveEntry } from './store';
import { PaperSheet, SheetClose, SoftButton, Thumb } from './ui';

const MAX_PHOTOS = 4;

/**
 * Writing a page: how the day felt, the words, a few pictures. Closing it keeps what was written (an empty page is not
 * kept), so nothing is lost by leaving; "Lưu" just says so out loud.
 */
export default function Writer({ day, entry, onClose, onNotify }) {
  const [draft] = useState(() => readDraft(day)); // what was being written when the diary last closed on its own
  const [mood, setMood] = useState(() => (draft ? draft.mood : entry?.mood ?? null));
  const [body, setBody] = useState(() => (draft ? draft.body : bodyOf(entry?.text)));
  const [photos, setPhotos] = useState(() => (draft ? draft.photos : entry?.photos ?? []));
  const [added, setAdded] = useState([]); // pictures added in this sitting: they go if the page is thrown away
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const area = useRef(null);
  const file = useRef(null);
  const today = promptsFor(day);

  // the writing box grows with what is in it
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 160)}px`;
  }, [body]);

  const hasContent = Boolean(mood || body.trim() || photos.length);

  // kept on the side as it goes, so a lock, a call or a killed app loses nothing
  useEffect(() => {
    if (hasContent) writeDraft(day, { mood, body, photos });
    else clearDraft();
  }, [day, mood, body, photos, hasContent]);

  const keep = async (message) => {
    setBusy(true);
    try {
      if (hasContent) {
        await saveEntry({ day, entry, mood, body, photos });
        if (message) onNotify?.(message);
      } else if (entry) {
        await removeEntry(entry);
      }
      await Promise.all(added.filter((id) => !photos.includes(id)).map((id) => removePhoto(id).catch(() => {})));
    } catch {
      onNotify?.('Không lưu được trang này trên máy.');
    }
    clearDraft();
    setBusy(false);
    onClose();
  };

  const addPrompt = (text) => {
    setBody((current) => `${current.trim() ? `${current.trimEnd()}\n\n` : ''}${text} `);
    window.requestAnimationFrame(() => {
      const el = area.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const pick = async (event) => {
    const files = [...event.target.files].slice(0, MAX_PHOTOS - photos.length);
    event.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      const ids = [];
      for (const picture of files) ids.push(await addPhoto(picture));
      setPhotos((current) => [...current, ...ids]);
      setAdded((current) => [...current, ...ids]);
    } catch {
      onNotify?.('Không thêm được ảnh.');
    }
    setBusy(false);
  };

  const dropPhoto = (id) => setPhotos((current) => current.filter((p) => p !== id));

  const discard = async () => {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    try {
      await removeEntry(entry);
      await Promise.all(added.map((id) => removePhoto(id).catch(() => {})));
      onNotify?.('Đã xoá trang nhật ký.');
    } catch {
      onNotify?.('Không xoá được.');
    }
    clearDraft();
    setBusy(false);
    onClose();
  };

  return (
    <PaperSheet open onClose={() => keep()} title={`Viết nhật ký ${dayLabel(day)}`} description="Chọn tâm trạng, viết vài dòng và thêm ảnh nếu muốn.">
      <div className="flex flex-col gap-4 px-5 pt-2 pb-5" data-writer>
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.68rem] tracking-[0.12em] text-[color:var(--dz-text-3)] uppercase">{dayLabel(day)}</p>
            <h2 className="font-display text-[2rem] leading-tight text-[color:var(--dz-text)]">Hôm nay của bạn thế nào?</h2>
          </div>
          <SheetClose label="Lưu và đóng" />
        </header>

        <div role="group" aria-label="Tâm trạng" className="flex justify-between gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" aria-pressed={mood === value} aria-label={MOOD_WORDS[value - 1]} onClick={() => setMood(mood === value ? null : value)} className={clsx('flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 transition-[transform,background-color] active:scale-90', mood === value ? 'scale-105 bg-[color:var(--dz-soft-2)]' : 'opacity-80 hover:opacity-100')}>
              <MoodFace mood={value} size={46} ring={mood === value} />
              <span className={clsx('font-body text-[0.74rem] leading-none', mood === value ? 'font-semibold text-[color:var(--dz-text)]' : 'text-[color:var(--dz-text-3)]')}>{MOOD_WORDS[value - 1]}</span>
            </button>
          ))}
        </div>

        <textarea ref={area} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Viết gì cũng được. Một dòng thôi cũng là một dấu chân…" aria-label="Nội dung nhật ký" className="min-h-40 w-full resize-none rounded-3xl border border-[color:var(--dz-photo)] bg-[color:var(--dz-field)] p-4 font-display text-[1.3rem] leading-relaxed text-[color:var(--dz-text)] outline-none placeholder:text-[color:var(--dz-text-4)] focus:border-[#e0a458]" />

        <div className="flex flex-wrap gap-2" aria-label="Gợi ý để bắt đầu">
          {today.map((text) => (
            <button key={text} type="button" onClick={() => addPrompt(text)} className="rounded-full bg-[color:var(--dz-soft-2)] px-3.5 py-1.5 text-left font-body text-[0.85rem] leading-snug text-[color:var(--dz-text-2)] transition-transform active:scale-95">
              {text}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {photos.map((id) => (
            <Thumb key={id} id={id} onRemove={() => dropPhoto(id)} />
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" onClick={() => file.current?.click()} disabled={busy} aria-label="Thêm ảnh" className="grid size-[72px] place-items-center rounded-2xl border-2 border-dashed border-[color:var(--dz-handle)] text-[color:var(--dz-text-4)] transition-colors hover:border-[#e0a458] hover:text-[color:var(--dz-amber)] disabled:opacity-50">
              <ImagePlus size={22} aria-hidden="true" />
            </button>
          )}
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={pick} data-photo-input />
        </div>

        <footer className="flex items-center gap-2 pt-1">
          {entry && (
            <SoftButton tone="soft" onClick={discard} disabled={busy} aria-label={confirm ? 'Chắc chắn xoá trang này' : 'Xoá trang này'} className={clsx('px-4', confirm && '!bg-[color:var(--dz-danger-bg)] !text-[color:var(--dz-danger)]')}>
              <Trash2 size={16} aria-hidden="true" /> {confirm ? 'Xoá thật nhé?' : 'Xoá'}
            </SoftButton>
          )}
          <SoftButton className="flex-1" onClick={() => keep('Đã thêm vào hành trình.')} disabled={busy || !hasContent} data-save>
            Lưu vào hành trình
          </SoftButton>
        </footer>
      </div>
    </PaperSheet>
  );
}

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import MoodFace from './MoodFace';
import { MOOD_WORDS, bodyOf, dayLabel, parseDay, promptsFor } from './model';
import { clearDraft, readDraft, writeDraft } from './draft';
import { addPhoto, removePhoto } from './photos';
import { removeEntry, saveEntry } from './store';
import { Polaroid, Spiral } from './notebook';
import { PaperSheet, SheetClose } from './ui';
import { tr } from '../../core/i18n/lang';

const MAX_PHOTOS = 4;

/**
 * Writing a page in the notebook (see EntrySheet): how the day felt, the words, a few pictures. Closing it keeps what was written (an empty page is not
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
    el.style.height = `${Math.max(el.scrollHeight, 192)}px`;
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
      onNotify?.(tr('Không lưu được trang này trên máy.'));
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
      onNotify?.(tr('Không thêm được ảnh.'));
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
      onNotify?.(tr('Đã xoá trang nhật ký.'));
    } catch {
      onNotify?.(tr('Không xoá được.'));
    }
    clearDraft();
    setBusy(false);
    onClose();
  };

  return (
    <PaperSheet open surface="notebook" onClose={() => keep()} title={tr('Viết nhật ký {0}', dayLabel(day))} description={tr('Chọn tâm trạng, viết vài dòng và thêm ảnh nếu muốn.')}>
      <Spiral />
      <div className="nb-page" data-writer>
        <header className="nb-head">
          <div className="min-w-0">
            <h2 className="nb-date">{dayLabel(day)}</h2>
            <p className="nb-year">{parseDay(day).getFullYear()}</p>
          </div>
          <SheetClose label={tr('Lưu và đóng')} />
        </header>

        <fieldset className="nb-moods">
          <legend className="nb-ask">{tr('Hôm nay của bạn thế nào?')}</legend>
          <div role="group" aria-label={tr('Tâm trạng')} className="flex justify-between gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button key={value} type="button" aria-pressed={mood === value} aria-label={MOOD_WORDS[value - 1]} onClick={() => setMood(mood === value ? null : value)} className="nb-mood">
                <MoodFace mood={value} size={42} />
                <span>{MOOD_WORDS[value - 1]}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <textarea ref={area} value={body} onChange={(event) => setBody(event.target.value)} placeholder={tr('Viết gì cũng được. Một dòng thôi cũng là một dấu chân…')} aria-label={tr('Nội dung nhật ký')} className="nb-write" />

        <div className="flex flex-wrap gap-x-3 gap-y-1.5" aria-label={tr('Gợi ý để bắt đầu')}>
          {today.map((text) => (
            <button key={text} type="button" onClick={() => addPrompt(text)} className="nb-prompt">
              {text}
            </button>
          ))}
        </div>

        <div className="nb-photos" data-writing>
          {photos.map((id, index) => (
            <Polaroid key={id} id={id} index={index} size="small" onRemove={() => dropPhoto(id)} />
          ))}
          {photos.length < MAX_PHOTOS && (
            <button type="button" onClick={() => file.current?.click()} disabled={busy} aria-label={tr('Thêm ảnh')} className="nb-photo-add">
              <ImagePlus size={22} aria-hidden="true" />
            </button>
          )}
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={pick} data-photo-input />
        </div>

        <footer className="flex items-center gap-2 pt-1">
          {entry && (
            <button type="button" onClick={discard} disabled={busy} aria-label={confirm ? tr('Chắc chắn xoá trang này') : tr('Xoá trang này')} className="nb-discard" data-confirm={confirm || undefined}>
              <Trash2 size={16} aria-hidden="true" /> {confirm ? tr('Xoá thật nhé?') : tr('Xoá')}
            </button>
          )}
          <button type="button" className="nb-edit flex-1 justify-center" onClick={() => keep(tr('Đã thêm vào hành trình.'))} disabled={busy || !hasContent} data-save>
            {tr('Lưu vào hành trình')}
          </button>
        </footer>
      </div>
    </PaperSheet>
  );
}

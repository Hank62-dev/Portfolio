import { ChevronLeft, ChevronRight, PenLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import MoodFace from './MoodFace';
import PhotoViewer from './PhotoViewer';
import { bodyOf, dayLabel, moodWord, parseDay } from './model';
import { PaperSheet, SheetClose } from './ui';
import { Polaroid, Spiral } from './notebook';
import { tr } from '../lang';

/**
 * Reading one day's page again, as a page of a spiral notebook: ruled lines, a margin, the words in handwriting, the photos
 * taped on. `days` are the written days, oldest first, so the arrows (or a swipe, or ← →) turn to the page before or after.
 * `label` is a line above the date ("Một tuần trước"), for pages brought back as memories.
 */
export default function EntrySheet({ entry, label, days = [], onTurn, onClose, onEdit }) {
  const body = bodyOf(entry.text);
  const photos = entry.photos ?? [];
  const [viewing, setViewing] = useState(null); // the picture open full screen
  const [turn, setTurn] = useState(''); // which way the last page turned, for the animation
  const at = days.indexOf(entry.day);
  const before = at > 0 ? days[at - 1] : null;
  const after = at >= 0 && at < days.length - 1 ? days[at + 1] : null;
  const year = parseDay(entry.day).getFullYear();

  const go = (day, way) => {
    if (!day || !onTurn) return;
    setTurn(way);
    setViewing(null);
    onTurn(day);
  };

  // ← → turn the pages while the notebook is open (not while a photo is shown full screen)
  const keys = useRef(null);
  keys.current = (event) => {
    if (viewing !== null || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft') go(before, 'back');
    if (event.key === 'ArrowRight') go(after, 'next');
  };
  useEffect(() => {
    const listen = (event) => keys.current(event);
    window.addEventListener('keydown', listen);
    return () => window.removeEventListener('keydown', listen);
  }, []);

  // a sideways swipe turns the page too; an up-down one is left to the sheet (pulling it down puts it away)
  const swipe = useRef(null);
  const touchStart = (event) => {
    const t = event.touches[0];
    swipe.current = { x: t.clientX, y: t.clientY };
  };
  const touchEnd = (event) => {
    const from = swipe.current;
    swipe.current = null;
    if (!from) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) go(after, 'next');
    else go(before, 'back');
  };

  return (
    <PaperSheet open surface="notebook" onClose={onClose} title={tr('Nhật ký {0}', dayLabel(entry.day))} description={tr('Đọc lại trang nhật ký.')}>
      <Spiral />
      <article key={entry.day} className="nb-page" data-turn={turn || undefined} onTouchStart={touchStart} onTouchEnd={touchEnd} data-entry>
        <header className="nb-head">
          <div className="min-w-0">
            {label && <p className="nb-label">{label}</p>}
            <h2 className="nb-date">{dayLabel(entry.day)}</h2>
            <p className="nb-year">{year}</p>
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {entry.mood && (
              <span className="nb-stamp" title={moodWord(entry.mood)}>
                <MoodFace mood={entry.mood} size={34} />
                <span>{moodWord(entry.mood)}</span>
              </span>
            )}
            <SheetClose />
          </div>
        </header>

        {photos.length > 0 && (
          <div className="nb-photos" data-count={photos.length}>
            {photos.map((id, index) => (
              <Polaroid key={id} id={id} index={index} size={photos.length === 1 ? 'single' : 'half'} onOpen={() => setViewing(index)} />
            ))}
          </div>
        )}

        <div className="nb-lines">{body ? <p className="nb-words">{body}</p> : <p className="nb-words nb-empty">{tr('Trang này chưa có chữ nào, chỉ có một dấu chân.')}</p>}</div>

        <footer className="nb-foot">
          <button type="button" className="nb-turn" onClick={() => go(before, 'back')} disabled={!before} aria-label={tr('Trang trước')}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <div className="flex flex-col items-center gap-1.5">
            <button type="button" className="nb-edit" onClick={onEdit}>
              <PenLine size={15} aria-hidden="true" /> {tr('Sửa trang này')}
            </button>
            {at >= 0 && days.length > 1 && <span className="nb-number">{tr('Trang {0} trên {1}', at + 1, days.length)}</span>}
          </div>
          <button type="button" className="nb-turn" onClick={() => go(after, 'next')} disabled={!after} aria-label={tr('Trang kế tiếp')}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </footer>
      </article>
      {viewing !== null && <PhotoViewer ids={photos} start={viewing} onClose={() => setViewing(null)} />}
    </PaperSheet>
  );
}

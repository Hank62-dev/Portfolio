import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { createStore, useStore } from '../../core/store';
import { locale, tr } from '../../core/i18n/lang';
import { formatVnd } from '../wallet/model';
import { moodWord } from '../diary/model';
import { useLifeData } from './useLifeData';
import { dayPaper } from './paper';

// Whether the day's front page is open (the home screen in the evening and the command palette open it).
export const paperUi = createStore({ open: false });
export const openPaper = () => paperUi.set({ open: true });
const closePaper = () => paperUi.set({ open: false });

const longDate = (day) => new Date(`${day}T12:00:00`).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Words cut into lines no wider than `width` on a canvas. */
const wrap = (ctx, text, width) => {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    const tryLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(tryLine).width > width && line) {
      lines.push(line);
      line = word;
    } else line = tryLine;
  }
  if (line) lines.push(line);
  return lines;
};

/** The front page drawn on a canvas (1080 x 1350, a phone's portrait post), as a PNG blob to share or save. */
const drawPaper = async (paper) => {
  await document.fonts?.ready;
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const serif = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'Georgia, serif';
  ctx.fillStyle = '#f3ecdc';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1d1a16';
  ctx.strokeStyle = '#1d1a16';
  ctx.textAlign = 'center';
  ctx.font = `700 96px ${serif}`;
  ctx.fillText('The Daily Hank', W / 2, 150);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(70, 190);
  ctx.lineTo(W - 70, 190);
  ctx.stroke();
  ctx.font = `italic 30px ${serif}`;
  ctx.fillText(longDate(paper.day), W / 2, 235);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(70, 260);
  ctx.lineTo(W - 70, 260);
  ctx.stroke();
  ctx.font = `600 68px ${serif}`;
  let y = 360;
  for (const line of wrap(ctx, paper.headline ?? tr('A quiet day, well spent'), W - 160).slice(0, 3)) {
    ctx.fillText(line, W / 2, y);
    y += 78;
  }
  ctx.textAlign = 'left';
  const col = (x, title, lines) => {
    let cy = y + 70;
    ctx.font = `700 26px ${serif}`;
    ctx.fillText(title.toUpperCase(), x, cy);
    cy += 46;
    ctx.font = `30px ${serif}`;
    for (const text of lines) {
      for (const line of wrap(ctx, text, 280).slice(0, 2)) {
        ctx.fillText(line, x, cy);
        cy += 40;
      }
    }
  };
  col(70, tr('Done'), paper.done.length ? paper.done.slice(0, 5).map((t) => `✓ ${t}`) : [tr('Nothing ticked off')]);
  col(400, tr('Garden'), [tr('{0} of {1} habits', paper.habits.done, paper.habits.total), ...paper.habits.names.slice(0, 3)]);
  col(730, tr('Ledger'), [formatVnd(paper.money.total), paper.money.biggest ? `${paper.money.biggest.note} · ${formatVnd(paper.money.biggest.amount)}` : tr('Nothing spent')]);
  if (paper.quote) {
    ctx.textAlign = 'center';
    ctx.font = `italic 40px ${serif}`;
    let qy = H - 260;
    for (const line of wrap(ctx, `“${paper.quote}”`, W - 200).slice(0, 3)) {
      ctx.fillText(line, W / 2, qy);
      qy += 52;
    }
  }
  ctx.textAlign = 'center';
  ctx.font = `24px ${serif}`;
  ctx.fillText('hank62 · private os', W / 2, H - 60);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
};

/**
 * The day as the front page of a newspaper, printed in the evening: the task finished last is the headline, three columns
 * (done, the garden, the ledger) and a line from the diary at the foot. It can be shared or saved as a picture.
 */
export default function DayPaper() {
  const open = useStore(paperUi, (s) => s.open);
  return open ? <Paper /> : null;
}

function Paper() {
  const data = useLifeData();
  const paper = useMemo(() => dayPaper({ ...data, now: new Date() }), [data]);
  const [busy, setBusy] = useState(false);
  const close = useRef(null);

  useEffect(() => {
    close.current?.focus();
    const onKey = (e) => e.key === 'Escape' && closePaper();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const share = async () => {
    setBusy(true);
    try {
      const blob = await drawPaper(paper);
      const file = new File([blob], `daily-hank-${paper.day}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'The Daily Hank' });
      else {
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch {
      /* the share sheet was closed */
    } finally {
      setBusy(false);
    }
  };

  const canShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  return (
    <div className="paper-scrim fixed inset-0 z-[75] grid place-items-center overflow-y-auto p-4" onClick={(e) => e.target === e.currentTarget && closePaper()}>
      <article role="dialog" aria-modal="true" aria-label={tr('The Daily Hank')} className="day-paper">
        <header className="text-center">
          <p className="paper-kicker">{tr('Evening edition')}</p>
          <h2 className="paper-mast">The Daily Hank</h2>
          <p className="paper-dateline">
            <span>{longDate(paper.day)}</span>
            {paper.mood > 0 && <span>{tr('Mood: {0}', moodWord(paper.mood))}</span>}
          </p>
        </header>

        <h3 className="paper-headline">{paper.headline ?? tr('A quiet day, well spent')}</h3>
        <p className="paper-deck">{paper.headline ? tr('Finished today: {0}. This one came last.', paper.done.length) : tr('No task was ticked off today. Sometimes that is the point.')}</p>

        <div className="paper-cols">
          <section>
            <h4>{tr('Done')}</h4>
            {paper.done.length ? (
              <ul>
                {paper.done.slice(0, 6).map((title, i) => (
                  <li key={i}>{title}</li>
                ))}
              </ul>
            ) : (
              <p>{tr('Nothing ticked off')}</p>
            )}
          </section>
          <section>
            <h4>{tr('Garden')}</h4>
            <p className="paper-figure">
              {paper.habits.done}
              <small>/{paper.habits.total}</small>
            </p>
            <p>{paper.habits.names.length ? paper.habits.names.join(', ') : tr('No plant watered yet')}</p>
          </section>
          <section>
            <h4>{tr('Ledger')}</h4>
            <p className="paper-figure">{formatVnd(paper.money.total)}</p>
            <p>{paper.money.biggest ? tr('Biggest: {0} ({1})', paper.money.biggest.note || tr('no note'), formatVnd(paper.money.biggest.amount)) : tr('Nothing spent')}</p>
          </section>
        </div>

        {paper.quote && (
          <blockquote className="paper-quote">
            <p>{paper.quote}</p>
            <cite>{tr('from today’s diary')}</cite>
          </blockquote>
        )}

        <footer className="paper-foot">
          <button type="button" onClick={share} disabled={busy} className="paper-btn">
            {canShare ? <Share2 size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />}
            {canShare ? tr('Share as a picture') : tr('Save as a picture')}
          </button>
          <button ref={close} type="button" onClick={closePaper} className="paper-btn" aria-label={tr('Close')}>
            <X size={15} aria-hidden="true" /> {tr('Close')}
          </button>
        </footer>
      </article>
    </div>
  );
}

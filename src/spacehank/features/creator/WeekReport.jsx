import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Download, Flame, Handshake, Megaphone, ShoppingBag, Trophy } from 'lucide-react';
import { Button, Dialog } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { locale, tr } from '../../core/i18n/lang';
import { vnd, vndShort } from './model';
import { weekReport } from './studio';
import { Label } from './ui';

const span = (from, to) => `${new Date(from).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })} – ${new Date(to).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}`;

/** The report drawn on a canvas (1080 × 1350), to keep or share: the week's money, its sources, the posts and the deals. */
const drawReport = async (r) => {
  await document.fonts?.ready;
  const W = 1080;
  const H = 1350;
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#14110d');
  g.addColorStop(1, '#241a10');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.8, 120, 0, W * 0.8, 120, 600);
  glow.addColorStop(0, 'rgba(255,190,110,0.35)');
  glow.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#d8b27a';
  ctx.font = '500 30px "Geist Mono", monospace';
  ctx.fillText(`${tr('THE WEEK IN REVIEW')} · ${span(r.from, r.to).toUpperCase()}`, 80, 130);
  ctx.fillStyle = '#f6efe2';
  ctx.font = '400 150px "Newsreader", Georgia, serif';
  ctx.fillText(vnd(r.earned), 72, 320);
  ctx.font = '400 38px "Geist", system-ui, sans-serif';
  ctx.fillStyle = r.change === null ? '#a89c88' : r.change >= 0 ? '#8fe0ae' : '#ff9a8a';
  ctx.fillText(r.change === null ? tr('earned this week') : tr('{0}% against last week', `${r.change >= 0 ? '+' : ''}${r.change}`), 80, 390);
  let y = 500;
  const top = Math.max(1, ...r.sources.map((s) => s.amount));
  for (const s of r.sources.slice(0, 4)) {
    ctx.fillStyle = '#f6efe2';
    ctx.font = '400 34px "Geist", system-ui, sans-serif';
    ctx.fillText(s.label, 80, y);
    ctx.textAlign = 'right';
    ctx.fillText(vndShort(s.amount), W - 80, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(80, y + 20, W - 160, 10);
    ctx.fillStyle = '#f0b46a';
    ctx.fillRect(80, y + 20, ((W - 160) * s.amount) / top, 10);
    y += 96;
  }
  y = Math.max(y + 40, 900);
  const boxes = [
    [tr('posted'), r.posted],
    [tr('sales'), r.sales],
    [tr('deals won'), r.won.length],
    [tr('day streak'), r.streak.current],
  ];
  boxes.forEach(([label, n], i) => {
    const x = 80 + i * 235;
    ctx.fillStyle = '#f6efe2';
    ctx.font = '400 96px "Newsreader", Georgia, serif';
    ctx.fillText(String(n), x, y);
    ctx.fillStyle = '#a89c88';
    ctx.font = '500 26px "Geist Mono", monospace';
    ctx.fillText(label.toUpperCase(), x, y + 46);
  });
  if (r.best) {
    ctx.fillStyle = '#d8b27a';
    ctx.font = '500 26px "Geist Mono", monospace';
    ctx.fillText(tr('BEST POST'), 80, y + 160);
    ctx.fillStyle = '#f6efe2';
    ctx.font = 'italic 400 52px "Newsreader", Georgia, serif';
    ctx.fillText(r.best.title.slice(0, 34), 80, y + 230);
  }
  ctx.fillStyle = '#6f6556';
  ctx.font = '500 24px "Geist Mono", monospace';
  ctx.fillText('SPACEHANK · CREATOR LAB', 80, H - 70);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
};

/** The week looked back on, every Sunday evening (or when asked): money, sources, posts, deals, what is next. */
export default function WeekReport({ entries, pieces, deals, orders, onClose }) {
  const r = useMemo(() => weekReport({ entries, pieces, deals, orders }), [entries, pieces, deals, orders]);
  const [busy, setBusy] = useState(false);
  const Arrow = r.change !== null && r.change < 0 ? ArrowDownRight : ArrowUpRight;
  const top = Math.max(1, ...r.sources.map((s) => s.amount));

  const save = async () => {
    setBusy(true);
    try {
      const blob = await drawReport(r);
      const file = new File([blob], `week-${new Date(r.from).toISOString().slice(0, 10)}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: tr('The week in review') });
      else {
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: file.name }).click();
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch {
      /* the share sheet was closed */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={span(r.from, r.to).toUpperCase()} title={tr('The week in review')} description={tr('What the week brought, and what is lined up for the next one.')}>
      <div className="flex flex-col gap-5" data-week-report>
        <div className="cl-report-hero rounded-[1.6rem] p-5">
          <Label>{tr('Earned this week')}</Label>
          <p className="mt-2 font-display text-[2.8rem] leading-none tabular-nums text-bone">{vnd(r.earned)}</p>
          {r.change !== null && (
            <span className={clsx('mt-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[0.72rem]', r.change >= 0 ? 'border-ok/35 bg-ok/10 text-ok' : 'border-danger/35 bg-danger/10 text-danger')}>
              <Arrow size={12} aria-hidden="true" /> {Math.abs(r.change)}
              {tr('% vs last week')}
            </span>
          )}
          {r.sources.length > 0 && (
            <ul className="mt-5 flex flex-col gap-2.5">
              {r.sources.map((s) => (
                <li key={s.id}>
                  <span className="flex justify-between text-[0.82rem] text-bone-dim">
                    <span>{s.label}</span>
                    <b className="font-mono font-normal tabular-nums text-bone">{vndShort(s.amount)}</b>
                  </span>
                  <i className="mt-1 block h-1.5 rounded-full bg-[linear-gradient(90deg,#f0a35a,#ffd27a)]" style={{ width: `${(s.amount / top) * 100}%` }} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {[
            [Megaphone, r.posted, tr('Posted')],
            [ShoppingBag, r.sales, tr('Sales')],
            [Handshake, r.won.length, tr('Deals won')],
            [Flame, r.streak.current, tr('Day streak')],
          ].map(([Icon, n, label]) => (
            <div key={label} className="cl-card rounded-2xl border border-line p-3.5">
              <Icon size={15} className="text-bone-faint" aria-hidden="true" />
              <b className="mt-2 block font-display text-[1.8rem] leading-none tabular-nums text-bone">{n}</b>
              <small className="font-mono text-[0.68rem] text-bone-faint">{label}</small>
            </div>
          ))}
        </div>

        {r.best && (
          <p className="flex items-start gap-2.5 rounded-2xl border border-line p-3.5 text-fine text-bone">
            <Trophy size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
            <span>
              <small className="block font-mono text-[0.66rem] text-bone-faint uppercase">{tr('Best post')}</small>
              {r.best.title}
              {r.best.results?.views > 0 && <small className="ml-2 font-mono text-[0.7rem] text-bone-dim">{tr('{0} views', r.best.results.views.toLocaleString(locale()))}</small>}
            </span>
          </p>
        )}
        {r.leads > 0 && <p className="text-fine text-bone-dim">{tr('{0} enquiries came in from the media kit.', r.leads)}</p>}

        <div>
          <Label className="mb-2">{tr('Next seven days')}</Label>
          {r.next.length === 0 ? (
            <p className="text-fine text-bone-faint">{tr('Nothing scheduled yet. Pick two ideas and give them a day.')}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {r.next.slice(0, 6).map((p) => (
                <li key={p.id} className="flex justify-between gap-3 text-fine">
                  <span className="truncate text-bone">{p.title}</span>
                  <span className="shrink-0 font-mono text-[0.72rem] text-bone-faint">{new Date(p.scheduledAt).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric' })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button onClick={save} disabled={busy} className="w-full justify-center">
          <Download size={15} aria-hidden="true" /> {tr('Save as a picture')}
        </Button>
      </div>
    </Dialog>
  );
}

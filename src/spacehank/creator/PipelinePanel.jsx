import { locale, tr } from '../lang';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarClock, Check, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, DatePicker, Dialog, Input, Textarea } from '../../shared/ui';
import { clsx } from '../../shared/lib/format';
import { useFab } from '../fab';
import { useStore } from '../store';
import DiscordComposer from './DiscordComposer';
import { PLATFORMS, STAGES, byStage, dueToPost, hashtagLine, moveStage, newPiece } from './model';
import { content } from './store';
import { Chip, CopyButton, Label, PlatformTag, Row, STAGE_HUE } from './ui';

const platformLabel = (id) => PLATFORMS.find((p) => p.id === id)?.label ?? id;
const dayInput = (at) => {
  if (!at) return '';
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const when = (at) => (at ? new Date(at).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) : '');

/** One piece of content: edit it, move it along, copy what is ready, post to Discord, record how it did. */
function PieceSheet({ piece, onClose }) {
  const [title, setTitle] = useState(piece.title);
  const [hook, setHook] = useState(piece.hook ?? '');
  const [platforms, setPlatforms] = useState(piece.platforms ?? []);
  const [date, setDate] = useState(dayInput(piece.scheduledAt));
  const [notes, setNotes] = useState(piece.notes ?? '');
  const [results, setResults] = useState(piece.results ?? { views: 0, likes: 0, revenue: 0 });
  const [discord, setDiscord] = useState(false);
  const [sure, setSure] = useState(false);
  const pack = piece.pack;

  const save = async (extra = {}) => {
    await content.update(piece.id, { title: title.trim() || piece.title, hook, platforms, notes, results, scheduledAt: date ? new Date(`${date}T09:00:00`).getTime() : null, ...extra });
  };
  const move = async (by) => {
    const moved = moveStage({ ...piece }, by);
    await save({ stage: moved.stage, postedAt: moved.postedAt });
    if (moved.stage === 'posted') onClose();
  };
  const num = (field) => (e) => setResults({ ...results, [field]: Math.max(0, Number(e.target.value) || 0) });

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={STAGES.find((s) => s.id === piece.stage)?.label.toUpperCase()} title={piece.title} description={tr('Edit this piece, move it along the pipeline, and copy or post what is ready.')}>
      <div className="flex flex-col gap-4" data-piece-sheet>
        <Input aria-label={tr('Title')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        <Textarea aria-label={tr('Opening line')} rows={2} placeholder={tr('The first line you say')} value={hook} onChange={(e) => setHook(e.target.value)} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr('Platforms')}>
          {PLATFORMS.map((p) => (
            <Chip key={p.id} on={platforms.includes(p.id)} onClick={() => setPlatforms((l) => (l.includes(p.id) ? l.filter((x) => x !== p.id) : [...l, p.id]))}>
              {p.label}
            </Chip>
          ))}
        </div>
        <Row label={tr('Post on')}>
          <DatePicker aria-label={tr('Post on')} value={date} onChange={setDate} compact className="w-full" />
        </Row>

        {piece.stage === 'posted' && (
          <div className="grid grid-cols-3 gap-2">
            {[['views', 'Views'], ['likes', 'Likes'], ['revenue', 'Earned (₫)']].map(([field, label]) => (
              <Row key={field} label={label}>
                <Input aria-label={label} inputMode="numeric" value={results[field] || ''} onChange={num(field)} compact />
              </Row>
            ))}
          </div>
        )}

        {pack && (
          <div className="flex flex-wrap gap-2">
            {pack.caption && <CopyButton text={[pack.caption, hashtagLine(pack.hashtags ?? [])].filter(Boolean).join('\n')} label={tr('Caption')} />}
            {pack.discord && <CopyButton text={pack.discord} label={tr('Discord text')} />}
            {pack.thread?.length > 0 && <CopyButton text={pack.thread.map((t, i) => `${i + 1}/ ${t}`).join('\n\n')} label={tr('Thread')} />}
          </div>
        )}

        {platforms.includes('discord') && (
          <div className="rounded-2xl border border-line p-3">
            {discord ? <DiscordComposer initial={pack?.discord ?? ''} onSent={() => setDiscord(false)} /> : (
              <Button variant="ghost" size="sm" onClick={() => setDiscord(true)} data-open-discord>
                {tr('Post to my Discord server')}
              </Button>
            )}
          </div>
        )}

        <Textarea aria-label={tr('Notes')} rows={2} placeholder={tr('Notes: what worked, what to change next time')} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => move(-1)} disabled={piece.stage === 'idea'}>
            <ArrowLeft size={14} aria-hidden="true" /> {tr('Back')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => move(1)} disabled={piece.stage === 'posted'} data-move-forward>
            {tr('Forward')} <ArrowRight size={14} aria-hidden="true" />
          </Button>
        </div>
        <Button
          onClick={async () => {
            await save();
            onClose();
          }}
          className="w-full justify-center"
          data-save-piece-sheet
        >
          <Check size={15} aria-hidden="true" /> {tr('Save')}
        </Button>
        {sure ? (
          <Button
            variant="danger"
            className="w-full justify-center"
            onClick={async () => {
              await content.remove(piece.id);
              onClose();
            }}
            onBlur={() => setSure(false)}
            autoFocus
          >
            <Trash2 size={15} aria-hidden="true" /> {tr('Tap again to delete')}
          </Button>
        ) : (
          <Button variant="ghost" className="w-full justify-center" onClick={() => setSure(true)}>
            <Trash2 size={15} aria-hidden="true" /> {tr('Delete')}
          </Button>
        )}
      </div>
    </Dialog>
  );
}

/** A quick new idea: just a title. */
function NewIdea({ onClose }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [platforms, setPlatforms] = useState(['tiktok']);
  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await content.create(newPiece({ title, platforms: platforms.length ? platforms : ['tiktok'], scheduledAt: date ? new Date(`${date}T09:00:00`).getTime() : null }));
    onClose();
  };
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={tr('NEW IDEA')} title={tr('Catch an idea')} description={tr('Write it down now, write the script later.')}>
      <form onSubmit={add} className="flex flex-col gap-4" data-new-idea>
        <Input aria-label={tr('Idea')} placeholder={tr('e.g. Build a Discord bot in 60 seconds')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} autoFocus />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr('Platforms')}>
          {PLATFORMS.map((p) => (
            <Chip key={p.id} on={platforms.includes(p.id)} onClick={() => setPlatforms((l) => (l.includes(p.id) ? l.filter((x) => x !== p.id) : [...l, p.id]))}>
              {p.label}
            </Chip>
          ))}
        </div>
        <DatePicker aria-label={tr('Post on')} value={date} onChange={setDate} placeholder={tr('Post on… (optional)')} compact className="w-full" />
        <Button type="submit" disabled={!title.trim()} className="w-full justify-center">
          <Plus size={15} aria-hidden="true" /> {tr('Add')}
        </Button>
      </form>
    </Dialog>
  );
}

/** The pipeline: every piece of content from idea to posted, as columns (like a board), with what is due today on top. */
export default function PipelinePanel() {
  const { items } = useStore(content.store);
  const [open, setOpen] = useState(null); // a piece id
  const [adding, setAdding] = useState(false);
  const groups = useMemo(() => byStage(items), [items]);
  const due = useMemo(() => dueToPost(items), [items]);
  const piece = items.find((p) => p.id === open);
  useFab({ label: tr('Catch an idea'), icon: Plus, onPress: () => setAdding(true) });

  return (
    <div className="flex flex-col gap-4" data-pipeline>
      {due.length > 0 && (
        <section className="cl-rise rounded-[1.75rem] border border-warn/35 bg-[linear-gradient(135deg,rgb(240_180_90/0.16),transparent_70%)] p-4 md:p-5" aria-label={tr('Due today')} data-due-today>
          <Label className="mb-2 flex items-center gap-1.5 text-warn">
            <CalendarClock size={13} aria-hidden="true" /> {tr('To post today')}
          </Label>
          <ul className="flex flex-col gap-1.5">
            {due.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => setOpen(p.id)} className="flex w-full items-center gap-2 text-left text-fine text-bone">
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <Badge tone="warn">{STAGES.find((s) => s.id === p.stage)?.label}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center justify-between gap-2 max-md:hidden">
        <p className="text-fine text-bone-dim">{items.length ? tr('{0} pieces. {1} posted.', items.length, groups.posted.length) : tr('Nothing here yet. Catch an idea, or write a pack in Ideas and save it.')}</p>
        <Button size="sm" onClick={() => setAdding(true)} data-add-idea>
          <Plus size={14} aria-hidden="true" /> {tr('Catch an idea')}
        </Button>
      </div>

      <div className="no-scrollbar -mx-5 flex scroll-px-5 snap-x snap-mandatory items-start gap-3 overflow-x-auto px-5 pb-3 md:mx-0 md:scroll-px-0 md:px-0" data-board>
        {STAGES.map((stage) => (
          <section key={stage.id} aria-label={stage.label} data-stage={stage.id} className="cl-surface relative flex w-[16.5rem] shrink-0 snap-start flex-col gap-2.5 overflow-hidden rounded-[1.75rem] border border-line p-3 max-md:w-[78vw]">
            <i className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, hsl(${STAGE_HUE[stage.id] ?? 220} 80% 62% / 0.8), transparent)` }} aria-hidden="true" />
            <header className="flex items-center justify-between px-1.5 pt-1">
              <h4 className="flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.12em] text-bone-dim uppercase">
                <i className="size-2 rounded-full" style={{ background: `hsl(${STAGE_HUE[stage.id] ?? 220} 80% 62%)`, boxShadow: `0 0 10px hsl(${STAGE_HUE[stage.id] ?? 220} 80% 62% / 0.6)` }} aria-hidden="true" />
                {stage.label}
              </h4>
              <span className="rounded-full bg-wash/[0.07] px-2 font-mono text-[0.68rem] tabular-nums text-bone-dim">{groups[stage.id].length}</span>
            </header>
            {groups[stage.id].length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center font-mono text-[0.7rem] text-bone-faint">{tr('Nothing here yet')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {groups[stage.id].map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => setOpen(p.id)} className="cl-card flex w-full flex-col gap-2.5 rounded-2xl border border-line p-3.5 text-left" data-piece={p.title}>
                      <b className="text-fine leading-snug font-medium text-bone">{p.title}</b>
                      {p.hook && <span className="line-clamp-2 text-[0.8rem] leading-snug text-bone-dim">“{p.hook}”</span>}
                      <span className="flex flex-wrap items-center gap-1.5">
                        {p.platforms.map((id) => (
                          <PlatformTag key={id} id={id} label={platformLabel(id)} />
                        ))}
                        {p.scheduledAt && <span className={clsx('font-mono text-[0.66rem]', p.stage !== 'posted' && p.scheduledAt < Date.now() - 86400000 ? 'text-danger' : 'text-bone-faint')}>{when(p.scheduledAt)}</span>}
                        {p.stage === 'posted' && p.results?.views > 0 && <span className="font-mono text-[0.66rem] text-ok">{p.results.views.toLocaleString('en-GB')} {tr('views')}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {piece && <PieceSheet key={piece.id} piece={piece} onClose={() => setOpen(null)} />}
      {adding && <NewIdea onClose={() => setAdding(false)} />}
    </div>
  );
}

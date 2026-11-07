import { useState } from 'react';
import { Inbox as InboxIcon, Sparkles, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader } from '../../../design-system';
import { Leave } from '../motion/Pieces';
import { clsx } from '../../../lib/format';
import { organizeText } from '../api/owner';
import { addManyToInbox, fileItem } from '../inbox/file';
import { KINDS, categoryLabel, kindLabel } from '../inbox/model';
import { inbox } from '../inbox/store';
import { startJob, useJob } from '../jobs';
import { dayKey } from '../habits/model';
import { getLang, tr } from '../lang';
import { formatVnd } from '../wallet/model';

const SHOWN = 4;
const LONG = 80;

const detail = (item) => [kindLabel(item.kind), item.amount ? formatVnd(item.amount) : '', item.kind === 'expense' && item.category ? categoryLabel(item.category) : '', item.due ? tr('due {0}', item.due) : ''].filter(Boolean).join(' · ');

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function Row({ item, first, onNotify }) {
  const job = useJob(`inbox-split-${item.id}`);
  const money = item.amount > 0;
  const [leaving, setLeaving] = useState(false);

  // the row folds shut first and is filed a moment later, so the rows below slide up instead of jumping
  const file = async (kind) => {
    setLeaving(true);
    await pause(300);
    try {
      const done = await fileItem(item, kind);
      onNotify?.(done.label);
    } catch (error) {
      setLeaving(false);
      onNotify?.(error.message);
    }
  };

  const discard = async () => {
    setLeaving(true);
    await pause(300);
    await inbox.remove(item.id);
  };

  const split = () =>
    startJob(`inbox-split-${item.id}`, async () => {
      const { items } = await organizeText({ text: item.text, today: dayKey(), language: getLang() });
      await addManyToInbox(items, item.source);
      await inbox.remove(item.id);
      onNotify?.(tr('Split into {0} things', items.length));
    });

  return (
    <li data-inbox-item>
      <Leave leaving={leaving}>
        <div className={`flex flex-col gap-2 py-3 ${first ? 'pt-0' : 'border-t border-line'}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-fine break-words whitespace-pre-line text-bone">{item.text}</p>
          <small className="font-mono text-[0.68rem] text-bone-faint">{detail(item)}</small>
        </div>
        <button type="button" aria-label={tr('Delete from the Inbox')} onClick={discard} className="grid size-8 shrink-0 place-items-center rounded-full text-bone-faint hover:text-danger active:scale-90">
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={tr('File as')}>
        {KINDS.filter((k) => (k.id === 'expense' || k.id === 'income' ? money : true)).map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => file(k.id)}
            className={clsx('h-7 rounded-full border px-2.5 font-mono text-[0.7rem] transition-colors active:scale-95', k.id === item.kind ? 'border-signal text-bone' : 'border-line text-bone-dim hover:text-bone')}
          >
            {k.label}
          </button>
        ))}
        {item.text.length > LONG && (
          <button type="button" onClick={split} disabled={job.busy} className="inline-flex h-7 items-center gap-1 rounded-full border border-line px-2.5 font-mono text-[0.7rem] text-bone-dim hover:text-bone active:scale-95 disabled:opacity-50">
            <Sparkles size={11} aria-hidden="true" /> {job.busy ? tr('Splitting…') : tr('Split with AI')}
          </button>
        )}
      </div>
      {job.error && (
        <p role="alert" className="text-[0.74rem] text-danger">
          {job.error}
        </p>
      )}
        </div>
      </Leave>
    </li>
  );
}

/** What was captured and is waiting to be sorted: one tap files each as a task, spending, note or diary line. */
export default function InboxCard({ items, onNotify }) {
  const [all, setAll] = useState(false);
  if (!items.length) return null;
  const list = all ? items : items.slice(0, SHOWN);

  const sortAll = async () => {
    let filed = 0;
    for (const item of [...items]) {
      try {
        // spending without an amount can only be a note
        await fileItem(item, (item.kind === 'expense' || item.kind === 'income') && !item.amount ? 'note' : item.kind);
        filed += 1;
      } catch {
        /* this one stays in the Inbox */
      }
    }
    onNotify?.(tr('Sorted {0} things', filed));
  };

  return (
    <Card data-inbox>
      <CardHeader
        eyebrow={tr('INBOX')}
        title={
          <span key={items.length} data-inbox-target className="bump inline-block">
            {items.length === 1 ? tr('One thing to sort') : tr('{0} things to sort', items.length)}
          </span>
        }
        aside={<InboxIcon size={17} aria-hidden="true" />}
      />
      <ul>
        {list.map((item, index) => (
          <Row key={item.id} item={item} first={index === 0} onNotify={onNotify} />
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length > 1 && (
          <Button variant="ghost" size="sm" onClick={sortAll} data-inbox-sort-all>
            {tr('Sort all by my best guess')}
          </Button>
        )}
        {items.length > SHOWN && (
          <Button variant="ghost" size="sm" onClick={() => setAll(!all)}>
            {all ? tr('Show fewer') : tr('Show all {0}', items.length)}
          </Button>
        )}
      </div>
    </Card>
  );
}

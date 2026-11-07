import { useState } from 'react';
import { Inbox as InboxIcon, Sparkles, Trash2 } from 'lucide-react';
import { Button, Card, CardHeader } from '../../../design-system';
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

function Row({ item, onNotify }) {
  const job = useJob(`inbox-split-${item.id}`);
  const money = item.amount > 0;

  const file = async (kind) => {
    try {
      const done = await fileItem(item, kind);
      onNotify?.(done.label);
    } catch (error) {
      onNotify?.(error.message);
    }
  };

  const split = () =>
    startJob(`inbox-split-${item.id}`, async () => {
      const { items } = await organizeText({ text: item.text, today: dayKey(), language: getLang() });
      await addManyToInbox(items, item.source);
      await inbox.remove(item.id);
      onNotify?.(tr('Split into {0} things', items.length));
    });

  return (
    <li className="flex flex-col gap-2 border-t border-line py-3 first:border-t-0 first:pt-0" data-inbox-item>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-fine break-words whitespace-pre-line text-bone">{item.text}</p>
          <small className="font-mono text-[0.68rem] text-bone-faint">{detail(item)}</small>
        </div>
        <button type="button" aria-label={tr('Delete from the Inbox')} onClick={() => inbox.remove(item.id)} className="grid size-8 shrink-0 place-items-center rounded-full text-bone-faint hover:text-danger active:scale-90">
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
        title={items.length === 1 ? tr('One thing to sort') : tr('{0} things to sort', items.length)}
        aside={<InboxIcon size={17} aria-hidden="true" />}
      />
      <ul>
        {list.map((item) => (
          <Row key={item.id} item={item} onNotify={onNotify} />
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

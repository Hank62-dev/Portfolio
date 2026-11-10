import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { Dialog, Dots } from '../../shared/ui';
import { clsx } from '../../shared/lib/format';
import { useStore } from '../store';
import { groupChats, summaryOf } from './model';
import { chatMsgs, chats, deleteChat, openChat, renameChat, view } from './store';
import { tr } from '../lang';
import '../i18n';

const small = 'grid size-8 shrink-0 place-items-center rounded-full text-bone-faint transition-colors hover:bg-wash/8 hover:text-bone';

/** One conversation in the list: open it, rename it (pencil), delete it (bin, pressed twice). */
function Row({ chat, current, waiting, summary, onOpen }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chat.title);
  const [sure, setSure] = useState(false);

  const save = async () => {
    setEditing(false);
    await renameChat(chat.id, title);
  };

  return (
    <li className={clsx('flex items-center gap-1 rounded-2xl pr-1 transition-colors', current ? 'bg-signal-soft' : 'hover:bg-wash/5')} data-chat={chat.id}>
      {editing ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-1 px-3 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <input
            autoFocus
            aria-label={t('rag.rename')}
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === 'Escape' && setEditing(false)}
            className="min-w-0 flex-1 rounded-lg border border-line-strong bg-ink-0 px-2.5 py-1.5 text-fine text-bone focus-visible:border-signal focus-visible:outline-none"
          />
          <button type="submit" aria-label={t('rag.save')} className={small}>
            <Check size={15} aria-hidden="true" />
          </button>
        </form>
      ) : (
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 px-3 py-2.5 text-left" aria-current={current ? 'true' : undefined}>
          <span className="flex items-center gap-2">
            <b className="truncate text-fine font-medium text-bone">{chat.title}</b>
            {waiting && <Dots size={4} className="text-signal" />}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[0.7rem] text-bone-faint">
            {t('rag.messages', { count: summary.count })}
            {summary.snippet ? ` · ${summary.snippet}` : ''}
          </span>
        </button>
      )}
      {!editing && (
        <>
          <button type="button" aria-label={t('rag.rename')} onClick={() => { setTitle(chat.title); setEditing(true); }} className={small}>
            <Pencil size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={sure ? t('rag.deleteSure') : t('rag.delete')}
            title={sure ? t('rag.deleteSure') : t('rag.delete')}
            onClick={() => (sure ? void deleteChat(chat.id) : setSure(true))}
            onBlur={() => setSure(false)}
            className={clsx(small, sure && 'bg-danger/15 text-danger hover:bg-danger/20 hover:text-danger')}
            data-delete-chat
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </li>
  );
}

/** The list of Hank conversations in a dialog (a sheet on a phone), grouped by when they were last used. */
export default function ChatHistory({ open, onOpenChange }) {
  const { t } = useTranslation();
  const { items } = useStore(chats.store);
  const { items: messages } = useStore(chatMsgs.store);
  const { active, thinking } = useStore(view);
  const groups = useMemo(() => groupChats(items), [items]);
  const summaries = useMemo(() => new Map(items.map((chat) => [chat.id, summaryOf(messages, chat.id)])), [items, messages]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} eyebrow={tr('HANK')} title={t('rag.historyTitle')} description={t('rag.historyText')}>
      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-fine text-bone-dim" data-history-empty>
          {t('rag.historyEmpty')}
        </p>
      ) : (
        <div className="-mx-2 flex max-h-[min(60vh,32rem)] flex-col gap-4 overflow-y-auto px-2" data-history>
          {groups.map((group) => (
            <section key={group.key} aria-label={t(`rag.${group.key}`)}>
              <h3 className="mb-1.5 px-3 font-mono text-[0.66rem] tracking-[0.14em] text-bone-faint uppercase">{t(`rag.${group.key}`)}</h3>
              <ul className="flex flex-col gap-0.5">
                {group.chats.map((chat) => (
                  <Row
                    key={chat.id}
                    chat={chat}
                    current={chat.id === active}
                    waiting={thinking.includes(chat.id)}
                    summary={summaries.get(chat.id) ?? { count: 0, snippet: '' }}
                    onOpen={() => {
                      openChat(chat.id);
                      onOpenChange(false);
                    }}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Dialog>
  );
}

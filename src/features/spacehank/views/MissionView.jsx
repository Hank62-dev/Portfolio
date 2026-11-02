import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, CalendarDays, Check, CircleCheck, Hourglass, Inbox, ListChecks, MoreHorizontal, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Badge, Button, Dialog, Input, Menu, Select, Textarea } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { PageHead } from '../components/Page';
import { COLUMNS, dueLabel, dueState, inColumn, moveCard, newCard, progress } from '../missions/model';
import { missions, sampleCards } from '../missions/store';
import { hueOf } from '../notes/notes';
import { useStore } from '../store';

// each column has its own icon and colour, so the board reads at a glance
const COLUMN_STYLE = {
  backlog: { icon: Inbox, hue: 220 },
  agent: { icon: Bot, hue: 265 },
  doing: { icon: Hourglass, hue: 35 },
  done: { icon: CircleCheck, hue: 145 },
};

const DUE_TONE = { overdue: 'danger', today: 'warn', soon: 'warn', later: 'default' };

function CardView({ card, agents, onOpen, onMove, onDragStart }) {
  const { done, total, pct } = progress(card.checklist);
  const due = dueState(card.due);
  const agent = agents.find((a) => a.id === card.agent);
  return (
    <li data-card={card.id} draggable onDragStart={(e) => onDragStart(e, card)} className="list-none">
      <div className="group relative rounded-2xl border border-line bg-ink-2 p-3.5 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_14px_30px_-18px_rgb(0_0_0/0.9)]">
        <button type="button" onClick={() => onOpen(card)} className="block w-full text-left" aria-label={`Open card: ${card.title}`}>
          {card.labels.length > 0 && (
            <span className="mb-2 flex flex-wrap gap-1">
              {card.labels.map((l) => (
                <span key={l} className="rounded-full px-2 py-px font-mono text-[0.64rem]" style={{ background: `hsl(${hueOf(l)} 60% 50% / 0.18)`, color: `hsl(${hueOf(l)} 85% 76%)` }}>
                  {l}
                </span>
              ))}
            </span>
          )}
          <b className={clsx('block pr-6 text-fine leading-snug font-medium', card.column === 'done' ? 'text-bone-dim line-through decoration-bone-faint' : 'text-bone')}>{card.title}</b>
          {(card.due || total > 0 || agent) && (
            <span className="mt-2.5 flex flex-wrap items-center gap-2">
              {card.due && (
                <Badge tone={DUE_TONE[due]}>
                  <CalendarDays size={11} aria-hidden="true" /> {dueLabel(card.due)}
                </Badge>
              )}
              {total > 0 && (
                <span className="flex items-center gap-1.5 font-mono text-[0.68rem] text-bone-faint">
                  <ListChecks size={12} aria-hidden="true" /> {done}/{total}
                  <i className="block h-1 w-10 overflow-hidden rounded-full bg-line">
                    <i className="block h-full rounded-full bg-signal" style={{ width: `${pct}%` }} />
                  </i>
                </span>
              )}
              {agent && (
                <span className="ml-auto flex items-center gap-1 font-mono text-[0.68rem] text-bone-dim">
                  <i className="grid size-4 place-items-center rounded-full text-[0.55rem] font-semibold text-ink-0" style={{ background: agent.color }}>
                    {agent.name.slice(0, 1)}
                  </i>
                  {agent.name}
                </span>
              )}
            </span>
          )}
        </button>
        <Menu
          align="end"
          trigger={
            <button type="button" aria-label={`Move or delete ${card.title}`} className="absolute top-2 right-2 grid size-6 place-items-center rounded-full text-bone-faint opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-bone max-sm:opacity-100">
              <MoreHorizontal size={14} aria-hidden="true" />
            </button>
          }
          items={[
            ...COLUMNS.filter((c) => c.id !== card.column).map((c) => ({ id: c.id, label: `Move to ${c.label}`, onSelect: () => onMove(card, c.id) })),
            { id: 'rm', label: 'Delete', icon: Trash2, onSelect: () => missions.remove(card.id) },
          ]}
        />
      </div>
    </li>
  );
}

function CardDialog({ card, agents, onClose, onHand }) {
  const [draft, setDraft] = useState(card);
  const [item, setItem] = useState('');
  const save = async (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    await missions.update(card.id, patch);
  };
  const toggle = (id) => save({ checklist: draft.checklist.map((c) => (c.id === id ? { ...c, done: !c.done } : c)) });
  const addItem = (e) => {
    e.preventDefault();
    if (!item.trim()) return;
    void save({ checklist: [...draft.checklist, { id: crypto.randomUUID(), text: item.trim(), done: false }] });
    setItem('');
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      eyebrow={COLUMNS.find((c) => c.id === draft.column)?.label.toUpperCase()}
      title={draft.title}
      description="Edit the card. Changes are saved as you go."
      footer={
        <>
          <Button variant="danger" size="sm" onClick={() => { void missions.remove(card.id); onClose(); }}>
            <Trash2 size={14} aria-hidden="true" /> Delete
          </Button>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Input aria-label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onBlur={() => draft.title.trim() && save({ title: draft.title.trim() })} />
        <Textarea aria-label="Notes" rows={3} placeholder="Notes" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} onBlur={() => save({ notes: draft.notes })} />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 font-mono text-fine text-bone-dim">
            Due
            <Input type="date" value={draft.due} onChange={(e) => save({ due: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 font-mono text-fine text-bone-dim">
            Labels
            <Input aria-label="Labels" placeholder="design, bug" defaultValue={draft.labels.join(', ')} onBlur={(e) => save({ labels: e.target.value.split(',').map((l) => l.trim().toLowerCase()).filter(Boolean).slice(0, 5) })} />
          </label>
        </div>
        <div>
          <span className="font-mono text-fine text-bone-dim">Checklist</span>
          <ul className="mt-1.5 flex flex-col gap-1">
            {draft.checklist.map((c) => (
              <li key={c.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-white/5">
                <button type="button" role="checkbox" aria-checked={c.done} aria-label={c.text} onClick={() => toggle(c.id)} className={clsx('grid size-5 shrink-0 place-items-center rounded-md border transition-colors', c.done ? 'border-signal bg-signal text-ink-0' : 'border-line-strong')}>
                  {c.done && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                </button>
                <span className={clsx('flex-1 text-fine', c.done ? 'text-bone-faint line-through' : 'text-bone')}>{c.text}</span>
                <button type="button" aria-label={`Remove ${c.text}`} onClick={() => save({ checklist: draft.checklist.filter((x) => x.id !== c.id) })} className="text-bone-faint hover:text-danger">
                  <X size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={addItem} className="mt-1.5 flex gap-2">
            <Input aria-label="Add a checklist item" placeholder="Add an item" value={item} onChange={(e) => setItem(e.target.value)} />
            <Button type="submit" size="sm" disabled={!item.trim()}>
              Add
            </Button>
          </form>
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-ink-2 p-3">
          <label className="flex flex-1 flex-col gap-1 font-mono text-fine text-bone-dim">
            Hand it to an agent
            <Select aria-label="Agent" value={draft.agent} onChange={(e) => save({ agent: e.target.value })}>
              <option value="">Nobody</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.role}
                </option>
              ))}
            </Select>
          </label>
          <Button size="sm" disabled={!draft.agent} onClick={() => { onHand({ ...draft }); onClose(); }}>
            <Sparkles size={14} aria-hidden="true" /> Send
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default function MissionView({ agents, events, onNewTask, onNotify, connected }) {
  const { loaded, items: cards } = useStore(missions.store);
  const [adding, setAdding] = useState(null); // the column being added to, or null
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState(null);
  const [over, setOver] = useState(null);
  const lastEvent = useRef(events[0]);

  useEffect(() => {
    void missions.load();
  }, []);

  // when an agent finishes, the card it was given moves to Done
  useEffect(() => {
    const fresh = [];
    for (const e of events) {
      if (e === lastEvent.current) break;
      fresh.push(e);
    }
    lastEvent.current = events[0];
    for (const e of fresh.reverse()) {
      if (e.action !== 'completed') continue;
      const agent = agents.find((a) => a.id === e.agentId);
      const waiting = missions.store.get().items.find((c) => c.agent === agent?.id && (c.column === 'agent' || c.column === 'doing'));
      if (waiting) {
        const changed = moveCard(missions.store.get().items, waiting.id, 'done', 0);
        void missions.putMany(changed);
        onNotify?.(`${e.name} finished “${waiting.title}”`);
      }
    }
  }, [events, agents, onNotify]);

  const byColumn = useMemo(() => Object.fromEntries(COLUMNS.map((c) => [c.id, inColumn(cards, c.id)])), [cards]);

  const move = (card, column, index = 99) => {
    void missions.putMany(moveCard(cards, card.id, column, index));
  };

  const hand = async (card) => {
    const agent = agents.find((a) => a.id === card.agent);
    const text = [card.title, card.notes].filter(Boolean).join('. ');
    if (!onNewTask(text, card.agent)) return;
    await missions.update(card.id, { agent: card.agent });
    move(card, 'agent');
    onNotify?.(`Sent to ${agent?.name ?? 'the agent'}`);
  };

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim() || !adding) return;
    await missions.create(newCard(title, adding, byColumn[adding].length));
    setTitle('');
  };

  const onDrop = (e, column) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData('text/plain');
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const nodes = [...e.currentTarget.querySelectorAll('[data-card]')].filter((n) => n.dataset.card !== id);
    const index = nodes.filter((n) => n.getBoundingClientRect().top + n.getBoundingClientRect().height / 2 < e.clientY).length;
    move(card, column, index);
    if (column === 'agent' && !card.agent) setOpen({ ...card, column });
  };

  const addSamples = () => missions.putMany(sampleCards());
  const total = cards.length;
  const doneCount = byColumn.done.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Plan" title="Mission" accent="Board." description="Ideas on the left, finished work on the right. Hand a card to an agent and it comes back to Done when they finish.">
        <span className="font-mono text-fine text-bone-dim">
          {doneCount} of {total} done
        </span>
        {!connected && <Badge tone="warn" dot>AGENTS OFFLINE</Badge>}
        {cards.some((c) => c.sample) && (
          <Button variant="ghost" size="sm" onClick={() => Promise.all(cards.filter((c) => c.sample).map((c) => missions.remove(c.id)))}>
            Remove samples
          </Button>
        )}
      </PageHead>

      {loaded && total === 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-dashed border-line-strong p-6">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lead text-bone">The board is empty</h2>
            <p className="text-fine text-bone-dim">Add a card in any column below, or start from a few examples.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={addSamples}>
            <Sparkles size={14} aria-hidden="true" /> Try with sample cards
          </Button>
        </div>
      )}

      <div className="flex snap-x gap-3 overflow-x-auto pb-3 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {COLUMNS.map((column) => (
          <section
            key={column.id}
            aria-label={column.label}
            data-column={column.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(column.id);
            }}
            onDragLeave={(e) => e.currentTarget.contains(e.relatedTarget) || setOver(null)}
            onDrop={(e) => onDrop(e, column.id)}
            className={clsx('flex min-h-[320px] w-[78vw] shrink-0 snap-start flex-col gap-3 rounded-[1.75rem] border p-3.5 transition-colors sm:w-72 lg:w-auto', over === column.id ? 'border-signal bg-signal-soft' : 'border-line bg-ink-1')}
          >
            <header className="flex items-center gap-2 px-1.5 pt-1">
              <span className="grid size-7 place-items-center rounded-full" style={{ background: `hsl(${COLUMN_STYLE[column.id].hue} 60% 50% / 0.18)`, color: `hsl(${COLUMN_STYLE[column.id].hue} 85% 76%)` }}>
                {(() => {
                  const Icon = COLUMN_STYLE[column.id].icon;
                  return <Icon size={14} aria-hidden="true" />;
                })()}
              </span>
              <h2 className="text-fine font-medium text-bone">{column.label}</h2>
              <span className="rounded-full bg-white/8 px-2 py-px font-mono text-[0.68rem] text-bone-dim tabular-nums">{byColumn[column.id].length}</span>
              <button type="button" aria-label={`Add a card to ${column.label}`} onClick={() => setAdding(adding === column.id ? null : column.id)} className="ml-auto grid size-7 place-items-center rounded-full text-bone-dim hover:bg-white/10 hover:text-bone">
                <Plus size={15} aria-hidden="true" />
              </button>
            </header>
            {adding === column.id && (
              <form onSubmit={add} className="flex gap-1.5">
                <Input autoFocus aria-label={`New card in ${column.label}`} placeholder="Card title" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setAdding(null)} className="h-9 py-1" />
                <Button type="submit" size="sm" disabled={!title.trim()}>
                  Add
                </Button>
              </form>
            )}
            <ul className="flex flex-1 flex-col gap-2.5">
              {byColumn[column.id].map((card) => (
                <CardView key={card.id} card={card} agents={agents} onOpen={setOpen} onMove={move} onDragStart={(e, c) => e.dataTransfer.setData('text/plain', c.id)} />
              ))}
              {!byColumn[column.id].length && <li className="m-auto px-4 py-6 text-center font-mono text-[0.72rem] text-bone-faint">{column.hint}</li>}
            </ul>
          </section>
        ))}
      </div>

      {open && <CardDialog key={open.id} card={cards.find((c) => c.id === open.id) ?? open} agents={agents} onClose={() => setOpen(null)} onHand={hand} />}
    </div>
  );
}

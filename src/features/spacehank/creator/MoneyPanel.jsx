import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Target, Trash2, TrendingUp } from 'lucide-react';
import { Button, Dialog, Input, Select } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { useFab } from '../fab';
import { useStore } from '../store';
import { SOURCES, bySource, earningsByPiece, goalProgress, insights, monthKeyOf, monthTotal, newIncome, sourceLabel, trend, vnd, vndShort } from './model';
import { content, creatorSettings, income, setSetting } from './store';
import { Label, Panel, Row, Stat } from './ui';

const TONE = { good: 'border-ok/40 bg-ok/10 text-ok', warn: 'border-warn/40 bg-warn/10 text-warn', info: 'border-line bg-ink-2 text-bone-dim' };
const monthName = (key) => new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short' });
const BAR_COLOURS = ['bg-signal', 'bg-ok', 'bg-warn', 'bg-[#6aa7ff]', 'bg-[#c9a5ff]', 'bg-[#ff8ab3]', 'bg-bone/60', 'bg-bone/40'];

function AddIncome({ pieces, onClose }) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('freelance');
  const [note, setNote] = useState('');
  const [piece, setPiece] = useState('');
  const value = Math.round(Number(String(amount).replace(/[^\d]/g, '')) || 0);

  const save = async (e) => {
    e.preventDefault();
    if (!value) return;
    await income.create(newIncome({ amount: value, source, note, pieceId: piece }));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow="INCOME" title="Log money that came in" description="Amounts are in Vietnamese dong. Log it when it reaches you, not when it is promised.">
      <form onSubmit={save} className="flex flex-col gap-4" data-income-form>
        <Row label="Amount (₫)">
          <Input aria-label="Amount" inputMode="numeric" placeholder="e.g. 1500000" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          {value > 0 && <span className="font-mono text-[0.72rem] text-bone-faint">{vnd(value)}</span>}
        </Row>
        <Row label="Where from">
          <Select aria-label="Source" value={source} onChange={(e) => setSource(e.target.value)} compact>
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Row>
        <Input aria-label="Note" placeholder="Note (optional), e.g. client name" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} compact />
        {pieces.length > 0 && (
          <Row label="Which video earned it? (optional)">
            <Select aria-label="Content" value={piece} onChange={(e) => setPiece(e.target.value)} compact>
              <option value="">None</option>
              {pieces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Row>
        )}
        <Button type="submit" disabled={!value} className="w-full justify-center">
          <Check size={15} aria-hidden="true" /> Log it
        </Button>
      </form>
    </Dialog>
  );
}

/** Income by source, against a monthly goal, with what the numbers say in plain words. */
export default function MoneyPanel() {
  const { items } = useStore(income.store);
  const { items: pieces } = useStore(content.store);
  const settings = useStore(creatorSettings);
  const [adding, setAdding] = useState(false);
  const [goalText, setGoalText] = useState(settings.goal ? String(settings.goal) : '');
  useFab({ label: 'Log income', icon: Plus, onPress: () => setAdding(true) });
  useEffect(() => {
    void income.load();
    void content.load();
  }, []);

  const now = Date.now();
  const key = monthKeyOf(now);
  const total = monthTotal(items, key);
  const sources = useMemo(() => bySource(items, key), [items, key]);
  const months = useMemo(() => trend(items, key, 6), [items, key]);
  const goal = settings.goal;
  const g = goalProgress({ total, goal, now });
  const notes = useMemo(() => insights(items, goal, now), [items, goal, now]);  
  const topMonth = Math.max(1, ...months.map((m) => m.total));
  const earners = useMemo(() => earningsByPiece(items, pieces).slice(0, 3), [items, pieces]);
  const previous = months.at(-2)?.total ?? 0;

  const saveGoal = () => setSetting({ goal: Math.max(0, Math.round(Number(goalText.replace(/[^\d]/g, '')) || 0)) });

  return (
    <div className="flex flex-col gap-4" data-money>
      <section className="rounded-[1.75rem] border border-line bg-[radial-gradient(80%_120%_at_0%_0%,rgb(61_220_151/0.10),transparent_60%),var(--color-ink-1)] p-5 max-md:p-4" aria-label="This month">
        <Label>{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Label>
        <p className="mt-1 flex items-baseline gap-2">
          <b className="font-display text-[2.4rem] leading-none tabular-nums text-bone" data-month-total>
            {vnd(total)}
          </b>
        </p>
        {goal > 0 ? (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Progress to the goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={g.pct}>
              <i className={clsx('block h-full rounded-full transition-[width] duration-500', g.reached ? 'bg-ok' : 'bg-signal')} style={{ width: `${g.pct}%` }} />
            </div>
            <p className="mt-1.5 flex justify-between text-[0.78rem] text-bone-dim">
              <span>{g.pct}% of {vnd(goal)}</span>
              <span>{g.reached ? 'Goal reached' : `${vnd(g.remaining)} to go`}</span>
            </p>
          </div>
        ) : (
          <p className="mt-2 text-fine text-bone-dim">Set a goal for the month to see how far you are.</p>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat value={vndShort(g.projected)} label="At this pace" tone={goal > 0 && g.projected >= goal ? 'text-ok' : 'text-bone'} />
          <Stat value={goal > 0 && !g.reached ? vndShort(g.neededPerDay) : '–'} label="Per day" />
          <Stat value={previous ? `${Math.round(((total - previous) / previous) * 100)}%` : '–'} label="vs last month" tone={previous && total >= previous ? 'text-ok' : 'text-bone'} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Target size={15} className="text-bone-faint" aria-hidden="true" />
          <Input aria-label="Monthly goal in dong" inputMode="numeric" placeholder="Goal for the month (₫)" value={goalText} onChange={(e) => setGoalText(e.target.value)} compact className="min-w-0 flex-1" />
          <Button variant="ghost" size="sm" onClick={saveGoal} data-save-goal>
            Set goal
          </Button>
        </div>
      </section>

      <Panel title="What the numbers say" aside={<TrendingUp size={16} className="text-bone-faint" aria-hidden="true" />}>
        <ul className="flex flex-col gap-2" data-insights>
          {notes.map((n, i) => (
            <li key={i} className={clsx('rounded-2xl border px-3.5 py-2.5 text-fine leading-snug', TONE[n.tone])}>
              {n.text}
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="By source">
          {sources.length === 0 ? (
            <p className="text-fine text-bone-faint">Nothing logged this month.</p>
          ) : (
            <ul className="flex flex-col gap-3" data-sources>
              {sources.map((s, i) => (
                <li key={s.source}>
                  <div className="mb-1 flex justify-between text-[0.82rem]">
                    <span className="text-bone">{sourceLabel(s.source)}</span>
                    <span className="font-mono text-bone-dim tabular-nums">{vndShort(s.amount)} · {Math.round(s.share * 100)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <i className={clsx('block h-full rounded-full', BAR_COLOURS[i % BAR_COLOURS.length])} style={{ width: `${s.share * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Last six months">
          <ol className="grid grid-cols-6 gap-2" aria-label="Income by month" data-trend>
            {months.map((m, i) => (
              <li key={m.month} className="flex flex-col items-center gap-1.5">
                <span className="font-mono text-[0.6rem] text-bone-faint tabular-nums">{m.total ? vndShort(m.total) : ''}</span>
                <span className="flex h-24 w-full max-w-9 items-end overflow-hidden rounded-xl bg-white/[0.05]">
                  <i className={clsx('block w-full rounded-xl', i === months.length - 1 ? 'bg-signal' : 'bg-bone/60')} style={{ height: m.total ? `${Math.max(8, (m.total / topMonth) * 100)}%` : 0 }} />
                </span>
                <span className={clsx('font-mono text-[0.62rem]', i === months.length - 1 ? 'text-signal' : 'text-bone-faint')}>{monthName(m.month)}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      {earners.length > 0 && (
        <Panel title="Content that earned">
          <ul className="flex flex-col gap-2">
            {earners.map((e) => (
              <li key={e.piece.id} className="flex items-center justify-between gap-3 text-fine">
                <span className="min-w-0 flex-1 truncate text-bone">{e.piece.title}</span>
                <b className="font-mono text-[0.8rem] text-ok tabular-nums">{vndShort(e.amount)}</b>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Recent" aside={<Button size="sm" onClick={() => setAdding(true)} className="max-md:hidden" data-add-income><Plus size={14} aria-hidden="true" /> Log income</Button>}>
        {items.length === 0 ? (
          <p className="text-fine text-bone-faint">No income logged yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line" data-income-list>
            {items.slice(0, 12).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-fine font-medium text-bone">{sourceLabel(e.source)}</b>
                  <small className="block truncate text-[0.74rem] text-bone-faint">
                    {new Date(e.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    {e.note ? ` · ${e.note}` : ''}
                  </small>
                </span>
                <b className="font-mono text-[0.84rem] text-bone tabular-nums">{vnd(e.amount)}</b>
                <button type="button" aria-label={`Delete ${sourceLabel(e.source)} ${vnd(e.amount)}`} onClick={() => income.remove(e.id)} className="p-1.5 text-bone-faint hover:text-danger">
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {adding && <AddIncome pieces={pieces} onClose={() => setAdding(false)} />}
    </div>
  );
}

import { locale, tr } from '../lang';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChartColumn, ChartPie, Check, CheckCircle2, Info, Plus, Receipt, Sparkles, Target, Trash2, Trophy } from 'lucide-react';
import { Button, Dialog, Input, Select } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { useFab } from '../fab';
import { useStore } from '../store';
import { SOURCES, bySource, earningsByPiece, goalProgress, insights, monthKeyOf, monthTotal, newIncome, sourceLabel, trend, vnd, vndShort } from './model';
import { content, creatorSettings, income, setSetting } from './store';
import { EmptyNote, IconBubble, Label, Panel, Row, Stat } from './ui';

const TONE = { good: 'border-ok/30 bg-ok/[0.07] text-bone', warn: 'border-warn/30 bg-warn/[0.07] text-bone', info: 'border-line bg-wash/[0.03] text-bone-dim' };
const TONE_ICON = { good: [CheckCircle2, 'text-ok'], warn: [AlertTriangle, 'text-warn'], info: [Info, 'text-bone-faint'] };
const monthName = (key) => new Date(`${key}-01T00:00:00`).toLocaleDateString(locale(), { month: 'short' });
const SOURCE_HUES = [22, 150, 46, 215, 270, 330, 180, 90];

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
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={tr('INCOME')} title={tr('Log money that came in')} description={tr('Amounts are in Vietnamese dong. Log it when it reaches you, not when it is promised.')}>
      <form onSubmit={save} className="flex flex-col gap-4" data-income-form>
        <Row label={tr('Amount (₫)')}>
          <Input aria-label={tr('Amount')} inputMode="numeric" placeholder={tr('e.g. 1500000')} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          {value > 0 && <span className="font-mono text-[0.72rem] text-bone-faint">{vnd(value)}</span>}
        </Row>
        <Row label={tr('Where from')}>
          <Select aria-label={tr('Source')} value={source} onChange={(e) => setSource(e.target.value)} compact>
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Row>
        <Input aria-label={tr('Note')} placeholder={tr('Note (optional), e.g. client name')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} compact />
        {pieces.length > 0 && (
          <Row label={tr('Which video earned it? (optional)')}>
            <Select aria-label={tr('Content')} value={piece} onChange={(e) => setPiece(e.target.value)} compact>
              <option value="">{tr('None')}</option>
              {pieces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Row>
        )}
        <Button type="submit" disabled={!value} className="w-full justify-center">
          <Check size={15} aria-hidden="true" /> {tr('Log it')}
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
  useFab({ label: tr('Log income'), icon: Plus, onPress: () => setAdding(true) });
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
      <Panel
        title={tr('Pace and goal')}
        icon={Target}
        hue={22}
        aside={
          <Button size="sm" onClick={() => setAdding(true)} className="max-md:hidden" data-add-income>
            <Plus size={14} aria-hidden="true" /> {tr('Log income')}
          </Button>
        }
      >
        {goal > 0 ? (
          <div className="mb-5">
            <div className="relative h-3 overflow-hidden rounded-full bg-wash/10" role="progressbar" aria-label={tr('Progress to the goal')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={g.pct}>
              <i
                className={clsx('cl-fill block h-full rounded-full', g.reached ? 'bg-gradient-to-r from-ok to-[#b6f0cf]' : 'bg-gradient-to-r from-[hsl(var(--app-hue)_95%_58%)] to-[hsl(calc(var(--app-hue)+34)_95%_70%)]')}
                style={{ width: `${g.pct}%`, boxShadow: '0 0 18px hsl(var(--app-hue) 95% 60% / 0.5)' }}
              />
            </div>
            <p className="mt-2 flex justify-between font-mono text-[0.72rem] text-bone-dim tabular-nums">
              <span>
                {vnd(total)} · {g.pct}%
              </span>
              <span>{g.reached ? tr('Goal reached') : tr('{0} to go', vnd(g.remaining))}</span>
            </p>
          </div>
        ) : (
          <p className="mb-4 text-fine text-bone-dim">{tr('Set a goal for the month to see how far you are and what each remaining day has to bring.')}</p>
        )}
        <div className="grid grid-cols-3 gap-2.5">
          <Stat value={vndShort(g.projected)} label={tr('At this pace')} tone={goal > 0 && g.projected >= goal ? 'text-ok' : 'text-bone'} />
          <Stat value={goal > 0 && !g.reached ? vndShort(g.neededPerDay) : '–'} label={tr('Needed per day')} />
          <Stat value={previous ? `${Math.round(((total - previous) / previous) * 100)}%` : '–'} label={tr('vs last month')} tone={previous && total >= previous ? 'text-ok' : 'text-bone'} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Label className="mr-1">{tr('Monthly goal')}</Label>
          <Input aria-label={tr('Monthly goal in dong')} inputMode="numeric" placeholder={tr('e.g. 10000000')} value={goalText} onChange={(e) => setGoalText(e.target.value)} compact className="min-w-0 flex-1" />
          <Button variant="ghost" size="sm" onClick={saveGoal} data-save-goal>
            {tr('Set goal')}
          </Button>
        </div>
      </Panel>

      <Panel title={tr('What the numbers say')} icon={Sparkles} hue={46}>
        <ul className="flex flex-col gap-2" data-insights>
          {notes.map((n, i) => {
            const [Icon, color] = TONE_ICON[n.tone] ?? TONE_ICON.info;
            return (
              <li key={i} className={clsx('flex items-start gap-3 rounded-2xl border px-3.5 py-3 text-fine leading-snug', TONE[n.tone] ?? TONE.info)}>
                <Icon size={16} className={clsx('mt-0.5 shrink-0', color)} aria-hidden="true" />
                {n.text}
              </li>
            );
          })}
        </ul>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title={tr('By source')} icon={ChartPie} hue={150}>
          {sources.length === 0 ? (
            <EmptyNote icon={ChartPie} title={tr('Nothing logged this month')}>
              {tr('Log the first payment and the sources will fill in here.')}
            </EmptyNote>
          ) : (
            <ul className="flex flex-col gap-3.5" data-sources>
              {sources.map((s, i) => {
                const hue = SOURCE_HUES[i % SOURCE_HUES.length];
                return (
                  <li key={s.source}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-[0.84rem]">
                      <span className="flex items-center gap-2 text-bone">
                        <i className="size-2 rounded-full" style={{ background: `hsl(${hue} 75% 62%)` }} aria-hidden="true" />
                        {sourceLabel(s.source)}
                      </span>
                      <span className="font-mono text-[0.76rem] text-bone-dim tabular-nums">
                        {vndShort(s.amount)} · {Math.round(s.share * 100)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-wash/[0.07]">
                      <i className="cl-fill block h-full rounded-full" style={{ width: `${s.share * 100}%`, background: `linear-gradient(90deg, hsl(${hue} 80% 58%), hsl(${hue + 24} 85% 70%))`, animationDelay: `${i * 70}ms` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title={tr('Last six months')} icon={ChartColumn} hue={215}>
          <ol className="grid grid-cols-6 gap-2.5" aria-label={tr('Income by month')} data-trend>
            {months.map((m, i) => {
              const last = i === months.length - 1;
              return (
                <li key={m.month} className="flex flex-col items-center gap-2">
                  <span className={clsx('font-mono text-[0.6rem] tabular-nums', last ? 'text-bone' : 'text-bone-faint')}>{m.total ? vndShort(m.total) : ''}</span>
                  <span className="flex h-28 w-full max-w-10 items-end overflow-hidden rounded-xl bg-wash/[0.05]">
                    <i
                      className="block w-full rounded-xl transition-[height] duration-700 ease-out-expo"
                      style={{
                        height: m.total ? `${Math.max(8, (m.total / topMonth) * 100)}%` : 0,
                        background: last ? 'linear-gradient(180deg, hsl(calc(var(--app-hue) + 20) 95% 68%), hsl(var(--app-hue) 90% 54%))' : 'linear-gradient(180deg, color-mix(in srgb, var(--color-bone) 55%, transparent), color-mix(in srgb, var(--color-bone) 22%, transparent))',
                        boxShadow: last ? '0 0 20px hsl(var(--app-hue) 95% 58% / 0.4)' : undefined,
                      }}
                    />
                  </span>
                  <span className={clsx('font-mono text-[0.62rem]', last ? 'text-signal' : 'text-bone-faint')}>{monthName(m.month)}</span>
                </li>
              );
            })}
          </ol>
        </Panel>
      </div>

      {earners.length > 0 && (
        <Panel title={tr('Content that earned')} icon={Trophy} hue={46}>
          <ul className="flex flex-col gap-1">
            {earners.map((e, i) => (
              <li key={e.piece.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 text-fine transition-colors hover:bg-wash/[0.04]">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-wash/[0.07] font-mono text-[0.72rem] text-bone-dim">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-bone">{e.piece.title}</span>
                <b className="font-mono text-[0.84rem] text-ok tabular-nums">{vndShort(e.amount)}</b>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        title={tr('Recent')}
        icon={Receipt}
        hue={22}
        aside={
          <Button size="sm" onClick={() => setAdding(true)} className="md:hidden" aria-label={tr('Log income')}>
            <Plus size={14} aria-hidden="true" /> {tr('Log')}
          </Button>
        }
      >
        {items.length === 0 ? (
          <EmptyNote icon={Receipt} title={tr('No income logged yet')}>
            {tr('Log money when it reaches you, not when it is promised. The goal, the charts and the insights all start from here.')}
          </EmptyNote>
        ) : (
          <ul className="flex flex-col" data-income-list>
            {items.slice(0, 12).map((e) => {
              const index = Math.max(0, SOURCES.findIndex((x) => x.id === e.source));
              return (
                <li key={e.id} className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-wash/[0.04]">
                  <IconBubble icon={Receipt} hue={SOURCE_HUES[index % SOURCE_HUES.length]} size="sm" />
                  <span className="min-w-0 flex-1 leading-tight">
                    <b className="block truncate text-fine font-medium text-bone">{sourceLabel(e.source)}</b>
                    <small className="block truncate text-[0.74rem] text-bone-faint">
                      {new Date(e.at).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}
                      {e.note ? ` · ${e.note}` : ''}
                    </small>
                  </span>
                  <b className="font-mono text-[0.86rem] text-bone tabular-nums">+{vnd(e.amount)}</b>
                  <button type="button" aria-label={tr('Delete {0} {1}', sourceLabel(e.source), vnd(e.amount))} onClick={() => income.remove(e.id)} className="p-1.5 text-bone-faint transition-opacity hover:text-danger md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100">
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {adding && <AddIncome pieces={pieces} onClose={() => setAdding(false)} />}
    </div>
  );
}

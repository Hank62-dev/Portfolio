import { useEffect, useMemo, useRef, useState } from 'react';
import { Banknote, Bus, Check, ChevronLeft, ChevronRight, CircleEllipsis, Download, Gamepad2, GraduationCap, HeartPulse, House, Plus, ShoppingBag, Sparkles, Target, Trash2, TrendingDown, TrendingUp, Utensils, Wallet as WalletIcon } from 'lucide-react';
import { Button } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { PageHead, Segmented, Tile } from '../components/Page';
import { useFab } from '../fab';
import { useStore } from '../store';
import { CATEGORIES, categoryOf, compact, formatVnd, inMonth, monthKey, parseEntry, summarize, toCsv } from '../wallet/model';
import { budgets, entries } from '../wallet/store';

const CAT_ICONS = { utensils: Utensils, bus: Bus, home: House, study: GraduationCap, fun: Gamepad2, health: HeartPulse, bag: ShoppingBag, cash: Banknote, other: CircleEllipsis };

/** A category's icon in a softly tinted circle. */
function CatIcon({ id, size = 16, className = 'size-9' }) {
  const cat = categoryOf(id);
  const Icon = CAT_ICONS[cat.icon] ?? CircleEllipsis;
  return (
    <span className={clsx('grid shrink-0 place-items-center rounded-full', className)} style={{ background: `hsl(${cat.hue} 60% 50% / 0.2)`, color: `hsl(${cat.hue} 85% 76%)` }}>
      <Icon size={size} aria-hidden="true" />
    </span>
  );
}

const EXAMPLES = ['ăn trưa 45k', 'grab 38 nghìn', 'cà phê 30k', 'lương 8tr'];

const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};
const shift = (key, by) => {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + by, 1));
};

/** A doughnut of each category's share, drawn with strokes on one circle. */
function Donut({ parts, total }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative size-40 shrink-0" role="img" aria-label="Spending by category">
      <svg viewBox="0 0 140 140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--color-line)" strokeWidth="16" />
        {parts.map((p) => {
          const len = (p.total / total) * c;
          const node = <circle key={p.category} cx="70" cy="70" r={r} fill="none" strokeWidth="16" stroke={`hsl(${categoryOf(p.category).hue} 75% 62%)`} strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} />;
          offset += len;
          return node;
        })}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center leading-tight">
        <span>
          <b className="block font-display text-h3 text-bone tabular-nums">{compact(total)}</b>
          <small className="font-mono text-[0.62rem] text-bone-faint">spent</small>
        </span>
      </span>
    </div>
  );
}

/** One slim bar per day of the month: how much was spent. */
function Days({ byDay, month }) {
  const [y, m] = month.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  const map = new Map(byDay.map((d) => [Number(d.day.slice(8)), d.total]));
  const max = Math.max(1, ...byDay.map((d) => d.total));
  const today = monthKey() === month ? new Date().getDate() : -1;
  return (
    <div className="flex h-28 items-end gap-[3px]" role="img" aria-label="Spending per day">
      {Array.from({ length: count }, (_, i) => {
        const v = map.get(i + 1) ?? 0;
        return <i key={i} title={`${i + 1}: ${formatVnd(v)}`} className={clsx('block flex-1 rounded-full', v ? 'bg-gradient-to-t from-signal to-[#ffb38a]' : 'bg-line', i + 1 === today && 'ring-1 ring-bone/60')} style={{ height: v ? `${Math.max(8, (v / max) * 100)}%` : '5%' }} />;
      })}
    </div>
  );
}

export default function WalletView() {
  const { loaded, items } = useStore(entries.store);
  const { items: limits } = useStore(budgets.store);
  const [month, setMonth] = useState(monthKey());
  const [text, setText] = useState('');
  const [draft, setDraft] = useState(null); // what the line was understood as, before it is saved
  const [editing, setEditing] = useState(false);
  const field = useRef(null);
  useFab({ label: 'Log money', icon: Plus, onPress: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); field.current?.focus(); } });

  useEffect(() => {
    void entries.load();
    void budgets.load();
  }, []);

  const here = useMemo(() => inMonth(items, month), [items, month]);
  const sum = useMemo(() => summarize(here), [here]);
  const days = useMemo(() => {
    const groups = new Map();
    for (const e of here) {
      const key = new Date(e.at).toDateString();
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return [...groups.entries()];
  }, [here]);
  const limitOf = (id) => limits.find((b) => b.category === id)?.amount ?? 0;

  const understand = (e) => {
    e.preventDefault();
    if (draft) {
      // Enter once more on a line that has been understood saves it
      void save();
      return;
    }
    if (!text.trim()) return;
    setDraft(parseEntry(text));
  };
  const tryExample = (example) => {
    setText(example);
    setDraft(parseEntry(example));
  };
  const retype = (type) => setDraft({ ...draft, type, category: type === 'income' ? 'income' : draft.category === 'income' ? 'other' : draft.category });

  const save = async () => {
    if (!draft || draft.amount <= 0) return;
    await entries.create({ ...draft, at: Date.now() });
    setText('');
    setDraft(null);
    setMonth(monthKey());
  };

  const empty = loaded && items.length === 0;
  const lead = sum.byCategory[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHead eyebrow="Money" title="My" accent="Wallet." description="Type it the way you would say it: “ăn trưa 45k”, “grab 38 nghìn”, “lương 8tr”. It works out the amount and the category.">
        <Button variant="ghost" size="sm" disabled={!here.length} onClick={() => { const url = URL.createObjectURL(new Blob([toCsv(here)], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = `wallet-${month}.csv`; a.click(); URL.revokeObjectURL(url); }}>
          <Download size={14} aria-hidden="true" /> Export CSV
        </Button>
      </PageHead>

      <form onSubmit={understand} className="rounded-[2rem] border border-white/10 bg-[radial-gradient(70%_130%_at_0%_0%,rgb(255_91_46/0.13),transparent_60%),radial-gradient(60%_120%_at_100%_100%,rgb(91_43_255/0.1),transparent_60%),var(--color-ink-1)] p-3 sm:p-4">
        <div className="flex items-center gap-2.5 rounded-full bg-black/35 p-1.5 pl-2 ring-1 ring-white/10 transition-shadow focus-within:ring-2 focus-within:ring-signal/55">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-signal-soft text-signal">
            <WalletIcon size={18} aria-hidden="true" />
          </span>
          <input ref={field} aria-label="Log money" placeholder="ăn trưa 45k" autoComplete="off" value={text} onChange={(e) => { setText(e.target.value); setDraft(null); }} className="h-11 min-w-0 flex-1 bg-transparent text-lead text-bone placeholder:text-bone-faint focus-visible:outline-none" />
          <Button type="submit" className="shrink-0" disabled={!text.trim()}>
            <Plus size={15} aria-hidden="true" /> Add
          </Button>
        </div>

        {!draft && !text && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 px-1" aria-label="Examples">
            <span className="font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">Try</span>
            {EXAMPLES.map((example) => (
              <button key={example} type="button" onClick={() => tryExample(example)} className="rounded-full border border-white/10 px-3 py-1 font-mono text-[0.74rem] text-bone-dim transition-colors hover:border-signal/50 hover:text-bone">
                {example}
              </button>
            ))}
          </div>
        )}

        {draft && (
          <div className="mt-4 flex animate-fade-in flex-col gap-3.5 border-t border-white/8 px-1 pt-4" data-draft>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
              <Segmented value={draft.type} onChange={retype} label="Type" options={[{ id: 'expense', label: 'Expense' }, { id: 'income', label: 'Income' }]} />
              {draft.amount ? (
                <b className={clsx('font-display text-h3 leading-none tabular-nums', draft.type === 'income' ? 'text-ok' : 'text-bone')}>{draft.type === 'income' ? '+' : ''}{formatVnd(draft.amount)}</b>
              ) : (
                <span className="text-fine text-danger">No amount found. Add one like 45k.</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Category">
              {CATEGORIES.filter((c) => (draft.type === 'income' ? c.id === 'income' || c.id === 'other' : c.id !== 'income')).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={draft.category === c.id}
                  onClick={() => setDraft({ ...draft, category: c.id })}
                  className={clsx('inline-flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-fine transition-colors', draft.category === c.id ? 'border-transparent bg-white/12 text-bone' : 'border-white/10 text-bone-dim hover:border-white/25 hover:text-bone')}
                >
                  <CatIcon id={c.id} size={13} className="size-6" /> {c.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-fine text-bone-dim">{draft.note}</span>
              <Button type="button" onClick={save} disabled={draft.amount <= 0}>
                <Check size={15} aria-hidden="true" /> Save
              </Button>
            </div>
          </div>
        )}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Previous month" onClick={() => setMonth(shift(month, -1))} className="grid size-9 place-items-center rounded-full border border-line text-bone-dim hover:text-bone">
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <h2 className="min-w-0 flex-1 text-center font-display text-lead text-bone sm:min-w-40 sm:flex-none" data-month>
          {monthLabel(month)}
        </h2>
        <button type="button" aria-label="Next month" onClick={() => setMonth(shift(month, 1))} disabled={month >= monthKey()} className="grid size-9 place-items-center rounded-full border border-line text-bone-dim hover:text-bone disabled:opacity-35">
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        {items.some((e) => e.sample) && (
          <Button variant="ghost" size="sm" className="max-md:hidden sm:ml-auto" onClick={() => Promise.all(items.filter((e) => e.sample).map((e) => entries.remove(e.id)))}>
            Remove samples
          </Button>
        )}
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-line bg-[radial-gradient(90%_140%_at_0%_0%,rgb(255_91_46/0.2),transparent_55%),radial-gradient(70%_120%_at_100%_100%,rgb(91_43_255/0.2),transparent_60%),var(--color-ink-1)] p-6 sm:p-8" data-figures aria-label="This month">
        <span className="font-mono text-[0.68rem] tracking-[0.14em] text-bone-dim uppercase">Balance this month</span>
        <b className={clsx('mt-2 block font-display leading-none tabular-nums [font-size:clamp(2.4rem,6vw,4rem)]', sum.balance < 0 ? 'text-danger' : 'text-bone')}>{formatVnd(sum.balance)}</b>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            ['Spent', formatVnd(sum.spent), 'text-bone', TrendingDown],
            ['Income', formatVnd(sum.income), 'text-ok', TrendingUp],
            ['Biggest', lead ? categoryOf(lead.category).label : '-', 'text-bone', Target],
          ].map(([label, value, tone, Icon]) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl bg-black/25 px-4 py-3 backdrop-blur max-md:flex-col max-md:items-start max-md:gap-1.5 max-md:px-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/8 text-bone-dim max-md:size-7">
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0 leading-tight">
                <small className="block font-mono text-[0.64rem] tracking-[0.12em] text-bone-faint uppercase">{label}</small>
                <b className={clsx('block truncate text-fine font-medium tabular-nums', tone)}>{value}</b>
              </span>
            </div>
          ))}
        </div>
      </section>

      {empty ? (
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-dashed border-line-strong p-6">
          <div className="min-w-[min(100%,15rem)] flex-1">
            <h2 className="font-display text-lead text-bone">Nothing logged yet</h2>
            <p className="text-fine text-bone-dim">Type your first expense above.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Tile title="By category" aside={<button type="button" onClick={() => setEditing(!editing)} className="inline-flex items-center gap-1 font-mono text-[0.72rem] text-bone-dim hover:text-bone"><Target size={12} aria-hidden="true" /> {editing ? 'Done' : 'Budgets'}</button>}>
              {sum.byCategory.length ? (
                <div className="flex flex-wrap items-center gap-5">
                  <Donut parts={sum.byCategory} total={sum.spent} />
                  <ul className="flex min-w-48 flex-1 flex-col gap-2.5">
                    {sum.byCategory.map((p) => {
                      const cat = categoryOf(p.category);
                      const limit = limitOf(p.category);
                      return (
                        <li key={p.category}>
                          <div className="flex items-center gap-2 text-fine">
                            <CatIcon id={p.category} size={13} className="size-6" />
                            <span className="flex-1 text-bone">{cat.label}</span>
                            <b className="font-mono text-[0.78rem] font-medium text-bone tabular-nums">{compact(p.total)}</b>
                            <span className="w-9 text-right font-mono text-[0.68rem] text-bone-faint tabular-nums">{p.pct}%</span>
                          </div>
                          {limit > 0 && (
                            <div className="mt-1 flex items-center gap-2">
                              <i className="block h-1 flex-1 overflow-hidden rounded-full bg-line">
                                <i className={clsx('block h-full rounded-full', p.total > limit ? 'bg-danger' : 'bg-ok')} style={{ width: `${Math.min(100, (p.total / limit) * 100)}%` }} />
                              </i>
                              <span className={clsx('font-mono text-[0.64rem]', p.total > limit ? 'text-danger' : 'text-bone-faint')}>of {compact(limit)}</span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="font-mono text-fine text-bone-faint">Nothing spent this month.</p>
              )}
              {editing && (
                <div className="mt-4 grid grid-cols-1 gap-2 border-t border-line pt-4 sm:grid-cols-2" aria-label="Monthly budgets">
                  {CATEGORIES.filter((c) => c.id !== 'income').map((c) => (
                    <label key={c.id} className="flex items-center gap-2 font-mono text-[0.72rem] text-bone-dim">
                      <span className="w-24 truncate">{c.label}</span>
                      <input
                        inputMode="numeric"
                        aria-label={`Budget for ${c.label}`}
                        placeholder="0"
                        defaultValue={limitOf(c.id) || ''}
                        onBlur={(e) => {
                          const amount = Number(e.target.value.replace(/\D/g, ''));
                          if (amount > 0) void budgets.put({ id: c.id, category: c.id, amount, createdAt: Date.now(), updatedAt: Date.now() });
                          else if (limitOf(c.id)) void budgets.remove(c.id);
                        }}
                        className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-ink-2 px-2 text-bone focus-visible:border-signal focus-visible:outline-none"
                      />
                    </label>
                  ))}
                </div>
              )}
            </Tile>

            <Tile title="Day by day" aside={<span className="inline-flex items-center gap-1 font-mono text-[0.72rem] text-bone-faint">{sum.spent > sum.income ? <TrendingDown size={12} aria-hidden="true" /> : <TrendingUp size={12} aria-hidden="true" />} {here.length} entries</span>}>
              <Days byDay={sum.byDay} month={month} />
            </Tile>
          </div>

          <Tile title="Entries">
            {days.length ? (
              <ol className="flex max-h-[420px] flex-col gap-4 overflow-y-auto pr-1">
                {days.map(([day, list]) => (
                  <li key={day}>
                    <h3 className="mb-1 font-mono text-[0.68rem] tracking-[0.1em] text-bone-faint uppercase">{new Date(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
                    <ul className="flex flex-col">
                      {list.map((e) => {
                        const cat = categoryOf(e.category);
                        return (
                          <li key={e.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/[0.04]" data-entry>
                            <CatIcon id={e.category} size={15} className="size-8" />
                            <span className="min-w-0 flex-1 leading-tight">
                              <b className="block truncate text-fine font-medium text-bone">{e.note || cat.label}</b>
                              <small className="font-mono text-[0.68rem] text-bone-faint">{cat.label}</small>
                            </span>
                            <b className={clsx('font-mono text-fine font-medium tabular-nums', e.type === 'income' ? 'text-ok' : 'text-bone')}>
                              {e.type === 'income' ? '+' : '-'}
                              {formatVnd(e.amount)}
                            </b>
                            <button type="button" aria-label={`Delete ${e.note || cat.label}`} onClick={() => entries.remove(e.id)} className="text-bone-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100 max-sm:opacity-100">
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="font-mono text-fine text-bone-faint">No entries in {monthLabel(month)}.</p>
            )}
          </Tile>
        </>
      )}
    </div>
  );
}

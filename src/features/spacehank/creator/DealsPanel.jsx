import { locale, tr } from '../lang';
import { useEffect, useMemo, useState } from 'react';
import { Calculator, CalendarClock, Check, FileText, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Badge, Button, DatePicker, Dialog, Input, Select, Textarea, pushToast } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { generatePitch } from '../api/owner';
import { useFab } from '../fab';
import { Segmented } from '../components/Page';
import { useStore } from '../store';
import { CHANNELS, DEAL_KINDS, DEAL_STAGES, dueFollowUps, forgotten, newDeal, packagePrice, pipelineValue, quoteHtml, quoteTotals, sponsorRate, vnd, vndShort, winRate } from './model';
import { creatorSettings, deals, setSetting } from './store';
import { CopyButton, Label, Panel, Row, STAGE_HUE, Stat } from './ui';

const KIND_LABEL = Object.fromEntries(DEAL_KINDS.map((k) => [k.id, k.label]));
const dayInput = (at) => {
  if (!at) return '';
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const atOf = (value) => (value ? new Date(`${value}T09:00:00`).getTime() : null);
const when = (at) => (at ? new Date(at).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) : 'no date');
const numeric = (text) => Math.round(Number(String(text).replace(/[^\d]/g, '')) || 0);

/** One deal: who, how much, where it stands, when to follow up, and a message drafted for you. */
function DealSheet({ deal, onClose }) {
  const editing = Boolean(deal?.id);
  const settings = useStore(creatorSettings);
  const [name, setName] = useState(deal?.name ?? '');
  const [kind, setKind] = useState(deal?.kind ?? 'client');
  const [channel, setChannel] = useState(deal?.channel ?? 'Discord');
  const [stage, setStage] = useState(deal?.stage ?? 'lead');
  const [value, setValue] = useState(deal?.value ? String(deal.value) : '');
  const [date, setDate] = useState(dayInput(deal?.followUpAt));
  const [note, setNote] = useState(deal?.note ?? '');
  const [offer, setOffer] = useState('');
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sure, setSure] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const fields = { name: name.trim().slice(0, 80), kind, channel, stage, value: numeric(value), followUpAt: atOf(date), note: note.trim().slice(0, 600) };
    if (editing) await deals.update(deal.id, fields);
    else await deals.create({ ...newDeal(fields), ...fields });
    onClose();
  };

  const write = async (type) => {
    setBusy(true);
    setError('');
    try {
      setDraft(await generatePitch({ kind: type, who: name, offer: offer || note, about: settings.niche ? `A creator and developer in ${settings.niche}` : '', channel, language: settings.language }));
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={editing ? tr('DEAL') : tr('NEW DEAL')} title={editing ? deal.name : tr('Add someone to follow')} description={tr('A sponsor, a client or a collaboration: who, how much, when to follow up.')}>
      <form onSubmit={save} className="flex flex-col gap-4" data-deal-form>
        <Input aria-label={tr('Who')} placeholder={tr('Name or company')} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus={!editing} />
        <div className="grid grid-cols-2 gap-3">
          <Row label={tr('Type')}>
            <Select aria-label={tr('Type')} value={kind} onChange={(e) => setKind(e.target.value)} compact>
              {DEAL_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </Select>
          </Row>
          <Row label={tr('Talking on')}>
            <Select aria-label={tr('Channel')} value={channel} onChange={(e) => setChannel(e.target.value)} compact>
              {CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Row>
          <Row label={tr('Stage')}>
            <Select aria-label={tr('Stage')} value={stage} onChange={(e) => setStage(e.target.value)} compact>
              {DEAL_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Row>
          <Row label={tr('Worth (₫)')}>
            <Input aria-label={tr('Value')} inputMode="numeric" placeholder="0" value={value} onChange={(e) => setValue(e.target.value)} compact />
          </Row>
        </div>
        <Row label={tr('Follow up on')}>
          <DatePicker aria-label={tr('Follow up on')} value={date} onChange={setDate} compact className="w-full" />
        </Row>
        <Textarea aria-label={tr('Notes')} rows={2} placeholder={tr('Notes: what they need, what was said')} value={note} onChange={(e) => setNote(e.target.value)} />

        {editing && (
          <div className="rounded-2xl border border-line p-3" data-pitch>
            <Label className="mb-2">{tr('Draft a message')}</Label>
            <Input aria-label={tr('What you offer')} placeholder={tr('What are you offering them? (one sentence)')} value={offer} onChange={(e) => setOffer(e.target.value)} compact />
            <div className="mt-2 flex flex-wrap gap-2">
              {[['sponsor', 'First pitch (brand)'], ['client', 'First pitch (client)'], ['followup', 'Follow-up'], ['proposal', 'Proposal']].map(([type, label]) => (
                <Button key={type} type="button" variant="ghost" size="sm" loading={busy} disabled={!(offer || note).trim()} onClick={() => write(type)}>
                  <Sparkles size={13} aria-hidden="true" /> {label}
                </Button>
              ))}
            </div>
            {!(offer || note).trim() && <p className="mt-2 text-[0.74rem] text-bone-faint">{tr('Say what you are offering, in a sentence, and the buttons turn on.')}</p>}
            {error && (
              <p className="mt-2 text-fine text-danger" role="alert">
                {error}
              </p>
            )}
            {draft && (
              <div className="mt-3 flex flex-col gap-2">
                {draft.subject && <p className="text-fine font-medium text-bone">{draft.subject}</p>}
                <Textarea aria-label={tr('Draft')} rows={8} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
                <CopyButton text={[draft.subject, draft.message].filter(Boolean).join('\n\n')} label={tr('Copy message')} />
                <p className="text-[0.74rem] text-bone-faint">{tr('Read it, fill the [brackets] and make it yours before you send. It never sends by itself.')}</p>
              </div>
            )}
          </div>
        )}

        <Button type="submit" disabled={!name.trim()} className="w-full justify-center">
          <Check size={15} aria-hidden="true" /> {editing ? tr('Save') : tr('Add')}
        </Button>
        {editing &&
          (sure ? (
            <Button
              type="button"
              variant="danger"
              className="w-full justify-center"
              onClick={async () => {
                await deals.remove(deal.id);
                onClose();
              }}
              onBlur={() => setSure(false)}
              autoFocus
            >
              <Trash2 size={15} aria-hidden="true" /> {tr('Tap again to delete')}
            </Button>
          ) : (
            <Button type="button" variant="ghost" className="w-full justify-center" onClick={() => setSure(true)}>
              <Trash2 size={15} aria-hidden="true" /> {tr('Delete')}
            </Button>
          ))}
      </form>
    </Dialog>
  );
}

/** A quote for a client: line items, discount, VAT; opens as a clean page to print or save as PDF. */
function QuoteSheet({ onClose }) {
  const settings = useStore(creatorSettings);
  const [from, setFrom] = useState(settings.business ?? '');
  const [to, setTo] = useState('');
  const [title, setTitle] = useState('Báo giá dịch vụ');
  const [items, setItems] = useState([{ desc: '', qty: '1', unit: '' }]);
  const [discountPct, setDiscountPct] = useState('0');
  const [vatPct, setVatPct] = useState('0');
  const [terms, setTerms] = useState('Thanh toán 50% khi bắt đầu, 50% khi bàn giao.\nBáo giá có hiệu lực trong 14 ngày.');
  const parsed = items.map((i) => ({ desc: i.desc, qty: Number(i.qty) || 0, unit: numeric(i.unit) }));
  const totals = quoteTotals(parsed, { discountPct: Number(discountPct) || 0, vatPct: Number(vatPct) || 0 });
  const set = (index, patch) => setItems((list) => list.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const open = () => {
    setSetting({ business: from });
    const html = quoteHtml({ from, to, title, items: parsed, discountPct: Number(discountPct) || 0, vatPct: Number(vatPct) || 0, terms });
    const win = window.open('', '_blank');
    if (!win) {
      pushToast(tr('The browser blocked the new window. Allow pop-ups for this site and try again.'), { tone: 'error' });
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.setTimeout(() => win.print(), 300);
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={tr('QUOTE')} title={tr('Write a quote')} description={tr('Fill it in, then print it or save it as a PDF from the print window.')}>
      <div className="flex flex-col gap-4" data-quote>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input aria-label={tr('From (your name or business)')} placeholder={tr('From: you')} value={from} onChange={(e) => setFrom(e.target.value)} compact />
          <Input aria-label={tr('To (the client)')} placeholder={tr('To: the client')} value={to} onChange={(e) => setTo(e.target.value)} compact />
        </div>
        <Input aria-label={tr('Title')} value={title} onChange={(e) => setTitle(e.target.value)} compact />
        <ul className="flex flex-col gap-2">
          {items.map((it, i) => (
            <li key={i} className="grid grid-cols-[1fr_3.5rem_6.5rem_auto] items-center gap-2">
              <Input aria-label={tr('Item {0}', i + 1)} placeholder={tr('What')} value={it.desc} onChange={(e) => set(i, { desc: e.target.value })} compact />
              <Input aria-label={tr('Quantity {0}', i + 1)} inputMode="numeric" value={it.qty} onChange={(e) => set(i, { qty: e.target.value })} compact />
              <Input aria-label={tr('Price {0}', i + 1)} inputMode="numeric" placeholder="₫" value={it.unit} onChange={(e) => set(i, { unit: e.target.value })} compact />
              <button type="button" aria-label={tr('Remove item {0}', i + 1)} onClick={() => setItems((l) => (l.length > 1 ? l.filter((_, j) => j !== i) : l))} className="p-1.5 text-bone-faint hover:text-danger">
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="ghost" size="sm" onClick={() => setItems((l) => [...l, { desc: '', qty: '1', unit: '' }])} className="self-start">
          <Plus size={14} aria-hidden="true" /> {tr('Add a line')}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Row label={tr('Discount %')}>
            <Input aria-label={tr('Discount percent')} inputMode="decimal" value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} compact />
          </Row>
          <Row label={tr('VAT %')}>
            <Input aria-label={tr('VAT percent')} inputMode="decimal" value={vatPct} onChange={(e) => setVatPct(e.target.value)} compact />
          </Row>
        </div>
        <Textarea aria-label={tr('Terms')} rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
        <p className="flex justify-between rounded-2xl bg-wash/[0.05] px-4 py-3 text-fine text-bone">
          <span>{tr('Total')}</span>
          <b className="font-mono tabular-nums" data-quote-total>
            {vnd(totals.total)}
          </b>
        </p>
        <Button onClick={open} disabled={!totals.total} className="w-full justify-center" data-print-quote>
          <FileText size={15} aria-hidden="true" /> {tr('Open to print or save as PDF')}
        </Button>
      </div>
    </Dialog>
  );
}

/** What to ask for: a price for a piece of work, and a rate for a sponsored video. Your numbers, not mine: these are tools to think with. */
function Calculators() {
  const settings = useStore(creatorSettings);
  const [hours, setHours] = useState('10');
  const [buffer, setBuffer] = useState('15');
  const [views, setViews] = useState('');
  const job = packagePrice({ hourly: settings.hourly, hours: Number(hours) || 0, bufferPct: Number(buffer) || 0 });
  const rate = sponsorRate({ avgViews: numeric(views), cpm: settings.cpm });
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-calculators>
      <Panel title={tr('Price a piece of work')} aside={<Calculator size={16} className="text-bone-faint" aria-hidden="true" />}>
        <div className="grid grid-cols-3 gap-2">
          <Row label={tr('₫ / hour')}>
            <Input aria-label={tr('Hourly target')} inputMode="numeric" value={settings.hourly || ''} onChange={(e) => setSetting({ hourly: numeric(e.target.value) })} compact />
          </Row>
          <Row label={tr('Hours')}>
            <Input aria-label={tr('Hours')} inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} compact />
          </Row>
          <Row label={tr('Buffer %')}>
            <Input aria-label={tr('Buffer percent')} inputMode="decimal" value={buffer} onChange={(e) => setBuffer(e.target.value)} compact />
          </Row>
        </div>
        <p className="mt-3 flex items-baseline justify-between">
          <span className="text-fine text-bone-dim">{tr('Ask for')}</span>
          <b className="font-display text-[1.5rem] tabular-nums text-bone" data-job-price>
            {vnd(job.total)}
          </b>
        </p>
        <p className="mt-1 text-[0.76rem] leading-relaxed text-bone-faint">{vnd(job.base)} {tr('of work plus')} {vnd(job.buffer)} {tr('for what always goes wrong. Quote the whole job, not the hours.')}</p>
      </Panel>
      <Panel title={tr('Rate for a sponsored video')}>
        <div className="grid grid-cols-2 gap-2">
          <Row label={tr('Average views')}>
            <Input aria-label={tr('Average views')} inputMode="numeric" placeholder={tr('e.g. 20000')} value={views} onChange={(e) => setViews(e.target.value)} compact />
          </Row>
          <Row label={tr('CPM (₫ per 1000 views)')}>
            <Input aria-label={tr('CPM')} inputMode="numeric" value={settings.cpm || ''} onChange={(e) => setSetting({ cpm: numeric(e.target.value) })} compact />
          </Row>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat value={vndShort(rate.low)} label={tr('Low')} />
          <Stat value={vndShort(rate.mid)} label={tr('Middle')} tone="text-signal" />
          <Stat value={vndShort(rate.high)} label={tr('High')} />
        </div>
        <p className="mt-2 text-[0.76rem] leading-relaxed text-bone-faint">{tr('The CPM is your own assumption. Ask a few creators or brands in your niche what they pay, and use that: it changes a lot between niches and countries.')}</p>
      </Panel>
    </div>
  );
}

/** Sponsors, clients and collaborations: a board by stage, what is due, and the tools to price and quote. */
export default function DealsPanel() {
  const { items } = useStore(deals.store);
  const [sheet, setSheet] = useState(null); // { deal? }
  const [quote, setQuote] = useState(false);
  const [view, setView] = useState('board');
  useFab({ label: tr('Add a deal'), icon: Plus, onPress: () => setSheet({}) });
  useEffect(() => {
    void deals.load();
  }, []);

  const value = useMemo(() => pipelineValue(items), [items]);
  const due = useMemo(() => dueFollowUps(items), [items]);
  const lost = useMemo(() => forgotten(items), [items]);
  const rate = winRate(items);

  return (
    <div className="flex flex-col gap-4" data-deals>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat value={vndShort(value.open)} label={tr('Open deals')} />
        <Stat value={vndShort(value.weighted)} label={tr('Likely (weighted)')} tone="text-signal" />
        <Stat value={vndShort(value.won)} label={tr('Won')} tone="text-ok" />
        <Stat value={rate === null ? '–' : `${rate}%`} label={tr('Win rate')} />
      </div>

      {due.length > 0 && (
        <section className="cl-rise rounded-[1.75rem] border border-warn/35 bg-[linear-gradient(135deg,rgb(240_180_90/0.16),transparent_70%)] p-4 md:p-5" aria-label={tr('Follow up today')} data-follow-ups>
          <Label className="mb-2 flex items-center gap-1.5 text-warn">
            <CalendarClock size={13} aria-hidden="true" /> {tr('Follow up')}
          </Label>
          <ul className="flex flex-col gap-1.5">
            {due.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setSheet({ deal: d })} className="flex w-full items-center gap-2 text-left text-fine text-bone">
                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                  <span className="font-mono text-[0.7rem] text-warn">{when(d.followUpAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {lost.length > 0 && <p className="px-1 text-[0.8rem] text-bone-faint">{lost.length} {tr('open')} {lost.length === 1 ? tr('deal has') : tr('deals have')} {tr('no follow-up date, so')} {lost.length === 1 ? tr('it') : tr('they')} {tr('will be forgotten:')} {lost.slice(0, 3).map((d) => d.name).join(', ')}.</p>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented label={tr('Deals view')} value={view} onChange={setView} options={[{ id: 'board', label: tr('Board') }, { id: 'tools', label: tr('Pricing & quotes') }]} />
        <div className="flex gap-2 max-md:hidden">
          <Button variant="ghost" size="sm" onClick={() => setQuote(true)}>
            <FileText size={14} aria-hidden="true" /> {tr('Quote')}
          </Button>
          <Button size="sm" onClick={() => setSheet({})} data-add-deal>
            <Plus size={14} aria-hidden="true" /> {tr('Add a deal')}
          </Button>
        </div>
      </div>

      {view === 'tools' ? (
        <>
          <Calculators />
          <Button variant="ghost" onClick={() => setQuote(true)} className="self-start" data-open-quote>
            <FileText size={15} aria-hidden="true" /> {tr('Write a quote')}
          </Button>
        </>
      ) : (
        <div className="no-scrollbar -mx-5 flex scroll-px-5 snap-x snap-mandatory items-start gap-3 overflow-x-auto px-5 pb-3 md:mx-0 md:scroll-px-0 md:px-0" data-board>
          {DEAL_STAGES.map((stage) => {
            const list = items.filter((d) => d.stage === stage.id);
            return (
              <section key={stage.id} aria-label={stage.label} data-deal-stage={stage.id} className="cl-surface relative flex w-[16.5rem] shrink-0 snap-start flex-col gap-2.5 overflow-hidden rounded-[1.75rem] border border-line p-3 max-md:w-[78vw]">
                <i className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, hsl(${STAGE_HUE[stage.id] ?? 220} 80% 62% / 0.8), transparent)` }} aria-hidden="true" />
                <header className="flex items-center justify-between px-1.5 pt-1">
                  <h4 className="flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.12em] text-bone-dim uppercase">
                <i className="size-2 rounded-full" style={{ background: `hsl(${STAGE_HUE[stage.id] ?? 220} 80% 62%)`, boxShadow: `0 0 10px hsl(${STAGE_HUE[stage.id] ?? 220} 80% 62% / 0.6)` }} aria-hidden="true" />
                {stage.label}
              </h4>
                  <span className="rounded-full bg-wash/[0.07] px-2 font-mono text-[0.68rem] tabular-nums text-bone-dim">{list.length}</span>
                </header>
                {list.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line px-3 py-6 text-center font-mono text-[0.7rem] text-bone-faint">{tr('Nothing here yet')}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {list.map((d) => (
                      <li key={d.id}>
                        <button type="button" onClick={() => setSheet({ deal: d })} className="cl-card flex w-full flex-col gap-2.5 rounded-2xl border border-line p-3.5 text-left" data-deal={d.name}>
                          <b className="text-fine leading-snug font-medium text-bone">{d.name}</b>
                          <span className="flex flex-wrap items-center gap-1.5">
                            <Badge>{KIND_LABEL[d.kind] ?? d.kind}</Badge>
                            {d.value > 0 && <span className="font-mono text-[0.72rem] text-bone-dim">{vndShort(d.value)}</span>}
                            {d.followUpAt && !['won', 'lost'].includes(d.stage) && <span className={clsx('font-mono text-[0.68rem]', d.followUpAt < Date.now() - 86400000 ? 'text-danger' : 'text-bone-faint')}>{when(d.followUpAt)}</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {sheet && <DealSheet key={sheet.deal?.id ?? 'new'} deal={sheet.deal} onClose={() => setSheet(null)} />}
      {quote && <QuoteSheet onClose={() => setQuote(false)} />}
    </div>
  );
}

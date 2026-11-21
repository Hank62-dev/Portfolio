import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CalendarClock, Check, Coffee, Copy, ExternalLink, FileText, Gem, Landmark, Mail, Package, Plus, RefreshCw, ShoppingBag, Trash2, X, Zap } from 'lucide-react';
import { Badge, Button, Input, Select, Textarea, pushToast } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { Segmented } from '../../ui/Page';
import { useStore } from '../../core/store';
import { locale, tr } from '../../core/i18n/lang';
import { vnd, vndShort } from './model';
import { dropOrder, loadShop, saveShop, setOrder, shop, siteOrigin } from './shopStore';
import { orderState, payLink, salesSummary } from './studio';
import { Chip, EmptyNote, Label, Panel, Row, Stat, copyText } from './ui';

export const BANKS = [
  ['MB', 'MB Bank'],
  ['VCB', 'Vietcombank'],
  ['TCB', 'Techcombank'],
  ['ACB', 'ACB'],
  ['BIDV', 'BIDV'],
  ['ICB', 'VietinBank'],
  ['VBA', 'Agribank'],
  ['VPB', 'VPBank'],
  ['TPB', 'TPBank'],
  ['STB', 'Sacombank'],
  ['HDB', 'HDBank'],
  ['VIB', 'VIB'],
  ['SHB', 'SHB'],
  ['MSB', 'MSB'],
  ['OCB', 'OCB'],
  ['EIB', 'Eximbank'],
  ['SEAB', 'SeABank'],
  ['CAKE', 'CAKE'],
  ['TIMO', 'Timo'],
];

const KIND_ICON = { product: Package, booking: CalendarClock, membership: Gem, tip: Coffee, invoice: FileText, lead: Mail };
const KIND_LABEL = { product: tr('Product'), booking: tr('Call'), membership: tr('Membership'), tip: tr('Tip'), invoice: tr('Invoice'), lead: tr('Enquiry') };
const STATE = {
  paid: { label: tr('Paid'), tone: 'ok' },
  pending: { label: tr('Waiting'), tone: 'warn' },
  overdue: { label: tr('Overdue'), tone: 'danger' },
  expired: { label: tr('Lapsed'), tone: 'default' },
  cancelled: { label: tr('Cancelled'), tone: 'default' },
  new: { label: tr('New'), tone: 'warn' },
  done: { label: tr('Answered'), tone: 'default' },
};
const num = (v) => Math.max(0, Math.round(Number(String(v).replace(/[^\d]/g, '')) || 0));
const when = (at) => new Date(at).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** The public pages, each with its address to copy or open. */
export function PublicDoors({ pages }) {
  return (
    <div className="flex flex-wrap gap-2" data-public-doors>
      {pages.map(([path, label]) => (
        <span key={path} className="inline-flex items-center overflow-hidden rounded-full border border-line">
          <a href={path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[0.74rem] text-bone-dim hover:text-bone">
            {label} <ExternalLink size={11} aria-hidden="true" />
          </a>
          <button type="button" onClick={() => copyText(`${siteOrigin()}${path}`, tr('Address copied'))} className="border-l border-line px-2.5 py-1.5 text-bone-faint hover:text-bone" aria-label={tr('Copy the address of {0}', label)}>
            <Copy size={12} aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

/** One order or enquiry: what, who, how much, where it stands, and what can be done about it. */
function OrderRow({ order }) {
  const state = orderState(order);
  const Icon = KIND_ICON[order.kind] ?? Package;
  const [busy, setBusy] = useState(false);
  const act = (fn) => async () => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      pushToast(e.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="cl-card flex flex-col gap-3 rounded-2xl border border-line p-3.5 md:flex-row md:items-center" data-order={order.code || order.id}>
      <span className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-wash/[0.07] text-bone-dim">
          <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <b className="block truncate text-fine font-medium text-bone">{order.title}</b>
          <small className="block truncate font-mono text-[0.68rem] text-bone-faint">
            {KIND_LABEL[order.kind]} {order.code && `· ${order.code}`} · {when(order.createdAt)}
          </small>
          {(order.buyer?.name || order.buyer?.contact) && <small className="block truncate text-[0.76rem] text-bone-dim">{[order.buyer.name, order.buyer.contact, order.buyer.discordId && `Discord ${order.buyer.discordId}`].filter(Boolean).join(' · ')}</small>}
          {order.slot && <small className="block text-[0.76rem] text-bone">{when(order.slot.start)}</small>}
          {order.kind === 'lead' && order.buyer?.note && <small className="mt-1 line-clamp-3 block text-[0.78rem] text-bone-dim">{order.buyer.note}</small>}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2 md:justify-end">
        {order.amount > 0 && <b className="font-mono text-fine tabular-nums text-bone">{vnd(order.amount)}</b>}
        <Badge tone={STATE[state]?.tone}>{STATE[state]?.label}</Badge>
        {order.kind !== 'lead' && (state === 'pending' || state === 'overdue' || state === 'expired') && (
          <Button size="sm" onClick={act(() => setOrder(order.id, 'paid'))} disabled={busy} data-mark-paid>
            <Check size={13} aria-hidden="true" /> {tr('Mark paid')}
          </Button>
        )}
        {order.kind === 'lead' && state === 'new' && (
          <Button size="sm" variant="ghost" onClick={act(() => setOrder(order.id, 'done'))} disabled={busy}>
            <Check size={13} aria-hidden="true" /> {tr('Answered')}
          </Button>
        )}
        {order.kind !== 'lead' && (
          <button type="button" className="rounded-full p-2 text-bone-faint hover:text-bone" onClick={() => copyText(payLink(siteOrigin(), order), tr('Payment link copied'))} aria-label={tr('Copy the payment link')}>
            <Copy size={14} aria-hidden="true" />
          </button>
        )}
        {(state === 'pending' || state === 'overdue') && (
          <button type="button" className="rounded-full p-2 text-bone-faint hover:text-warn" onClick={act(() => setOrder(order.id, 'cancelled'))} aria-label={tr('Cancel the order')}>
            <X size={14} aria-hidden="true" />
          </button>
        )}
        <button type="button" className="rounded-full p-2 text-bone-faint hover:text-danger" onClick={act(() => dropOrder(order.id))} aria-label={tr('Delete')}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </span>
    </li>
  );
}

const FILTERS = [
  { id: 'open', label: tr('To act on') },
  { id: 'paid', label: tr('Paid') },
  { id: 'invoice', label: tr('Invoices') },
  { id: 'all', label: tr('All') },
];

function Orders({ orders }) {
  const [filter, setFilter] = useState('open');
  const shown = orders.filter((o) => {
    const s = orderState(o);
    if (o.kind === 'lead') return false;
    if (filter === 'open') return s === 'pending' || s === 'overdue';
    if (filter === 'paid') return s === 'paid';
    if (filter === 'invoice') return o.kind === 'invoice';
    return true;
  });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Chip key={f.id} on={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Chip>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyNote icon={ShoppingBag} title={filter === 'open' ? tr('Nothing waits on you') : tr('No orders here yet')}>
          {tr('Orders from the shop, calls, memberships, tips and the invoices you send all land here. Paid ones go into Money by themselves.')}
        </EmptyNote>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** A list of things the owner edits as cards: each with its fields, a switch to show it, and a bin. */
function ListEditor({ items, onChange, make, render, addLabel, empty }) {
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && <p className="text-fine text-bone-faint">{empty}</p>}
      {items.map((item, i) => (
        <div key={item.key ?? i} className="cl-card relative flex flex-col gap-2.5 rounded-2xl border border-line p-3.5">
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
            <button type="button" onClick={() => onChange(items.map((x, j) => (j === i ? { ...x, active: x.active === false } : x)))} className={clsx('rounded-full px-2.5 py-1 font-mono text-[0.64rem]', item.active === false ? 'bg-wash/[0.06] text-bone-faint' : 'bg-ok/15 text-ok')} aria-pressed={item.active !== false}>
              {item.active === false ? tr('Hidden') : tr('Shown')}
            </button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="rounded-full p-1.5 text-bone-faint hover:text-danger" aria-label={tr('Remove')}>
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
          {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={() => onChange([...items, { ...make(), key: crypto.randomUUID() }])} className="self-start">
        <Plus size={14} aria-hidden="true" /> {addLabel}
      </Button>
    </div>
  );
}

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const dayName = (d) => new Date(2026, 10, 15 + d).toLocaleDateString(locale(), { weekday: 'short' });

const SUBS = [
  { id: 'orders', label: tr('Orders'), icon: ShoppingBag },
  { id: 'products', label: tr('Products'), icon: Package },
  { id: 'calls', label: tr('Calls'), icon: CalendarClock },
  { id: 'members', label: tr('Membership'), icon: Gem },
  { id: 'payments', label: tr('Payments'), icon: Landmark },
];

/**
 * The shop: what sells on the portfolio and what came of it. Orders (paid ones go into Money by themselves), the products and
 * their download links, paid calls, the membership tiers, and how money arrives (the bank account for the VietQR code, tips).
 */
export default function StorePanel() {
  const state = useStore(shop);
  const [sub, setSub] = useState('orders');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadShop();
  }, []);
  useEffect(() => {
    if (state.config) setDraft(state.config);
  }, [state.config]);

  const summary = useMemo(() => salesSummary(state.orders), [state.orders]);
  const dirty = draft && state.config && JSON.stringify(draft) !== JSON.stringify(state.config);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const save = async () => {
    setSaving(true);
    try {
      await saveShop(draft);
      pushToast(tr('The shop is updated'), { tone: 'success' });
    } catch (e) {
      pushToast(e.message, { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!state.loaded) return <p className="font-mono text-fine text-bone-dim">{tr('Opening the shop…')}</p>;
  if (!draft) {
    return (
      <EmptyNote icon={ShoppingBag} title={tr('The shop could not be reached')}>
        {state.error}
      </EmptyNote>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-store>
      <section className="cl-hero cl-rise rounded-[2rem] border border-line p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Label>{tr('The shop on your portfolio')}</Label>
            <p className="mt-2 max-w-[52ch] text-fine text-bone-dim">{tr('Visitors pay by bank transfer with a VietQR code that carries the order’s code. Paid orders land in Money by themselves.')}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={state.autoPay ? 'ok' : 'warn'}>
              <Zap size={11} aria-hidden="true" /> {state.autoPay ? tr('Payments confirm themselves (SePay)') : tr('You confirm payments by hand')}
            </Badge>
            {state.discordBot && (
              <Badge tone="ok">
                <BadgeCheck size={11} aria-hidden="true" /> {tr('Discord roles by themselves')}
              </Badge>
            )}
            <button type="button" onClick={() => loadShop(true)} className="rounded-full p-1.5 text-bone-faint hover:text-bone" aria-label={tr('Refresh')}>
              <RefreshCw size={14} className={clsx(state.busy && 'animate-spin')} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <Stat value={vndShort(summary.today)} label={tr('Sold today')} tone={summary.today ? 'text-ok' : 'text-bone'} />
          <Stat value={vndShort(summary.month)} label={tr('This month')} />
          <Stat value={summary.sales} label={tr('Sales this month')} />
          <Stat value={vndShort(summary.waiting)} label={tr('Waiting to be paid')} tone={summary.overdue.length ? 'text-danger' : 'text-bone'} />
        </div>
        <div className="mt-5">
          <PublicDoors
            pages={[
              ['/shop', tr('Shop')],
              ['/book', tr('Book a call')],
              ['/join', tr('Membership')],
              ['/me', tr('Link in bio')],
              ['/kit', tr('Media kit')],
            ]}
          />
        </div>
        {!draft.bank.account && <p className="mt-4 rounded-2xl border border-warn/35 bg-warn/10 px-3.5 py-2.5 text-fine text-warn">{tr('Add your bank account under Payments before anything can be sold.')}</p>}
      </section>

      <Segmented scroll round value={sub} onChange={setSub} options={SUBS} label={tr('Shop')} />

      {sub === 'orders' && (
        <Panel title={tr('Orders')} icon={ShoppingBag} hue={150}>
          <Orders orders={state.orders} />
        </Panel>
      )}

      {sub === 'products' && (
        <Panel title={tr('Digital products')} icon={Package} hue={22}>
          <ListEditor
            items={draft.products}
            onChange={(products) => set({ products })}
            make={() => ({ title: '', price: 0, blurb: '', cover: '', file: '', active: true })}
            addLabel={tr('Add a product')}
            empty={tr('A template, a starter kit, source code, a preset pack: anything you can hand over as a link.')}
            render={(p, patch) => (
              <>
                <div className="grid gap-2 pr-28 md:grid-cols-[minmax(0,1fr)_10rem]">
                  <Input aria-label={tr('Name')} placeholder={tr('Name')} value={p.title} onChange={(e) => patch({ title: e.target.value })} maxLength={80} compact />
                  <Input aria-label={tr('Price (₫)')} placeholder={tr('Price (₫)')} inputMode="numeric" value={p.price || ''} onChange={(e) => patch({ price: num(e.target.value) })} compact />
                </div>
                <Textarea aria-label={tr('What it is')} rows={2} placeholder={tr('What it is and who it is for')} value={p.blurb} onChange={(e) => patch({ blurb: e.target.value })} maxLength={600} />
                <div className="grid gap-2 md:grid-cols-2">
                  <Input aria-label={tr('Cover picture (link)')} placeholder={tr('Cover picture (https://…)')} value={p.cover} onChange={(e) => patch({ cover: e.target.value })} compact />
                  <Input aria-label={tr('Download link, given once paid')} placeholder={tr('Download link, given once paid')} value={p.file} onChange={(e) => patch({ file: e.target.value })} compact />
                </div>
              </>
            )}
          />
        </Panel>
      )}

      {sub === 'calls' && (
        <Panel title={tr('Paid calls')} icon={CalendarClock} hue={208}>
          <div className="flex flex-col gap-4">
            <Chip on={draft.booking.active} onClick={() => set({ booking: { ...draft.booking, active: !draft.booking.active } })}>
              {draft.booking.active ? tr('Open for booking') : tr('Closed')}
            </Chip>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_9rem]">
              <Row label={tr('What the call is')}>
                <Input aria-label={tr('What the call is')} placeholder={tr('e.g. 1:1 code review')} value={draft.booking.title} onChange={(e) => set({ booking: { ...draft.booking, title: e.target.value } })} compact />
              </Row>
              <Row label={tr('Length')}>
                <Select aria-label={tr('Length')} value={draft.booking.minutes} onChange={(e) => set({ booking: { ...draft.booking, minutes: Number(e.target.value) } })} compact>
                  {[15, 20, 30, 45, 60, 90].map((m) => (
                    <option key={m} value={m}>
                      {tr('{0} min', m)}
                    </option>
                  ))}
                </Select>
              </Row>
              <Row label={tr('Price (₫, 0 is free)')}>
                <Input aria-label={tr('Price')} inputMode="numeric" value={draft.booking.price || ''} onChange={(e) => set({ booking: { ...draft.booking, price: num(e.target.value) } })} compact />
              </Row>
            </div>
            <Textarea aria-label={tr('What they get')} rows={2} placeholder={tr('What they get from it, what to bring')} value={draft.booking.blurb} onChange={(e) => set({ booking: { ...draft.booking, blurb: e.target.value } })} />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr('Days')}>
              {DAYS.map((d) => (
                <Chip key={d} on={draft.booking.days.includes(d)} onClick={() => set({ booking: { ...draft.booking, days: draft.booking.days.includes(d) ? draft.booking.days.filter((x) => x !== d) : [...draft.booking.days, d] } })}>
                  {dayName(d)}
                </Chip>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Row label={tr('From')}>
                <Input type="time" aria-label={tr('From')} value={draft.booking.from} onChange={(e) => set({ booking: { ...draft.booking, from: e.target.value } })} compact />
              </Row>
              <Row label={tr('Until')}>
                <Input type="time" aria-label={tr('Until')} value={draft.booking.to} onChange={(e) => set({ booking: { ...draft.booking, to: e.target.value } })} compact />
              </Row>
              <Row label={tr('Notice (hours)')}>
                <Input aria-label={tr('Notice (hours)')} inputMode="numeric" value={draft.booking.leadHours} onChange={(e) => set({ booking: { ...draft.booking, leadHours: num(e.target.value) } })} compact />
              </Row>
              <Row label={tr('Days ahead')}>
                <Input aria-label={tr('Days ahead')} inputMode="numeric" value={draft.booking.horizonDays} onChange={(e) => set({ booking: { ...draft.booking, horizonDays: num(e.target.value) } })} compact />
              </Row>
            </div>
            <p className="text-[0.78rem] text-bone-faint">{tr('Times already in your calendar are left out, and a slot is held for thirty minutes while its transfer comes in.')}</p>
          </div>
        </Panel>
      )}

      {sub === 'members' && (
        <Panel title={tr('Membership')} icon={Gem} hue={268}>
          <ListEditor
            items={draft.tiers}
            onChange={(tiers) => set({ tiers })}
            make={() => ({ title: '', price: 0, perks: [], roleId: '', active: true })}
            addLabel={tr('Add a tier')}
            empty={tr('A monthly membership of your Discord community: a private channel, early videos, code reviews…')}
            render={(t, patch) => (
              <>
                <div className="grid gap-2 pr-28 md:grid-cols-[minmax(0,1fr)_10rem]">
                  <Input aria-label={tr('Name')} placeholder={tr('Name')} value={t.title} onChange={(e) => patch({ title: e.target.value })} maxLength={60} compact />
                  <Input aria-label={tr('Price a month (₫)')} placeholder={tr('Price a month (₫)')} inputMode="numeric" value={t.price || ''} onChange={(e) => patch({ price: num(e.target.value) })} compact />
                </div>
                <Textarea aria-label={tr('Perks')} rows={3} placeholder={tr('Perks, one a line')} value={(t.perks ?? []).join('\n')} onChange={(e) => patch({ perks: e.target.value.split('\n').slice(0, 8) })} />
                <Input aria-label={tr('Discord role ID')} placeholder={tr('Discord role ID (given while the membership lasts)')} inputMode="numeric" value={t.roleId} onChange={(e) => patch({ roleId: e.target.value.replace(/\D/g, '') })} compact />
              </>
            )}
          />
          {!state.discordBot && <p className="mt-4 text-[0.78rem] text-bone-faint">{tr('To give roles by themselves, add DISCORD_BOT_TOKEN and DISCORD_GUILD_ID on the server (a bot in your server with Manage Roles). Without it you give the role by hand when an order is paid.')}</p>}
        </Panel>
      )}

      {sub === 'payments' && (
        <Panel title={tr('How money reaches you')} icon={Landmark} hue={46}>
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Row label={tr('Bank')}>
                <Select aria-label={tr('Bank')} value={draft.bank.bin} onChange={(e) => set({ bank: { ...draft.bank, bin: e.target.value } })} compact>
                  <option value="">—</option>
                  {BANKS.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Row>
              <Row label={tr('Account number')}>
                <Input aria-label={tr('Account number')} inputMode="numeric" value={draft.bank.account} onChange={(e) => set({ bank: { ...draft.bank, account: e.target.value.replace(/\s/g, '') } })} compact />
              </Row>
              <Row label={tr('Account holder')}>
                <Input aria-label={tr('Account holder')} value={draft.bank.name} onChange={(e) => set({ bank: { ...draft.bank, name: e.target.value } })} compact />
              </Row>
            </div>
            <div className="rounded-2xl border border-line p-3.5">
              <Label className="mb-2">{tr('Tips')}</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Chip on={draft.tips.active} onClick={() => set({ tips: { ...draft.tips, active: !draft.tips.active } })}>
                  {draft.tips.active ? tr('Tip jar open') : tr('Tip jar closed')}
                </Chip>
                <Input aria-label={tr('Amounts to offer')} className="max-w-xs" value={draft.tips.amounts.join(', ')} onChange={(e) => set({ tips: { ...draft.tips, amounts: e.target.value.split(',').map(num).filter(Boolean).slice(0, 4) } })} compact />
              </div>
            </div>
            <div className="rounded-2xl border border-line p-3.5 text-[0.8rem] leading-relaxed text-bone-dim">
              <b className="mb-1 flex items-center gap-1.5 text-bone">
                <Zap size={13} aria-hidden="true" /> {tr('Confirm payments by themselves')}
              </b>
              {tr('Make a free SePay account, link this bank account, add a webhook to {0}/api/store/sepay with API-key authentication, and put the key in SEPAY_API_KEY on the server. Every transfer that carries an order’s code then marks it paid.', import.meta.env.VITE_SPACEHANK_API_URL || 'https://…')}
            </div>
          </div>
        </Panel>
      )}

      {sub !== 'orders' && (
        <div className="sticky bottom-24 z-20 flex justify-end md:bottom-4">
          <Button onClick={save} disabled={!dirty || saving} className={clsx('shadow-[0_14px_30px_-12px_rgb(0_0_0/0.6)] transition-opacity', !dirty && 'opacity-60')} data-save-shop>
            <Check size={15} aria-hidden="true" /> {saving ? tr('Saving…') : dirty ? tr('Save the shop') : tr('Saved')}
          </Button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CalendarClock, Check, Coffee, Copy, ExternalLink, FileText, Gem, Landmark, Mail, Package, Plus, RefreshCw, ShoppingBag, Trash2, X, Zap } from 'lucide-react';
import { Button, Input, Select, Textarea, TimePicker, pushToast } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { useStore } from '../../core/store';
import { locale, tr } from '../../core/i18n/lang';
import { vnd, vndShort } from './model';
import { dropOrder, loadShop, saveShop, setOrder, shop, siteOrigin } from './shopStore';
import { orderState, payLink, salesSummary } from './studio';
import { EmptyNote, copyText } from './ui';
import { DataTable, Drawer, Field, FormSection, ImageDrop, ListHead, MoneyInput, Pill, SearchBox, Switch, AsyncButton, useConfirm } from './admin';

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
const MIN_PRICE = 1000;
const when = (at) => new Date(at).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const day = (at) => new Date(at).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
const qrPreview = (bank) => `https://img.vietqr.io/image/${encodeURIComponent(bank.bin)}-${encodeURIComponent(bank.account)}-compact2.png?amount=10000&addInfo=HKTEST01&accountName=${encodeURIComponent(bank.name)}`;
const httpsOk = (url) => !url || /^https?:\/\/\S+\.\S+/.test(url);

/** The public pages, each with its address to copy or open. */
export function PublicDoors({ pages }) {
  return (
    <div className="flex flex-wrap gap-1.5" data-public-doors>
      {pages.map(([path, label]) => (
        <span key={path} className="adm-door">
          <a href={path} target="_blank" rel="noreferrer">
            {label} <ExternalLink size={11} aria-hidden="true" />
          </a>
          <button type="button" onClick={() => copyText(`${siteOrigin()}${path}`, tr('Address copied'))} aria-label={tr('Copy the address of {0}', label)}>
            <Copy size={11} aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );
}

/** One part of the shop's settings as a draft: edit it, see whether it changed, save it or put it back. */
const useDraftOf = (key) => {
  const { config } = useStore(shop);
  const [draft, setDraft] = useState(config?.[key]);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(config?.[key]), [config, key]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(config?.[key]);
  const save = async (next = draft) => {
    setSaving(true);
    try {
      await saveShop({ ...shop.get().config, [key]: next });
      pushToast(tr('Saved'), { tone: 'success' });
      return true;
    } catch (e) {
      pushToast(e.message, { tone: 'error' });
      return false;
    } finally {
      setSaving(false);
    }
  };
  return { draft, setDraft, dirty, saving, save, reset: () => setDraft(config?.[key]) };
};

// ---------------------------------------------------------------- orders

function OrderDrawer({ order, onClose }) {
  const [confirm, confirmDialog] = useConfirm();
  if (!order) return null;
  const state = orderState(order);
  const Icon = KIND_ICON[order.kind] ?? Package;
  const rows = [
    [tr('Code'), order.code || '—'],
    [tr('Type'), KIND_LABEL[order.kind]],
    [tr('Amount'), order.amount ? vnd(order.amount) : '—'],
    [tr('Created'), when(order.createdAt)],
    order.paidAt && [tr('Paid'), `${when(order.paidAt)}${order.paidBy === 'sepay' ? ' · SePay' : ''}`],
    order.slot && [tr('Call'), when(order.slot.start)],
    order.dueAt && [tr('Pay by'), day(order.dueAt)],
    order.expiresAt && [tr('Membership until'), day(order.expiresAt)],
    order.buyer?.name && [tr('Name'), order.buyer.name],
    order.buyer?.contact && [tr('Contact'), order.buyer.contact],
    order.buyer?.discordId && [tr('Discord ID'), order.buyer.discordId],
  ].filter(Boolean);
  return (
    <Drawer
      open
      onClose={onClose}
      title={order.title}
      subtitle={`${KIND_LABEL[order.kind]} · ${STATE[state]?.label}`}
      footer={
        <>
          <AsyncButton
            variant="ghost"
            size="sm"
            ask={() => confirm({ title: tr('Delete the order {0}?', order.code || order.title), body: tr('It disappears from the list for good. Money already logged from it stays in Money.') })}
            onClick={async () => {
              await dropOrder(order.id);
              onClose();
            }}
          >
            <Trash2 size={13} aria-hidden="true" /> {tr('Delete')}
          </AsyncButton>
          <span className="flex-1" />
          {(state === 'pending' || state === 'overdue') && (
            <AsyncButton variant="ghost" size="sm" ask={() => confirm({ title: tr('Cancel the order {0}?', order.code), body: tr('The buyer can no longer pay it. A booked time is freed for someone else.'), action: tr('Cancel the order') })} onClick={() => setOrder(order.id, 'cancelled')}>
              <X size={13} aria-hidden="true" /> {tr('Cancel the order')}
            </AsyncButton>
          )}
          {order.kind !== 'lead' && state !== 'paid' && state !== 'cancelled' && (
            <AsyncButton size="sm" ask={() => confirm({ title: tr('Mark {0} as paid?', order.code), body: tr('Only once the money is in your account. The buyer then gets what they ordered, and it goes into Money.'), action: tr('Mark paid') })} onClick={() => setOrder(order.id, 'paid')} data-mark-paid>
              <Check size={13} aria-hidden="true" /> {tr('Mark paid')}
            </AsyncButton>
          )}
        </>
      }
    >
      {confirmDialog}
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full bg-wash/[0.07] text-bone-dim">
          <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <Pill tone={STATE[state]?.tone}>{STATE[state]?.label}</Pill>
        {order.amount > 0 && <b className="ml-auto font-display text-[1.8rem] tabular-nums text-bone">{vnd(order.amount)}</b>}
      </div>
      <dl className="adm-dl mt-5">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {order.buyer?.note && (
        <div className="mt-5">
          <p className="mb-1.5 text-[0.8rem] font-medium text-bone">{tr('Note from the customer')}</p>
          <p className="rounded-xl border border-line bg-ink-2 p-3 text-fine whitespace-pre-line text-bone-dim">{order.buyer.note}</p>
        </div>
      )}
      {order.items?.length > 0 && (
        <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
          {order.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3 px-3 py-2 text-fine">
              <span className="text-bone">
                {it.desc} <small className="text-bone-faint">× {it.qty}</small>
              </span>
              <span className="font-mono tabular-nums text-bone-dim">{vnd(it.qty * it.unit)}</span>
            </li>
          ))}
        </ul>
      )}
      {order.kind !== 'lead' && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => copyText(payLink(siteOrigin(), order), tr('Payment link copied'))}>
            <Copy size={13} aria-hidden="true" /> {tr('Copy the payment link')}
          </Button>
          <Button variant="ghost" size="sm" href={payLink(siteOrigin(), order)} target="_blank" rel="noreferrer">
            <ExternalLink size={13} aria-hidden="true" /> {tr('Open the payment page')}
          </Button>
        </div>
      )}
    </Drawer>
  );
}

const FILTERS = [
  ['open', tr('To act on')],
  ['paid', tr('Paid')],
  ['invoice', tr('Invoices')],
  ['all', tr('All')],
];

function Orders({ orders }) {
  const [filter, setFilter] = useState('open');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const list = orders.filter((o) => o.kind !== 'lead');
  const counts = Object.fromEntries(FILTERS.map(([id]) => [id, 0]));
  const shown = list.filter((o) => {
    const s = orderState(o);
    const pass = { open: s === 'pending' || s === 'overdue', paid: s === 'paid', invoice: o.kind === 'invoice', all: true };
    for (const [id] of FILTERS) if (pass[id]) counts[id] += 1;
    const q = query.trim().toLowerCase();
    return pass[filter] && (!q || [o.code, o.title, o.buyer?.name, o.buyer?.contact].some((x) => String(x ?? '').toLowerCase().includes(q)));
  });
  const current = orders.find((o) => o.id === open);
  return (
    <>
      <ListHead title={tr('Orders')}>
        <SearchBox value={query} onChange={setQuery} placeholder={tr('Search by code, product or customer')} />
      </ListHead>
      <div className="adm-filters mb-3" role="tablist" aria-label={tr('Orders')}>
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} className={clsx(filter === id && 'is-on')} onClick={() => setFilter(id)}>
            {label} <b>{counts[id]}</b>
          </button>
        ))}
      </div>
      <DataTable
        rows={shown}
        onOpen={(o) => setOpen(o.id)}
        empty={
          <EmptyNote icon={ShoppingBag} title={filter === 'open' ? tr('Nothing waits on you') : tr('No orders here yet')}>
            {tr('Orders from the shop, calls, memberships, tips and the invoices you send all land here. Paid ones go into Money by themselves.')}
          </EmptyNote>
        }
        columns={[
          {
            key: 'order',
            label: tr('Order'),
            width: 'minmax(0,2.2fr)',
            render: (o) => {
              const Icon = KIND_ICON[o.kind] ?? Package;
              return (
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-wash/[0.07] text-bone-dim">
                    <Icon size={14} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate font-medium text-bone">{o.title}</b>
                    <small className="font-mono text-[0.7rem] text-bone-faint">{o.code}</small>
                  </span>
                </span>
              );
            },
          },
          { key: 'buyer', label: tr('Customer'), width: 'minmax(0,1.4fr)', render: (o) => <span className="truncate text-bone-dim">{o.buyer?.name || o.buyer?.contact || '—'}</span> },
          { key: 'amount', label: tr('Amount'), width: '8rem', className: 'text-right', render: (o) => <b className="font-mono font-normal tabular-nums text-bone">{vnd(o.amount)}</b> },
          { key: 'state', label: tr('Status'), width: '7.5rem', render: (o) => <Pill tone={STATE[orderState(o)]?.tone}>{STATE[orderState(o)]?.label}</Pill> },
          { key: 'date', label: tr('Date'), width: '8.5rem', render: (o) => <span className="font-mono text-[0.74rem] text-bone-faint">{when(o.createdAt)}</span> },
        ]}
      />
      {current && <OrderDrawer key={current.id} order={current} onClose={() => setOpen(null)} />}
    </>
  );
}

// ---------------------------------------------------------------- products

function ProductDrawer({ product, onClose, onSave, onDelete, askDelete }) {
  const [p, setP] = useState(product);
  const set = (patch) => setP((x) => ({ ...x, ...patch }));
  const errors = {
    title: !p.title.trim() && tr('Give it a name.'),
    price: p.price < MIN_PRICE && tr('At least {0}.', vnd(MIN_PRICE)),
    file: !httpsOk(p.file) && tr('A full address that starts with https://'),
  };
  const valid = !Object.values(errors).some(Boolean);
  const isNew = !product.id;
  return (
    <Drawer
      open
      wide
      onClose={onClose}
      title={isNew ? tr('New product') : p.title || tr('Product')}
      subtitle={tr('What a visitor sees on /shop, and what they get once it is paid.')}
      footer={
        <>
          {!isNew && (
            <AsyncButton variant="ghost" size="sm" ask={askDelete} onClick={onDelete}>
              <Trash2 size={13} aria-hidden="true" /> {tr('Delete')}
            </AsyncButton>
          )}
          <span className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>
            {tr('Cancel')}
          </Button>
          <AsyncButton
            size="sm"
            disabled={!valid}
            onClick={async () => {
              if (await onSave(p)) onClose();
            }}
            data-save-product
          >
            <Check size={13} aria-hidden="true" /> {isNew ? tr('Add the product') : tr('Save')}
          </AsyncButton>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex flex-col gap-4">
          <Field label={tr('Name')} error={p.title && errors.title}>
            <Input value={p.title} onChange={(e) => set({ title: e.target.value })} maxLength={80} placeholder={tr('e.g. React Starter Kit')} autoFocus={isNew} />
          </Field>
          <Field label={tr('Price')} error={p.price > 0 && errors.price} hint={tr('What the buyer transfers. The QR code fills it in for them.')}>
            <MoneyInput value={p.price} onChange={(price) => set({ price })} aria-label={tr('Price')} />
          </Field>
          <Field label={tr('Description')} hint={`${p.blurb.length} / 600 · ${tr('What it is, who it is for, what is inside.')}`}>
            <Textarea rows={5} value={p.blurb} onChange={(e) => set({ blurb: e.target.value })} maxLength={600} />
          </Field>
          <Field label={tr('Download link, given once paid')} error={errors.file} hint={tr('A Google Drive or Dropbox link shared as “anyone with the link can view”. Only a buyer who has paid sees it.')}>
            <Input value={p.file} onChange={(e) => set({ file: e.target.value.trim() })} placeholder="https://drive.google.com/…" />
          </Field>
          <Switch on={p.active !== false} onChange={(on) => set({ active: on })} label={tr('On sale')} hint={tr('Off: kept here, hidden from the shop.')} />
        </div>
        <div className="flex flex-col gap-4">
          <ImageDrop label={tr('Cover picture')} value={p.cover} onChange={(cover) => set({ cover })} hint={tr('16:10 works best. Shrunk before it is uploaded.')} />
          <div>
            <p className="mb-1.5 text-[0.8rem] font-medium text-bone">{tr('Preview')}</p>
            <div className="adm-preview-card">
              <div className="adm-preview-cover">{p.cover ? <img src={p.cover} alt="" /> : <span>{(p.title || '?').slice(0, 1)}</span>}</div>
              <b>{p.title || tr('Name')}</b>
              <small>{p.blurb || tr('Description')}</small>
              <span>
                <em>{p.price ? vnd(p.price) : '—'}</em>
                <i>{tr('Buy')} →</i>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function Products({ orders }) {
  const { draft: products, save } = useDraftOf('products');
  const [confirm, confirmDialog] = useConfirm();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // index, or 'new'
  const sales = useMemo(() => {
    const out = {};
    for (const o of orders) if (o.kind === 'product' && o.status === 'paid') out[o.ref] = { n: (out[o.ref]?.n ?? 0) + 1, sum: (out[o.ref]?.sum ?? 0) + (o.received ?? o.amount) };
    return out;
  }, [orders]);
  const list = (products ?? []).map((p, i) => ({ ...p, index: i })).filter((p) => !query || p.title.toLowerCase().includes(query.toLowerCase()));
  const current = editing === 'new' ? { title: '', price: 0, blurb: '', cover: '', file: '', active: true } : editing !== null ? products[editing] : null;
  return (
    <>
      <ListHead title={tr('Products')} count={products?.length ?? 0}>
        <SearchBox value={query} onChange={setQuery} placeholder={tr('Search products')} />
        <Button size="sm" onClick={() => setEditing('new')} data-new-product>
          <Plus size={14} aria-hidden="true" /> {tr('New product')}
        </Button>
      </ListHead>
      <DataTable
        rows={list}
        rowKey={(p) => p.id || `i${p.index}`}
        onOpen={(p) => setEditing(p.index)}
        empty={
          <EmptyNote icon={Package} title={tr('No products yet')}>
            {tr('A template, a starter kit, source code, a preset pack: anything you can hand over as a link.')}
          </EmptyNote>
        }
        columns={[
          {
            key: 'name',
            label: tr('Product'),
            width: 'minmax(0,2.6fr)',
            render: (p) => (
              <span className="flex min-w-0 items-center gap-3">
                <span className="adm-thumb">{p.cover ? <img src={p.cover} alt="" /> : <Package size={15} aria-hidden="true" />}</span>
                <span className="min-w-0">
                  <b className="block truncate font-medium text-bone">{p.title}</b>
                  <small className="block truncate text-[0.74rem] text-bone-faint">{p.blurb || '—'}</small>
                </span>
              </span>
            ),
          },
          { key: 'price', label: tr('Price'), width: '8rem', className: 'text-right', render: (p) => <span className="font-mono tabular-nums text-bone">{vnd(p.price)}</span> },
          { key: 'sold', label: tr('Sold'), width: '5rem', className: 'text-right', render: (p) => <span className="font-mono tabular-nums text-bone-dim">{sales[p.id]?.n ?? 0}</span> },
          { key: 'revenue', label: tr('Revenue'), width: '7rem', className: 'text-right', render: (p) => <span className="font-mono tabular-nums text-bone-dim">{vndShort(sales[p.id]?.sum ?? 0)}</span> },
          { key: 'state', label: tr('Status'), width: '7rem', render: (p) => <Pill tone={p.active === false ? 'default' : 'ok'}>{p.active === false ? tr('Hidden') : tr('On sale')}</Pill> },
          { key: 'warn', label: '', width: '1.5rem', render: (p) => (!p.file ? <span title={tr('No download link yet')} className="text-warn">!</span> : null) },
        ]}
      />
      {current && (
        <ProductDrawer
          key={editing}
          product={current}
          onClose={() => setEditing(null)}
          onSave={(p) => save(editing === 'new' ? [...products, p] : products.map((x, i) => (i === editing ? p : x)))}
          askDelete={() => confirm({ title: tr('Delete “{0}”?', products[editing].title), body: tr('It leaves the shop at once. Orders already paid keep their download link. To stop selling it for a while, switch “On sale” off instead.') })}
          onDelete={async () => {
            if (await save(products.filter((_, i) => i !== editing))) setEditing(null);
          }}
        />
      )}
      {confirmDialog}
    </>
  );
}

// ---------------------------------------------------------------- calls

const DAYS = [1, 2, 3, 4, 5, 6, 0];
const dayName = (d) => new Date(2026, 10, 15 + d).toLocaleDateString(locale(), { weekday: 'short' });
const minutesOf = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

function Calls({ orders }) {
  const { draft: b, setDraft, dirty, saving, save, reset } = useDraftOf('booking');
  if (!b) return null;
  const set = (patch) => setDraft({ ...b, ...patch });
  const span = minutesOf(b.to) - minutesOf(b.from);
  const perDay = span > 0 ? Math.floor(span / b.minutes) : 0;
  const error = span <= 0 ? tr('“Until” must be later than “From”.') : b.price > 0 && b.price < MIN_PRICE ? tr('A paid call costs at least {0}, or 0 for free.', vnd(MIN_PRICE)) : !b.days.length && b.active ? tr('Choose at least one day.') : '';
  const upcoming = orders.filter((o) => o.kind === 'booking' && o.slot && o.slot.start > Date.now() && orderState(o) !== 'expired' && o.status !== 'cancelled').sort((x, y) => x.slot.start - y.slot.start);
  return (
    <div className="flex flex-col gap-4">
      <FormSection title={tr('The offer')} description={tr('What a visitor books on /book: one kind of call, one price.')} dirty={dirty} saving={saving} onSave={() => save()} onReset={reset} error={error}>
        <Switch on={b.active} onChange={(active) => set({ active })} label={tr('Open for booking')} hint={tr('Off: the page says calls are not open.')} />
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem_11rem]">
          <Field label={tr('Name of the call')}>
            <Input value={b.title} onChange={(e) => set({ title: e.target.value })} placeholder={tr('e.g. 1:1 code review')} maxLength={80} />
          </Field>
          <Field label={tr('Length')}>
            <Select value={b.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}>
              {[15, 20, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {tr('{0} min', m)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={tr('Price')} hint={tr('0 for a free call')}>
            <MoneyInput value={b.price} onChange={(price) => set({ price })} aria-label={tr('Price')} />
          </Field>
        </div>
        <Field label={tr('What they get')} hint={`${b.blurb.length} / 500`}>
          <Textarea rows={4} value={b.blurb} onChange={(e) => set({ blurb: e.target.value })} maxLength={500} />
        </Field>
      </FormSection>

      <FormSection title={tr('When you take calls')} description={tr('In Vietnam’s time. Times already in your calendar are left out, and a slot is held for thirty minutes while its transfer comes in.')} dirty={dirty} saving={saving} onSave={() => save()} onReset={reset} error={error}>
        <Field label={tr('Days')}>
          <div className="adm-days" role="group" aria-label={tr('Days')}>
            {DAYS.map((d) => (
              <button key={d} type="button" aria-pressed={b.days.includes(d)} className={clsx(b.days.includes(d) && 'is-on')} onClick={() => set({ days: b.days.includes(d) ? b.days.filter((x) => x !== d) : [...b.days, d] })}>
                {dayName(d)}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label={tr('From')}>
            <TimePicker value={b.from} onChange={(from) => set({ from })} step={15} aria-label={tr('From')} />
          </Field>
          <Field label={tr('Until')} error={span <= 0 ? tr('Later than “From”') : ''}>
            <TimePicker value={b.to} onChange={(to) => set({ to })} step={15} aria-label={tr('Until')} />
          </Field>
          <Field label={tr('Notice')} hint={tr('hours ahead, at least')}>
            <Input inputMode="numeric" value={b.leadHours} onChange={(e) => set({ leadHours: Math.min(168, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
          </Field>
          <Field label={tr('Open for')} hint={tr('days ahead')}>
            <Input inputMode="numeric" value={b.horizonDays} onChange={(e) => set({ horizonDays: Math.max(1, Math.min(60, Number(e.target.value.replace(/\D/g, '')) || 1)) })} />
          </Field>
        </div>
        <p className="rounded-xl border border-line bg-ink-2 px-3.5 py-2.5 text-[0.82rem] text-bone-dim">{span > 0 ? tr('{0} slots a day, {1} a week.', perDay, perDay * b.days.length) : tr('No slots: fix the hours.')}</p>
      </FormSection>

      <section className="adm-card">
        <ListHead title={tr('Booked calls')} count={upcoming.length} />
        <DataTable
          rows={upcoming}
          empty={<p className="text-fine text-bone-faint">{tr('No calls booked yet.')}</p>}
          columns={[
            { key: 'when', label: tr('When'), width: '12rem', render: (o) => <b className="font-medium text-bone">{when(o.slot.start)}</b> },
            { key: 'who', label: tr('Who'), width: 'minmax(0,1fr)', render: (o) => <span className="truncate text-bone-dim">{[o.buyer?.name, o.buyer?.contact].filter(Boolean).join(' · ')}</span> },
            { key: 'note', label: tr('About'), width: 'minmax(0,1.4fr)', render: (o) => <span className="truncate text-bone-faint">{o.buyer?.note || '—'}</span> },
            { key: 'state', label: tr('Status'), width: '7rem', render: (o) => <Pill tone={STATE[orderState(o)]?.tone}>{STATE[orderState(o)]?.label}</Pill> },
          ]}
        />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- membership

function TierDrawer({ tier, onClose, onSave, onDelete, askDelete, hasBot }) {
  const [t, setT] = useState({ ...tier, perks: tier.perks?.length ? tier.perks : [''] });
  const set = (patch) => setT((x) => ({ ...x, ...patch }));
  const valid = t.title.trim() && t.price >= MIN_PRICE;
  const isNew = !tier.id;
  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? tr('New membership tier') : t.title}
      subtitle={tr('A monthly membership of your Discord community.')}
      footer={
        <>
          {!isNew && (
            <AsyncButton variant="ghost" size="sm" ask={askDelete} onClick={onDelete}>
              <Trash2 size={13} aria-hidden="true" /> {tr('Delete')}
            </AsyncButton>
          )}
          <span className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>
            {tr('Cancel')}
          </Button>
          <AsyncButton size="sm" disabled={!valid} onClick={async () => (await onSave({ ...t, perks: t.perks.map((x) => x.trim()).filter(Boolean) })) && onClose()}>
            <Check size={13} aria-hidden="true" /> {tr('Save')}
          </AsyncButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={tr('Name')}>
          <Input value={t.title} onChange={(e) => set({ title: e.target.value })} maxLength={60} placeholder="Insider" autoFocus={isNew} />
        </Field>
        <Field label={tr('Price a month')}>
          <MoneyInput value={t.price} onChange={(price) => set({ price })} aria-label={tr('Price a month')} />
        </Field>
        <Field label={tr('Perks')}>
          <ul className="flex flex-col gap-2">
            {t.perks.map((perk, i) => (
              <li key={i} className="flex gap-2">
                <Input value={perk} onChange={(e) => set({ perks: t.perks.map((x, j) => (j === i ? e.target.value : x)) })} maxLength={120} placeholder={tr('e.g. A private channel')} />
                <button type="button" className="rounded-full p-2 text-bone-faint hover:text-danger" onClick={() => set({ perks: t.perks.length > 1 ? t.perks.filter((_, j) => j !== i) : [''] })} aria-label={tr('Remove')}>
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {t.perks.length < 8 && (
            <Button variant="ghost" size="sm" className="mt-2 self-start" onClick={() => set({ perks: [...t.perks, ''] })}>
              <Plus size={13} aria-hidden="true" /> {tr('Add a perk')}
            </Button>
          )}
        </Field>
        <Field label={tr('Discord role ID')} hint={hasBot ? tr('Given while the membership lasts. Discord: Server Settings → Roles → right-click the role → Copy Role ID.') : tr('The bot is not set up on the server, so you give the role by hand when an order is paid.')}>
          <Input inputMode="numeric" value={t.roleId} onChange={(e) => set({ roleId: e.target.value.replace(/\D/g, '') })} placeholder="123456789012345678" />
        </Field>
        <Switch on={t.active !== false} onChange={(on) => set({ active: on })} label={tr('Open to join')} />
      </div>
    </Drawer>
  );
}

function Members({ orders, hasBot }) {
  const { draft: tiers, save } = useDraftOf('tiers');
  const [confirm, confirmDialog] = useConfirm();
  const [editing, setEditing] = useState(null);
  const members = orders.filter((o) => o.kind === 'membership' && o.status === 'paid').sort((a, b) => (b.expiresAt ?? 0) - (a.expiresAt ?? 0));
  const current = editing === 'new' ? { title: '', price: 0, perks: [], roleId: '', active: true } : editing !== null ? tiers[editing] : null;
  return (
    <div className="flex flex-col gap-4">
      <section className="adm-card">
        <ListHead title={tr('Tiers')} count={tiers?.length ?? 0}>
          <Button size="sm" onClick={() => setEditing('new')} disabled={(tiers?.length ?? 0) >= 6}>
            <Plus size={14} aria-hidden="true" /> {tr('New tier')}
          </Button>
        </ListHead>
        {!tiers?.length ? (
          <EmptyNote icon={Gem} title={tr('No tiers yet')}>
            {tr('A monthly membership of your Discord community: a private channel, early videos, code reviews…')}
          </EmptyNote>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tiers.map((t, i) => (
              <li key={t.id || i}>
                <button type="button" onClick={() => setEditing(i)} className="adm-tier">
                  <span className="flex items-center justify-between gap-2">
                    <b className="font-display text-[1.3rem] font-normal text-bone">{t.title}</b>
                    <Pill tone={t.active === false ? 'default' : 'ok'}>{t.active === false ? tr('Closed') : tr('Open')}</Pill>
                  </span>
                  <span className="font-mono text-bone">
                    {vnd(t.price)} <small className="text-bone-faint">/ {tr('month')}</small>
                  </span>
                  <ul className="flex flex-col gap-1 text-[0.8rem] text-bone-dim">
                    {t.perks.slice(0, 4).map((p) => (
                      <li key={p}>· {p}</li>
                    ))}
                  </ul>
                  {!t.roleId && <small className="text-[0.72rem] text-warn">{tr('No Discord role')}</small>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="adm-card">
        <ListHead title={tr('Members')} count={members.length} />
        <DataTable
          rows={members}
          empty={<p className="text-fine text-bone-faint">{tr('No members yet.')}</p>}
          columns={[
            { key: 'who', label: tr('Member'), width: 'minmax(0,1.4fr)', render: (o) => <span className="truncate text-bone">{o.buyer?.name || o.buyer?.discordId || '—'}</span> },
            { key: 'tier', label: tr('Tier'), width: 'minmax(0,1fr)', render: (o) => <span className="text-bone-dim">{o.title}</span> },
            { key: 'until', label: tr('Until'), width: '9rem', render: (o) => <span className="font-mono text-[0.76rem] text-bone-dim">{o.expiresAt ? day(o.expiresAt) : '—'}</span> },
            { key: 'role', label: tr('Role'), width: '7rem', render: (o) => <Pill tone={o.roleGranted ? 'ok' : (o.expiresAt ?? 0) < Date.now() ? 'default' : 'warn'}>{o.roleGranted ? tr('Given') : (o.expiresAt ?? 0) < Date.now() ? tr('Ended') : tr('By hand')}</Pill> },
          ]}
        />
      </section>
      {current && (
        <TierDrawer
          key={editing}
          tier={current}
          hasBot={hasBot}
          onClose={() => setEditing(null)}
          onSave={(t) => save(editing === 'new' ? [...tiers, t] : tiers.map((x, i) => (i === editing ? t : x)))}
          askDelete={() => confirm({ title: tr('Delete the tier “{0}”?', tiers[editing].title), body: tr('Nobody can join it any more. Members who already paid keep their role until their month is over.') })}
          onDelete={async () => {
            if (await save(tiers.filter((_, i) => i !== editing))) setEditing(null);
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}

// ---------------------------------------------------------------- payments

function Payments({ autoPay }) {
  const bank = useDraftOf('bank');
  const tips = useDraftOf('tips');
  if (!bank.draft || !tips.draft) return null;
  const b = bank.draft;
  const bankError = b.account && !/^[0-9A-Za-z]{6,30}$/.test(b.account) ? tr('Only digits, as on your card.') : '';
  return (
    <div className="flex flex-col gap-4">
      <FormSection title={tr('Bank account')} description={tr('Where every transfer goes. The QR code a buyer scans is made from these three lines.')} dirty={bank.dirty} saving={bank.saving} onSave={() => bank.save()} onReset={bank.reset} error={bankError}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="flex flex-col gap-4">
            <Field label={tr('Bank')}>
              <Select value={b.bin} onChange={(e) => bank.setDraft({ ...b, bin: e.target.value })}>
                <option value="">{tr('Choose your bank')}</option>
                {BANKS.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tr('Account number')} error={bankError}>
              <Input inputMode="numeric" value={b.account} onChange={(e) => bank.setDraft({ ...b, account: e.target.value.replace(/\s/g, '') })} placeholder="0123456789" />
            </Field>
            <Field label={tr('Account holder')} hint={tr('As the bank writes it, without accents: VO GIA HUY.')}>
              <Input value={b.name} onChange={(e) => bank.setDraft({ ...b, name: e.target.value.toUpperCase() })} placeholder="VO GIA HUY" />
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-[0.8rem] font-medium text-bone">{tr('Test the QR')}</p>
            {b.bin && b.account && b.name ? (
              <div className="adm-qr">
                <img src={qrPreview(b)} alt={tr('A test QR code for 10.000 ₫')} />
                <small>{tr('Scan it with your banking app: it should show your name and 10.000 ₫. No need to send it.')}</small>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-line p-4 text-[0.8rem] text-bone-faint">{tr('Fill in the three lines to see the QR code.')}</p>
            )}
          </div>
        </div>
      </FormSection>

      <FormSection title={tr('Tips')} description={tr('A tip jar under the shop and on /me. A visitor picks an amount or types their own.')} dirty={tips.dirty} saving={tips.saving} onSave={() => tips.save()} onReset={tips.reset}>
        <Switch on={tips.draft.active} onChange={(active) => tips.setDraft({ ...tips.draft, active })} label={tr('Tip jar open')} />
        <Field label={tr('Amounts to offer')} hint={tr('Up to four.')}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <MoneyInput key={i} value={tips.draft.amounts[i] ?? 0} onChange={(v) => tips.setDraft({ ...tips.draft, amounts: [0, 1, 2, 3].map((j) => (j === i ? v : tips.draft.amounts[j] ?? 0)).filter(Boolean) })} aria-label={tr('Amount {0}', i + 1)} />
            ))}
          </div>
        </Field>
      </FormSection>

      <FormSection title={tr('Confirm payments by themselves')} description={tr('With SePay, a transfer that carries an order’s code marks it paid the moment it arrives.')}>
        <div className={clsx('adm-status', autoPay && 'is-on')}>
          <Zap size={16} aria-hidden="true" />
          <span>
            <b>{autoPay ? tr('On: SePay confirms payments') : tr('Off: you press “Mark paid” yourself')}</b>
            {!autoPay && <small>{tr('Make a free SePay account, link this bank account, add a webhook to {0}/api/store/sepay with API-key authentication, and put the key in SEPAY_API_KEY on the server. Every transfer that carries an order’s code then marks it paid.', import.meta.env.VITE_SPACEHANK_API_URL || 'https://…')}</small>}
          </span>
        </div>
      </FormSection>
    </div>
  );
}

// ---------------------------------------------------------------- the shop

const SUBS = [
  ['orders', tr('Orders'), ShoppingBag],
  ['products', tr('Products'), Package],
  ['calls', tr('Calls'), CalendarClock],
  ['members', tr('Membership'), Gem],
  ['payments', tr('Payments'), Landmark],
];

/**
 * The shop: what sells on the portfolio and what came of it. Orders in a table that pages and searches (paid ones go into
 * Money by themselves); products in a table, each edited in a drawer with its cover dropped in; paid calls and the booked ones;
 * membership tiers and their members; and how money arrives (the bank account with a test QR, tips, SePay).
 */
export default function StorePanel() {
  const state = useStore(shop);
  const [sub, setSub] = useState('orders');
  useEffect(() => {
    void loadShop();
  }, []);
  const summary = useMemo(() => salesSummary(state.orders), [state.orders]);

  if (!state.loaded) return <p className="font-mono text-fine text-bone-dim">{tr('Opening the shop…')}</p>;
  if (!state.config) {
    return (
      <EmptyNote icon={ShoppingBag} title={tr('The shop could not be reached')}>
        {state.error}
      </EmptyNote>
    );
  }
  const waiting = state.orders.filter((o) => ['pending', 'overdue'].includes(orderState(o)) && o.kind !== 'lead').length;

  return (
    <div className="flex flex-col gap-4" data-store>
      <section className="adm-card">
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx('adm-status-dot', state.autoPay && 'is-on')} title={state.autoPay ? tr('Payments confirm themselves (SePay)') : tr('You confirm payments by hand')} />
          <small className="text-[0.78rem] text-bone-dim">{state.autoPay ? tr('Payments confirm themselves (SePay)') : tr('You confirm payments by hand')}</small>
          {state.discordBot && (
            <small className="inline-flex items-center gap-1 text-[0.78rem] text-ok">
              <BadgeCheck size={12} aria-hidden="true" /> {tr('Discord roles by themselves')}
            </small>
          )}
          <span className="flex-1" />
          <PublicDoors
            pages={[
              ['/shop', tr('Shop')],
              ['/book', tr('Book a call')],
              ['/join', tr('Membership')],
            ]}
          />
          <button type="button" onClick={() => loadShop(true)} className="grid size-8 place-items-center rounded-full text-bone-faint hover:bg-wash/[0.06] hover:text-bone" aria-label={tr('Refresh')}>
            <RefreshCw size={14} className={clsx(state.busy && 'animate-spin')} aria-hidden="true" />
          </button>
        </div>
        <div className="adm-kpis mt-4">
          <div>
            <small>{tr('Sold today')}</small>
            <b className={summary.today ? 'text-ok' : ''}>{vndShort(summary.today)}</b>
          </div>
          <div>
            <small>{tr('This month')}</small>
            <b>{vndShort(summary.month)}</b>
          </div>
          <div>
            <small>{tr('Sales this month')}</small>
            <b>{summary.sales}</b>
          </div>
          <div>
            <small>{tr('Waiting to be paid')}</small>
            <b className={summary.overdue.length ? 'text-danger' : ''}>{vndShort(summary.waiting)}</b>
          </div>
        </div>
        {!state.config.bank.account && (
          <button type="button" onClick={() => setSub('payments')} className="mt-4 w-full rounded-xl border border-warn/40 bg-warn/10 px-3.5 py-2.5 text-left text-fine text-warn">
            {tr('Add your bank account under Payments before anything can be sold.')} →
          </button>
        )}
      </section>

      <nav className="adm-tabs" role="tablist" aria-label={tr('Shop')}>
        {SUBS.map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={sub === id} className={clsx(sub === id && 'is-on')} onClick={() => setSub(id)}>
            <Icon size={14} aria-hidden="true" /> {label}
            {id === 'orders' && waiting > 0 && <b>{waiting}</b>}
          </button>
        ))}
      </nav>

      <div key={sub} className="cl-rise">
        {sub === 'orders' && (
          <section className="adm-card">
            <Orders orders={state.orders} />
          </section>
        )}
        {sub === 'products' && (
          <section className="adm-card">
            <Products orders={state.orders} />
          </section>
        )}
        {sub === 'calls' && <Calls orders={state.orders} />}
        {sub === 'members' && <Members orders={state.orders} hasBot={state.discordBot} />}
        {sub === 'payments' && <Payments autoPay={state.autoPay} />}
      </div>
    </div>
  );
}

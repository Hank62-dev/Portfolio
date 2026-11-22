import { useEffect, useState } from 'react';
import { Check, Handshake, Inbox, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button, Input, Textarea, pushToast } from '../../../shared/ui';
import { useStore } from '../../core/store';
import { locale, tr } from '../../core/i18n/lang';
import { newDeal, sponsorRate, vnd } from './model';
import { loadShop, saveShop, setOrder, shop } from './shopStore';
import { creatorSettings, deals } from './store';
import { dealFromLead, orderState } from './studio';
import { EmptyNote } from './ui';
import { PublicDoors } from './StorePanel';
import { DataTable, Drawer, Field, FormSection, ListHead, MoneyInput, Pill, AsyncButton, useConfirm } from './admin';

const num = (v) => Math.max(0, Math.round(Number(String(v).replace(/[^\d]/g, '')) || 0));

/** The rates a media kit could start from, worked out from the average views and the CPM you assume (in Deals' pricing). Pure. */
export const suggestRates = (stats, cpm) => {
  const views = stats.reduce((best, s) => Math.max(best, s.avgViews || 0), 0);
  if (!views || !cpm) return [];
  const one = sponsorRate({ avgViews: views, cpm }).mid;
  const round = (n) => Math.max(100000, Math.round(n / 50000) * 50000);
  return [
    { title: tr('One sponsored short video'), price: round(one), detail: tr('Script, filming and editing; your brand in the first ten seconds') },
    { title: tr('Three videos over a month'), price: round(one * 2.6), detail: tr('A small series, with a code or link in each') },
    { title: tr('Video and a Discord post'), price: round(one * 1.3), detail: tr('The video, then a pinned post in the community') },
  ];
};

/** One enquiry in a drawer: who wrote, about what, and the way into Deals. */
function LeadDrawer({ lead, onClose }) {
  const fresh = orderState(lead) === 'new';
  return (
    <Drawer
      open
      onClose={onClose}
      title={lead.title}
      subtitle={new Date(lead.createdAt).toLocaleString(locale(), { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
      footer={
        fresh && (
          <>
            <span className="flex-1" />
            <AsyncButton variant="ghost" size="sm" onClick={async () => (await setOrder(lead.id, 'done'), onClose())}>
              <Check size={13} aria-hidden="true" /> {tr('Answered')}
            </AsyncButton>
            <AsyncButton
              size="sm"
              onClick={async () => {
                await deals.create({ ...newDeal(dealFromLead(lead)), followUpAt: Date.now() });
                await setOrder(lead.id, 'done');
                pushToast(tr('Added to Deals, with a follow-up today'), { tone: 'success' });
                onClose();
              }}
            >
              <Handshake size={13} aria-hidden="true" /> {tr('Add to Deals')}
            </AsyncButton>
          </>
        )
      }
    >
      <dl className="adm-dl">
        {[
          [tr('Name'), lead.buyer?.name],
          [tr('Contact'), lead.buyer?.contact],
          [tr('Brand or company'), lead.buyer?.company],
          [tr('Budget'), lead.amount ? vnd(lead.amount) : ''],
          [tr('Package'), lead.ref],
        ]
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      <p className="mt-5 mb-1.5 text-[0.8rem] font-medium text-bone">{tr('Message')}</p>
      <p className="rounded-xl border border-line bg-ink-2 p-3.5 text-fine whitespace-pre-line text-bone">{lead.buyer?.note}</p>
    </Drawer>
  );
}

/** A part of the kit as a draft that is saved on its own. */
const useKitDraft = () => {
  const { config } = useStore(shop);
  const [kit, setKit] = useState(config?.kit);
  const [saving, setSaving] = useState(false);
  useEffect(() => setKit(config?.kit), [config]);
  const save = async () => {
    setSaving(true);
    try {
      await saveShop({ ...shop.get().config, kit });
      pushToast(tr('Media kit saved'), { tone: 'success' });
    } catch (e) {
      pushToast(e.message, { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };
  const dirtyOf = (...keys) => keys.some((k) => JSON.stringify(kit?.[k]) !== JSON.stringify(config?.kit?.[k]));
  const resetOf = (...keys) => () => setKit((x) => ({ ...x, ...Object.fromEntries(keys.map((k) => [k, config.kit[k]])) }));
  return { kit, setKit, saving, save, dirtyOf, resetOf };
};

/**
 * The media kit for brands (/kit on the portfolio): the enquiries it brought in, in a table; who you are and who watches; your
 * numbers by platform; and the rates, which can start from your own numbers.
 */
export default function KitPanel() {
  const state = useStore(shop);
  const settings = useStore(creatorSettings);
  const { kit, setKit, saving, save, dirtyOf, resetOf } = useKitDraft();
  const [open, setOpen] = useState(null);
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    void loadShop();
    void deals.load();
  }, []);

  if (!state.loaded) return <p className="font-mono text-fine text-bone-dim">{tr('Opening the shop…')}</p>;
  if (!state.config || !kit) {
    return (
      <EmptyNote icon={Inbox} title={tr('The shop could not be reached')}>
        {state.error}
      </EmptyNote>
    );
  }
  const set = (patch) => setKit({ ...kit, ...patch });
  const leads = state.orders.filter((o) => o.kind === 'lead');
  const current = leads.find((l) => l.id === open);
  const suggestions = suggestRates(kit.stats, settings.cpm);
  const reach = kit.stats.reduce((n, s) => n + s.followers, 0);

  return (
    <div className="flex flex-col gap-4" data-kit>
      <section className="adm-card">
        <ListHead title={tr('Enquiries')} count={leads.length}>
          <PublicDoors pages={[['/kit', tr('Media kit')]]} />
        </ListHead>
        <DataTable
          rows={leads}
          onOpen={(l) => setOpen(l.id)}
          empty={
            <EmptyNote icon={Inbox} title={tr('No enquiries yet')}>
              {tr('Put the media kit’s address in your bio and in your pitches: brands write from its form, and it lands here.')}
            </EmptyNote>
          }
          columns={[
            {
              key: 'who',
              label: tr('From'),
              width: 'minmax(0,1.4fr)',
              render: (l) => (
                <span className="min-w-0">
                  <b className="block truncate font-medium text-bone">{l.title}</b>
                  <small className="block truncate text-[0.72rem] text-bone-faint">{l.buyer?.contact}</small>
                </span>
              ),
            },
            { key: 'msg', label: tr('Message'), width: 'minmax(0,2fr)', render: (l) => <span className="truncate text-bone-dim">{l.buyer?.note}</span> },
            { key: 'budget', label: tr('Budget'), width: '7.5rem', className: 'text-right', render: (l) => <span className="font-mono tabular-nums text-bone-dim">{l.amount ? vnd(l.amount) : '—'}</span> },
            { key: 'state', label: tr('Status'), width: '7rem', render: (l) => <Pill tone={orderState(l) === 'new' ? 'warn' : 'default'}>{orderState(l) === 'new' ? tr('New') : tr('Answered')}</Pill> },
          ]}
        />
      </section>

      <FormSection title={tr('About you')} description={tr('The top of the kit: one line that says what you make, then who you are and who watches.')} dirty={dirtyOf('headline', 'about', 'audience', 'brands')} saving={saving} onSave={save} onReset={resetOf('headline', 'about', 'audience', 'brands')}>
        <Field label={tr('Headline')} hint={`${kit.headline.length} / 120`}>
          <Input value={kit.headline} onChange={(e) => set({ headline: e.target.value })} maxLength={120} placeholder={tr('e.g. Developer tips for Vietnamese students, every day')} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={tr('About you')} hint={`${kit.about.length} / 800`}>
            <Textarea rows={5} value={kit.about} onChange={(e) => set({ about: e.target.value })} maxLength={800} placeholder={tr('About you and what you make')} />
          </Field>
          <Field label={tr('Audience')} hint={`${kit.audience.length} / 400`}>
            <Textarea rows={5} value={kit.audience} onChange={(e) => set({ audience: e.target.value })} maxLength={400} placeholder={tr('Who watches: age, where, what they care about')} />
          </Field>
        </div>
        <Field label={tr('Worked with')} hint={tr('Brands or clients, separated by commas')}>
          <Input value={kit.brands} onChange={(e) => set({ brands: e.target.value })} maxLength={200} />
        </Field>
      </FormSection>

      <FormSection title={tr('Your numbers')} description={tr('Followers and average views from each platform’s analytics: the average of your last ten videos is fair.')} dirty={dirtyOf('stats')} saving={saving} onSave={save} onReset={resetOf('stats')}>
        {kit.stats.length > 0 && (
          <div className="adm-rows">
            <div className="adm-rows-head">
              <span>{tr('Platform')}</span>
              <span>{tr('Handle')}</span>
              <span>{tr('Followers')}</span>
              <span>{tr('Average views')}</span>
              <span />
            </div>
            {kit.stats.map((s, i) => {
              const patch = (p) => set({ stats: kit.stats.map((x, j) => (j === i ? { ...x, ...p } : x)) });
              return (
                <div key={i} className="adm-rows-row">
                  <Input aria-label={tr('Platform')} value={s.platform} onChange={(e) => patch({ platform: e.target.value })} placeholder="TikTok" compact />
                  <Input aria-label={tr('Handle')} value={s.handle} onChange={(e) => patch({ handle: e.target.value })} placeholder="@hank62" compact />
                  <Input aria-label={tr('Followers')} inputMode="numeric" value={s.followers ? s.followers.toLocaleString('vi-VN') : ''} onChange={(e) => patch({ followers: num(e.target.value) })} compact />
                  <Input aria-label={tr('Average views')} inputMode="numeric" value={s.avgViews ? s.avgViews.toLocaleString('vi-VN') : ''} onChange={(e) => patch({ avgViews: num(e.target.value) })} compact />
                  <button type="button" onClick={async () => (await confirm({ title: tr('Remove {0}?', s.platform || tr('this platform')), body: tr('It leaves the list now; it is gone from the kit once you save.'), action: tr('Remove') })) && set({ stats: kit.stats.filter((_, j) => j !== i) })} className="grid size-9 place-items-center rounded-full text-bone-faint hover:text-danger" aria-label={tr('Remove')}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => set({ stats: [...kit.stats, { platform: '', handle: '', followers: 0, avgViews: 0 }] })} disabled={kit.stats.length >= 8}>
            <Plus size={14} aria-hidden="true" /> {tr('Add a platform')}
          </Button>
          {reach > 0 && <small className="text-[0.8rem] text-bone-dim">{tr('Total reach: {0}', reach.toLocaleString(locale()))}</small>}
        </div>
      </FormSection>

      <FormSection title={tr('Rates')} description={tr('Packages a brand can ask for, each with a starting price. “From” prices leave room to talk.')} dirty={dirtyOf('rates')} saving={saving} onSave={save} onReset={resetOf('rates')}>
        {kit.rates.map((r, i) => {
          const patch = (p) => set({ rates: kit.rates.map((x, j) => (j === i ? { ...x, ...p } : x)) });
          return (
            <div key={i} className="adm-rate">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem]">
                <Field label={tr('Package')}>
                  <Input value={r.title} onChange={(e) => patch({ title: e.target.value })} maxLength={70} />
                </Field>
                <Field label={tr('From')}>
                  <MoneyInput value={r.price} onChange={(price) => patch({ price })} aria-label={tr('From')} />
                </Field>
              </div>
              <Field label={tr('What is in it')}>
                <Input value={r.detail} onChange={(e) => patch({ detail: e.target.value })} maxLength={200} />
              </Field>
              <button type="button" onClick={async () => (await confirm({ title: tr('Remove {0}?', r.title || tr('this package')), body: tr('It leaves the list now; it is gone from the kit once you save.'), action: tr('Remove') })) && set({ rates: kit.rates.filter((_, j) => j !== i) })} className="adm-rate-remove" aria-label={tr('Remove')}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => set({ rates: [...kit.rates, { title: '', price: 0, detail: '' }] })} disabled={kit.rates.length >= 8}>
            <Plus size={14} aria-hidden="true" /> {tr('Add a package')}
          </Button>
          {suggestions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => set({ rates: [...kit.rates, ...suggestions].slice(0, 8) })}>
              <Sparkles size={14} aria-hidden="true" /> {tr('Suggest from my numbers')}
            </Button>
          )}
        </div>
        <small className="text-[0.76rem] text-bone-faint">{tr('Suggestions use your best average views and the CPM you set in Money ({0} for a thousand views). They are a start, not a price list.', vnd(settings.cpm))}</small>
      </FormSection>

      {current && <LeadDrawer key={current.id} lead={current} onClose={() => setOpen(null)} />}
      {confirmDialog}
    </div>
  );
}

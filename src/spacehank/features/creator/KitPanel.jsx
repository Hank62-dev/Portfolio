import { useEffect, useState } from 'react';
import { BarChart3, Check, Handshake, Inbox, Megaphone, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Badge, Button, Input, Textarea, pushToast } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { useStore } from '../../core/store';
import { locale, tr } from '../../core/i18n/lang';
import { newDeal, sponsorRate, vnd } from './model';
import { loadShop, saveShop, setOrder, shop } from './shopStore';
import { creatorSettings, deals } from './store';
import { dealFromLead, orderState } from './studio';
import { EmptyNote, Label, Panel, Row } from './ui';
import { PublicDoors } from './StorePanel';

const num = (v) => Math.max(0, Math.round(Number(String(v).replace(/[^\d]/g, '')) || 0));

/** The rates a media kit could start from, worked out from the average views and the CPM you assume (in Money's settings). Pure. */
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

/** One enquiry that came in from the media kit: who, what, and the way into Deals. */
function Lead({ lead }) {
  const [busy, setBusy] = useState(false);
  const state = orderState(lead);
  return (
    <li className={clsx('cl-card flex flex-col gap-2 rounded-2xl border p-3.5', state === 'new' ? 'border-warn/40' : 'border-line opacity-75')} data-lead>
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-fine font-medium text-bone">{lead.title}</b>
        {state === 'new' && <Badge tone="warn">{tr('New')}</Badge>}
        {lead.amount > 0 && <Badge>{vnd(lead.amount)}</Badge>}
        {lead.ref && <Badge>{lead.ref}</Badge>}
        <span className="flex-1" />
        <small className="font-mono text-[0.66rem] text-bone-faint">{new Date(lead.createdAt).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })}</small>
      </div>
      <p className="text-[0.8rem] text-bone-dim">{[lead.buyer?.name, lead.buyer?.contact].filter(Boolean).join(' · ')}</p>
      <p className="text-[0.85rem] whitespace-pre-line text-bone">{lead.buyer?.note}</p>
      {state === 'new' && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await deals.create({ ...newDeal(dealFromLead(lead)), followUpAt: Date.now() });
                await setOrder(lead.id, 'done');
                pushToast(tr('Added to Deals, with a follow-up today'), { tone: 'success' });
              } catch (e) {
                pushToast(e.message, { tone: 'error' });
                setBusy(false);
              }
            }}
          >
            <Handshake size={13} aria-hidden="true" /> {tr('Add to Deals')}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setOrder(lead.id, 'done')}>
            <Check size={13} aria-hidden="true" /> {tr('Answered')}
          </Button>
        </div>
      )}
    </li>
  );
}

/**
 * The media kit for brands (/kit on the portfolio): reach by platform, the audience, the rates, who you worked with; and the
 * enquiries it brings in, each one a tap away from Deals.
 */
export default function KitPanel() {
  const state = useStore(shop);
  const settings = useStore(creatorSettings);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadShop();
    void deals.load();
  }, []);
  useEffect(() => {
    if (state.config) setDraft(state.config);
  }, [state.config]);

  if (!state.loaded) return <p className="font-mono text-fine text-bone-dim">{tr('Opening the shop…')}</p>;
  if (!draft) {
    return (
      <EmptyNote icon={Megaphone} title={tr('The shop could not be reached')}>
        {state.error}
      </EmptyNote>
    );
  }

  const kit = draft.kit;
  const setKit = (patch) => setDraft({ ...draft, kit: { ...kit, ...patch } });
  const leads = state.orders.filter((o) => o.kind === 'lead');
  const dirty = JSON.stringify(draft) !== JSON.stringify(state.config);
  const suggestions = suggestRates(kit.stats, settings.cpm);
  const save = async () => {
    setSaving(true);
    try {
      await saveShop(draft);
      pushToast(tr('Media kit saved'), { tone: 'success' });
    } catch (e) {
      pushToast(e.message, { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4" data-kit>
      <Panel title={tr('Enquiries')} icon={Inbox} hue={22} aside={<PublicDoors pages={[['/kit', tr('Media kit')]]} />}>
        {leads.length === 0 ? (
          <EmptyNote icon={Inbox} title={tr('No enquiries yet')}>
            {tr('Put the media kit’s address in your bio and in your pitches: brands write from its form, and it lands here.')}
          </EmptyNote>
        ) : (
          <ul className="flex flex-col gap-2">
            {leads.map((l) => (
              <Lead key={l.id} lead={l} />
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={tr('Your numbers')} icon={BarChart3} hue={205}>
        <Row label={tr('Headline')}>
          <Input aria-label={tr('Headline')} placeholder={tr('e.g. Developer tips for Vietnamese students, every day')} value={kit.headline} onChange={(e) => setKit({ headline: e.target.value })} maxLength={120} compact />
        </Row>
        <ul className="mt-4 flex flex-col gap-2">
          {kit.stats.map((s, i) => {
            const patch = (p) => setKit({ stats: kit.stats.map((x, j) => (j === i ? { ...x, ...p } : x)) });
            return (
              <li key={i} className="grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <Input aria-label={tr('Platform')} placeholder={tr('Platform')} value={s.platform} onChange={(e) => patch({ platform: e.target.value })} compact />
                <Input aria-label={tr('Handle')} placeholder="@hank62" value={s.handle} onChange={(e) => patch({ handle: e.target.value })} compact />
                <Input aria-label={tr('Followers')} placeholder={tr('Followers')} inputMode="numeric" value={s.followers || ''} onChange={(e) => patch({ followers: num(e.target.value) })} compact />
                <Input aria-label={tr('Average views')} placeholder={tr('Average views')} inputMode="numeric" value={s.avgViews || ''} onChange={(e) => patch({ avgViews: num(e.target.value) })} compact />
                <button type="button" onClick={() => setKit({ stats: kit.stats.filter((_, j) => j !== i) })} className="rounded-full p-2 text-bone-faint hover:text-danger" aria-label={tr('Remove')}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setKit({ stats: [...kit.stats, { platform: '', handle: '', followers: 0, avgViews: 0 }] })}>
          <Plus size={14} aria-hidden="true" /> {tr('Add a platform')}
        </Button>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Textarea aria-label={tr('About you')} rows={4} placeholder={tr('About you and what you make')} value={kit.about} onChange={(e) => setKit({ about: e.target.value })} />
          <Textarea aria-label={tr('Audience')} rows={4} placeholder={tr('Who watches: age, where, what they care about')} value={kit.audience} onChange={(e) => setKit({ audience: e.target.value })} />
        </div>
      </Panel>

      <Panel title={tr('Rates')} icon={Megaphone} hue={46}>
        <ul className="flex flex-col gap-2">
          {kit.rates.map((r, i) => {
            const patch = (p) => setKit({ rates: kit.rates.map((x, j) => (j === i ? { ...x, ...p } : x)) });
            return (
              <li key={i} className="cl-card grid gap-2 rounded-2xl border border-line p-3 md:grid-cols-[minmax(0,1fr)_9rem_minmax(0,1.4fr)_auto]">
                <Input aria-label={tr('Package')} placeholder={tr('Package')} value={r.title} onChange={(e) => patch({ title: e.target.value })} compact />
                <Input aria-label={tr('From (₫)')} placeholder={tr('From (₫)')} inputMode="numeric" value={r.price || ''} onChange={(e) => patch({ price: num(e.target.value) })} compact />
                <Input aria-label={tr('What is in it')} placeholder={tr('What is in it')} value={r.detail} onChange={(e) => patch({ detail: e.target.value })} compact />
                <button type="button" onClick={() => setKit({ rates: kit.rates.filter((_, j) => j !== i) })} className="rounded-full p-2 text-bone-faint hover:text-danger" aria-label={tr('Remove')}>
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setKit({ rates: [...kit.rates, { title: '', price: 0, detail: '' }] })}>
            <Plus size={14} aria-hidden="true" /> {tr('Add a package')}
          </Button>
          {suggestions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setKit({ rates: [...kit.rates, ...suggestions].slice(0, 8) })}>
              <Sparkles size={14} aria-hidden="true" /> {tr('Suggest from my numbers')}
            </Button>
          )}
        </div>
        <Label className="mt-3">{tr('Suggestions use your best average views and the CPM you set in Money ({0} for a thousand views). They are a start, not a price list.', vnd(settings.cpm))}</Label>
        <div className="mt-4">
          <Row label={tr('Worked with')}>
            <Input aria-label={tr('Worked with')} placeholder={tr('Brands or clients, separated by commas')} value={kit.brands} onChange={(e) => setKit({ brands: e.target.value })} compact />
          </Row>
        </div>
      </Panel>

      <div className="sticky bottom-24 z-20 flex justify-end md:bottom-4">
        <Button onClick={save} disabled={!dirty || saving} className={clsx('shadow-[0_14px_30px_-12px_rgb(0_0_0/0.6)]', !dirty && 'opacity-60')} data-save-kit>
          <Check size={15} aria-hidden="true" /> {saving ? tr('Saving…') : dirty ? tr('Save the media kit') : tr('Saved')}
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Link2, MousePointerClick, Plus, Trash2, UserRound, Wallet } from 'lucide-react';
import { Button, Dialog, Input, pushToast } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';
import { newIncome, vnd } from './model';
import { loadShop, saveShop, shop, siteOrigin } from './shopStore';
import { income } from './store';
import { clicksSeries } from './studio';
import { Chip, EmptyNote, Label, Panel, Row, Spark, Stat, copyText } from './ui';
import { PublicDoors } from './StorePanel';

const num = (v) => Math.max(0, Math.round(Number(String(v).replace(/[^\d]/g, '')) || 0));

/** Writing down a commission an affiliate link earned: it goes into Money, under Affiliate, tied to the link. */
function Commission({ link, onClose }) {
  const [amount, setAmount] = useState('');
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={tr('AFFILIATE')} title={link.title} description={tr('Write down a commission this link earned. It goes into Money, under Affiliate.')}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!num(amount)) return;
          await income.create(newIncome({ amount: num(amount), source: 'affiliate', note: link.title, linkId: link.id }));
          pushToast(tr('Commission logged'), { tone: 'success' });
          onClose();
        }}
      >
        <Input aria-label={tr('Amount (₫)')} inputMode="numeric" placeholder={tr('e.g. 85000')} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <Button type="submit" disabled={!num(amount)} className="w-full justify-center">
          <Check size={15} aria-hidden="true" /> {tr('Log it')}
        </Button>
      </form>
    </Dialog>
  );
}

/**
 * The link-in-bio page (/me) and its links: who you are, then every link with its short address (/go/…), how often it was
 * tapped in the last two weeks, and for affiliate links what they earned. The page lives on the portfolio.
 */
export default function LinksPanel() {
  const state = useStore(shop);
  const { items: entries } = useStore(income.store);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logging, setLogging] = useState(null);

  useEffect(() => {
    void loadShop();
    void income.load();
  }, []);
  useEffect(() => {
    if (state.config) setDraft(state.config);
  }, [state.config]);

  const earnedBy = useMemo(() => {
    const out = {};
    for (const e of entries) if (e.linkId) out[e.linkId] = (out[e.linkId] ?? 0) + e.amount;
    return out;
  }, [entries]);
  const totalTaps = Object.values(state.clicks ?? {}).reduce((n, c) => n + (c.total ?? 0), 0);
  const weekTaps = Object.values(state.clicks ?? {}).reduce((n, c) => n + clicksSeries(c, 7).reduce((a, d) => a + d.n, 0), 0);
  const affiliateEarned = Object.values(earnedBy).reduce((a, b) => a + b, 0);

  if (!state.loaded) return <p className="font-mono text-fine text-bone-dim">{tr('Opening the shop…')}</p>;
  if (!draft) {
    return (
      <EmptyNote icon={Link2} title={tr('The shop could not be reached')}>
        {state.error}
      </EmptyNote>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(state.config);
  const setLinks = (links) => setDraft({ ...draft, links });
  const save = async () => {
    setSaving(true);
    try {
      await saveShop(draft);
      pushToast(tr('Links saved'), { tone: 'success' });
    } catch (e) {
      pushToast(e.message, { tone: 'error' });
    } finally {
      setSaving(false);
    }
  };
  // the most tapped first, so what works is on top
  const ranked = [...draft.links].map((l, i) => ({ l, i })).sort((a, b) => (state.clicks?.[b.l.id]?.total ?? 0) - (state.clicks?.[a.l.id]?.total ?? 0));

  return (
    <div className="flex flex-col gap-4" data-links>
      <div className="grid grid-cols-3 gap-2.5">
        <Stat value={weekTaps} label={tr('Taps this week')} icon={MousePointerClick} />
        <Stat value={totalTaps} label={tr('Taps in all')} />
        <Stat value={vnd(affiliateEarned)} label={tr('From affiliate links')} tone={affiliateEarned ? 'text-ok' : 'text-bone'} />
      </div>

      <Panel title={tr('Your page')} icon={UserRound} hue={305} aside={<PublicDoors pages={[['/me', tr('Link in bio')]]} />}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Row label={tr('Name')}>
            <Input aria-label={tr('Name')} value={draft.profile.name} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, name: e.target.value } })} maxLength={60} compact />
          </Row>
          <Row label={tr('One line about you')}>
            <Input aria-label={tr('One line about you')} value={draft.profile.bio} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, bio: e.target.value } })} maxLength={200} compact />
          </Row>
        </div>
        <div className="mt-3">
          <Row label={tr('Picture (link, optional)')}>
            <Input aria-label={tr('Picture (link, optional)')} placeholder="https://…" value={draft.profile.avatar} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, avatar: e.target.value } })} compact />
          </Row>
        </div>
      </Panel>

      <Panel title={tr('Links')} icon={Link2} hue={205}>
        {draft.links.length === 0 && <p className="mb-3 text-fine text-bone-faint">{tr('Your channels, your latest video, a product you recommend with an affiliate link… Each one gets a short address that counts its taps.')}</p>}
        <ul className="flex flex-col gap-2.5">
          {ranked.map(({ l, i }) => {
            const series = clicksSeries(state.clicks?.[l.id], 14);
            const patch = (p) => setLinks(draft.links.map((x, j) => (j === i ? { ...x, ...p } : x)));
            return (
              <li key={l.id || `new${i}`} className={clsx('cl-card flex flex-col gap-2.5 rounded-2xl border border-line p-3.5', l.active === false && 'opacity-60')}>
                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                  <Input aria-label={tr('Title')} placeholder={tr('Title')} value={l.title} onChange={(e) => patch({ title: e.target.value })} maxLength={70} compact />
                  <Input aria-label={tr('Address')} placeholder="https://…" value={l.url} onChange={(e) => patch({ url: e.target.value })} compact />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip on={l.kind === 'affiliate'} onClick={() => patch({ kind: l.kind === 'affiliate' ? 'link' : 'affiliate' })}>
                    {tr('Affiliate')}
                  </Chip>
                  <Chip on={l.active !== false} onClick={() => patch({ active: l.active === false })}>
                    {l.active === false ? tr('Hidden') : tr('Shown')}
                  </Chip>
                  {l.id && (
                    <button type="button" onClick={() => copyText(`${siteOrigin()}/go/${l.id}`, tr('Short link copied'))} className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-[0.68rem] text-bone-dim hover:text-bone">
                      <Copy size={11} aria-hidden="true" /> /go/{l.id}
                    </button>
                  )}
                  <span className="flex-1" />
                  <span className="flex items-center gap-2" title={tr('Taps in the last two weeks')}>
                    <Spark values={series.map((d) => d.n)} className="h-6 w-20" />
                    <b className="font-mono text-[0.78rem] tabular-nums text-bone">{state.clicks?.[l.id]?.total ?? 0}</b>
                  </span>
                  {l.kind === 'affiliate' && l.id && (
                    <Button size="sm" variant="ghost" onClick={() => setLogging(l)}>
                      <Wallet size={13} aria-hidden="true" /> {earnedBy[l.id] ? vnd(earnedBy[l.id]) : tr('Log commission')}
                    </Button>
                  )}
                  <button type="button" onClick={() => setLinks(draft.links.filter((_, j) => j !== i))} className="rounded-full p-1.5 text-bone-faint hover:text-danger" aria-label={tr('Remove')}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLinks([...draft.links, { id: '', title: '', url: '', kind: 'link', active: true }])}>
            <Plus size={14} aria-hidden="true" /> {tr('Add a link')}
          </Button>
          <Label>{tr('Shopee, TikTok Shop and Lazada links can be marked Affiliate: the page says so to visitors.')}</Label>
        </div>
      </Panel>

      <div className="sticky bottom-24 z-20 flex justify-end md:bottom-4">
        <Button onClick={save} disabled={!dirty || saving} className={clsx('shadow-[0_14px_30px_-12px_rgb(0_0_0/0.6)]', !dirty && 'opacity-60')} data-save-links>
          <Check size={15} aria-hidden="true" /> {saving ? tr('Saving…') : dirty ? tr('Save the links') : tr('Saved')}
        </Button>
      </div>

      {logging && <Commission link={logging} onClose={() => setLogging(null)} />}
    </div>
  );
}

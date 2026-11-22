import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Link2, Plus, Trash2, Wallet } from 'lucide-react';
import { Button, Input, Textarea, pushToast } from '../../../shared/ui';
import { useStore } from '../../core/store';
import { tr } from '../../core/i18n/lang';
import { newIncome, vnd } from './model';
import { loadShop, saveShop, shop, siteOrigin } from './shopStore';
import { income } from './store';
import { clicksSeries } from './studio';
import { EmptyNote, Spark, copyText } from './ui';
import { PublicDoors } from './StorePanel';
import { DataTable, Drawer, Field, FormSection, ImageDrop, ListHead, MoneyInput, Pill, SearchBox, Switch, AsyncButton, useConfirm } from './admin';

const urlOk = (url) => /^https?:\/\/\S+\.\S+/.test(url);

/** One link in a drawer: its title and address, whether it is affiliate and shown, its short address, and its commissions. */
function LinkDrawer({ link, earned, onClose, onSave, onDelete, askDelete }) {
  const [l, setL] = useState(link);
  const [amount, setAmount] = useState(0);
  const set = (patch) => setL((x) => ({ ...x, ...patch }));
  const isNew = !link.id;
  const valid = l.title.trim() && urlOk(l.url);
  return (
    <Drawer
      open
      onClose={onClose}
      title={isNew ? tr('New link') : l.title}
      subtitle={tr('A button on your link-in-bio page. Every tap goes through its short address and is counted.')}
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
          <AsyncButton size="sm" disabled={!valid} onClick={async () => (await onSave(l)) && onClose()}>
            <Check size={13} aria-hidden="true" /> {tr('Save')}
          </AsyncButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label={tr('Title')} hint={tr('The words on the button.')}>
          <Input value={l.title} onChange={(e) => set({ title: e.target.value })} maxLength={70} placeholder={tr('e.g. My latest video')} autoFocus={isNew} />
        </Field>
        <Field label={tr('Address')} error={l.url && !urlOk(l.url) ? tr('A full address that starts with https://') : ''}>
          <Input value={l.url} onChange={(e) => set({ url: e.target.value.trim() })} placeholder="https://" />
        </Field>
        <Switch on={l.kind === 'affiliate'} onChange={(on) => set({ kind: on ? 'affiliate' : 'link' })} label={tr('Affiliate link')} hint={tr('Shopee, TikTok Shop, Lazada… The page tells visitors you may earn a commission.')} />
        <Switch on={l.active !== false} onChange={(on) => set({ active: on })} label={tr('Shown on the page')} />
        {!isNew && (
          <div className="rounded-xl border border-line bg-ink-2 p-3.5">
            <p className="text-[0.8rem] font-medium text-bone">{tr('Short address')}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <code className="truncate font-mono text-[0.8rem] text-bone-dim">
                {siteOrigin()}/go/{link.id}
              </code>
              <Button variant="ghost" size="sm" onClick={() => copyText(`${siteOrigin()}/go/${link.id}`, tr('Short link copied'))}>
                <Copy size={13} aria-hidden="true" /> {tr('Copy')}
              </Button>
            </div>
            <small className="mt-1 block text-[0.74rem] text-bone-faint">{tr('Use this one when you share the link, so its taps are counted.')}</small>
          </div>
        )}
        {!isNew && l.kind === 'affiliate' && (
          <div className="rounded-xl border border-line p-3.5">
            <p className="text-[0.8rem] font-medium text-bone">
              {tr('Commissions')} · <span className="text-ok">{vnd(earned)}</span>
            </p>
            <div className="mt-2 flex gap-2">
              <MoneyInput value={amount} onChange={setAmount} aria-label={tr('Amount')} />
              <AsyncButton
                size="sm"
                disabled={!amount}
                onClick={async () => {
                  await income.create(newIncome({ amount, source: 'affiliate', note: link.title, linkId: link.id }));
                  setAmount(0);
                  pushToast(tr('Commission logged'), { tone: 'success' });
                }}
              >
                <Wallet size={13} aria-hidden="true" /> {tr('Log commission')}
              </AsyncButton>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

/**
 * The link-in-bio page (/me): who you are (with a portrait dropped in), and the links in a table: how often each was tapped in
 * the last two weeks and what affiliate ones earned, each edited in a drawer.
 */
export default function LinksPanel() {
  const state = useStore(shop);
  const { items: entries } = useStore(income.store);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [confirm, confirmDialog] = useConfirm();

  useEffect(() => {
    void loadShop();
    void income.load();
  }, []);
  useEffect(() => {
    if (state.config) setProfile(state.config.profile);
  }, [state.config]);

  const earnedBy = useMemo(() => {
    const out = {};
    for (const e of entries) if (e.linkId) out[e.linkId] = (out[e.linkId] ?? 0) + e.amount;
    return out;
  }, [entries]);

  if (!state.loaded) return <p className="font-mono text-fine text-bone-dim">{tr('Opening the shop…')}</p>;
  if (!state.config || !profile) {
    return (
      <EmptyNote icon={Link2} title={tr('The shop could not be reached')}>
        {state.error}
      </EmptyNote>
    );
  }

  const links = state.config.links;
  const save = async (patch) => {
    try {
      await saveShop({ ...state.config, ...patch });
      pushToast(tr('Saved'), { tone: 'success' });
      return true;
    } catch (e) {
      pushToast(e.message, { tone: 'error' });
      return false;
    }
  };
  const weekTaps = Object.values(state.clicks ?? {}).reduce((n, c) => n + clicksSeries(c, 7).reduce((a, d) => a + d.n, 0), 0);
  const totalTaps = Object.values(state.clicks ?? {}).reduce((n, c) => n + (c.total ?? 0), 0);
  const affiliate = Object.values(earnedBy).reduce((a, b) => a + b, 0);
  const rows = links.map((l, i) => ({ ...l, index: i })).filter((l) => !query || `${l.title} ${l.url}`.toLowerCase().includes(query.toLowerCase()));
  const current = editing === 'new' ? { id: '', title: '', url: '', kind: 'link', active: true } : editing !== null ? links[editing] : null;
  const dirty = JSON.stringify(profile) !== JSON.stringify(state.config.profile);

  return (
    <div className="flex flex-col gap-4" data-links>
      <section className="adm-card">
        <div className="adm-kpis">
          <div>
            <small>{tr('Taps this week')}</small>
            <b>{weekTaps}</b>
          </div>
          <div>
            <small>{tr('Taps in all')}</small>
            <b>{totalTaps}</b>
          </div>
          <div>
            <small>{tr('From affiliate links')}</small>
            <b className={affiliate ? 'text-ok' : ''}>{vnd(affiliate)}</b>
          </div>
          <div>
            <small>{tr('Your page')}</small>
            <PublicDoors pages={[['/me', '/me']]} />
          </div>
        </div>
      </section>

      <FormSection
        title={tr('Your page')}
        description={tr('The top of /me: your portrait, your name and one line. Put the page’s address in your TikTok and Instagram bio.')}
        dirty={dirty}
        saving={saving}
        onReset={() => setProfile(state.config.profile)}
        onSave={async () => {
          setSaving(true);
          await save({ profile });
          setSaving(false);
        }}
      >
        <div className="grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <ImageDrop round value={profile.avatar} onChange={(avatar) => setProfile({ ...profile, avatar })} hint={tr('Empty: the portfolio’s portrait.')} />
          <div className="flex flex-col gap-4">
            <Field label={tr('Name')}>
              <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} maxLength={60} placeholder="Võ Gia Huy" />
            </Field>
            <Field label={tr('One line about you')} hint={`${profile.bio.length} / 200`}>
              <Textarea rows={2} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} maxLength={200} />
            </Field>
          </div>
        </div>
      </FormSection>

      <section className="adm-card">
        <ListHead title={tr('Links')} count={links.length}>
          <SearchBox value={query} onChange={setQuery} placeholder={tr('Search links')} />
          <Button size="sm" onClick={() => setEditing('new')} disabled={links.length >= 60}>
            <Plus size={14} aria-hidden="true" /> {tr('New link')}
          </Button>
        </ListHead>
        <DataTable
          rows={rows}
          rowKey={(l) => l.id || `i${l.index}`}
          onOpen={(l) => setEditing(l.index)}
          empty={
            <EmptyNote icon={Link2} title={tr('No links yet')}>
              {tr('Your channels, your latest video, a product you recommend with an affiliate link… Each one gets a short address that counts its taps.')}
            </EmptyNote>
          }
          columns={[
            {
              key: 'link',
              label: tr('Link'),
              width: 'minmax(0,2.4fr)',
              render: (l) => (
                <span className="min-w-0">
                  <b className="block truncate font-medium text-bone">{l.title}</b>
                  <small className="block truncate font-mono text-[0.7rem] text-bone-faint">{l.url}</small>
                </span>
              ),
            },
            { key: 'kind', label: tr('Type'), width: '7rem', render: (l) => <Pill tone={l.kind === 'affiliate' ? 'signal' : 'default'}>{l.kind === 'affiliate' ? tr('Affiliate') : tr('Link')}</Pill> },
            {
              key: 'taps',
              label: tr('Taps, 14 days'),
              width: '9rem',
              render: (l) => (
                <span className="flex items-center gap-2">
                  <Spark values={clicksSeries(state.clicks?.[l.id], 14).map((d) => d.n)} className="h-5 w-16" />
                  <b className="font-mono text-[0.78rem] font-normal tabular-nums text-bone">{state.clicks?.[l.id]?.total ?? 0}</b>
                </span>
              ),
            },
            { key: 'earned', label: tr('Earned'), width: '7rem', className: 'text-right', render: (l) => <span className="font-mono tabular-nums text-bone-dim">{l.kind === 'affiliate' ? vnd(earnedBy[l.id] ?? 0) : '—'}</span> },
            { key: 'state', label: tr('Status'), width: '6.5rem', render: (l) => <Pill tone={l.active === false ? 'default' : 'ok'}>{l.active === false ? tr('Hidden') : tr('Shown')}</Pill> },
          ]}
        />
      </section>

      {current && (
        <LinkDrawer
          key={editing}
          link={current}
          earned={earnedBy[current.id] ?? 0}
          onClose={() => setEditing(null)}
          onSave={(l) => save({ links: editing === 'new' ? [...links, l] : links.map((x, i) => (i === editing ? l : x)) })}
          askDelete={() => confirm({ title: tr('Delete the link “{0}”?', links[editing].title), body: tr('Its button leaves /me, and its short address stops working wherever you shared it. To keep it for later, switch “Shown on the page” off instead.') })}
          onDelete={async () => {
            if (await save({ links: links.filter((_, i) => i !== editing) })) setEditing(null);
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}

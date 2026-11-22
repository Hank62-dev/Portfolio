import { useState } from 'react';
import { Check } from 'lucide-react';
import { useLang } from '../../i18n';
import { vnd } from '../../services/storeService';
import { OrderButton } from './Shop';
import { StoreFrame, StoreModal, StoreState, doorsOf, useStorefront } from './shared';

/** Joining a tier: where the Discord role should go (with how to find the id), then on to paying. */
function JoinDialog({ tier, onClose }) {
  const { c } = useLang();
  const t = c.store.join;
  const [discordId, setDiscordId] = useState('');
  const [name, setName] = useState('');
  const valid = /^\d{17,20}$/.test(discordId.trim());
  return (
    <StoreModal open onClose={onClose} title={t.joinTier(tier.title)}>
      <div className="p-6 md:p-8">
        <p className="font-mono text-[0.68rem] tracking-[0.16em] text-signal uppercase">{t.eyebrow}</p>
        <h2 className="mt-2 font-display text-[1.9rem] leading-tight">{t.joinTier(tier.title)}</h2>
        <p className="mt-1 font-mono text-bone">
          {vnd(tier.price)} <span className="text-bone-faint">{t.perMonth}</span>
        </p>
        <p className="mt-4 text-[0.92rem] text-bone-dim">{t.dialogLede}</p>
        <form className="store-form mt-6" onSubmit={(e) => e.preventDefault()}>
          <label>
            <span>{t.discordId}</span>
            <input className="store-input font-mono" inputMode="numeric" value={discordId} onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ''))} maxLength={20} placeholder="123456789012345678" autoFocus />
          </label>
          {discordId && !valid ? <p className="text-[0.8rem] text-danger">{t.badId}</p> : <p className="text-[0.8rem] text-bone-faint">{t.discordHelp}</p>}
          <label>
            <span>{t.name}</span>
            <input className="store-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </label>
        </form>
        <div className="mt-7">
          <OrderButton input={{ kind: 'membership', ref: tier.id, buyer: { discordId: discordId.trim(), name } }} disabled={!valid} className="store-buy w-full">
            {t.continue} →
          </OrderButton>
        </div>
      </div>
    </StoreModal>
  );
}

/** /join: the membership tiers of the Discord community, each with its perks; choosing one asks where the role should go. */
export default function Join() {
  const { c } = useLang();
  const t = c.store.join;
  const { data, error } = useStorefront();
  const [joining, setJoining] = useState(null);
  const tiers = data?.tiers ?? [];
  const featured = tiers.length === 1 ? 0 : tiers.length > 1 ? 1 : -1;

  return (
    <StoreFrame eyebrow={t.eyebrow} title={t.title} lede={t.lede} doors={doorsOf(data, c, '/join')}>
      {!data ? (
        <StoreState error={error} />
      ) : !tiers.length ? (
        <p className="text-bone-dim">{t.empty}</p>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <li key={tier.id} className="store-tier" data-featured={i === featured}>
              {i === featured && tiers.length > 1 && <span className="store-tier-badge">{t.popular}</span>}
              <h2 className="font-display text-[1.8rem] leading-none">{tier.title}</h2>
              <p className="mt-4 font-mono">
                <b className="text-[1.6rem] font-medium text-bone">{vnd(tier.price)}</b> <span className="text-bone-faint">{t.perMonth}</span>
              </p>
              <ul className="mt-6 flex flex-col gap-2.5">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5 text-[0.95rem] text-bone-dim">
                    <Check size={16} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" /> {perk}
                  </li>
                ))}
              </ul>
              <div>
                <button type="button" className="store-buy w-full" onClick={() => setJoining(tier)}>
                  {t.join} →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {joining && <JoinDialog tier={joining} onClose={() => setJoining(null)} />}
    </StoreFrame>
  );
}

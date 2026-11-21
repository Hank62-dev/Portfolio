import { useState } from 'react';
import { Check } from 'lucide-react';
import { useLang } from '../../i18n';
import { vnd } from '../../services/storeService';
import { OrderButton } from './Shop';
import { StoreFrame, StoreState, doorsOf, useStorefront } from './shared';

/** /join: the membership tiers of the Discord community, each with its perks; joining asks for the Discord user id. */
export default function Join() {
  const { c } = useLang();
  const t = c.store.join;
  const { data, error } = useStorefront();
  const [discordId, setDiscordId] = useState('');
  const [name, setName] = useState('');
  const validId = /^\d{15,25}$/.test(discordId.trim());

  return (
    <StoreFrame eyebrow={t.eyebrow} title={t.title} lede={t.lede} doors={doorsOf(data, c, '/join')}>
      {!data ? (
        <StoreState error={error} />
      ) : !data.tiers.length ? (
        <p className="text-bone-dim">{t.empty}</p>
      ) : (
        <>
          <div className="store-form mb-10 max-w-xl">
            <label>
              <span>{t.discordId}</span>
              <input className="store-input font-mono" inputMode="numeric" value={discordId} onChange={(e) => setDiscordId(e.target.value.replace(/\D/g, ''))} maxLength={25} placeholder="123456789012345678" />
            </label>
            <p className="text-[0.82rem] text-bone-faint">{t.discordHelp}</p>
            <label>
              <span>{t.name}</span>
              <input className="store-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            </label>
          </div>
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.tiers.map((tier, i) => (
              <li key={tier.id} className="store-tier" data-featured={i === 1 || data.tiers.length === 1}>
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
                <div className="mt-8">
                  <OrderButton input={{ kind: 'membership', ref: tier.id, buyer: { discordId: discordId.trim(), name } }} disabled={!validId}>
                    {t.join} →
                  </OrderButton>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </StoreFrame>
  );
}

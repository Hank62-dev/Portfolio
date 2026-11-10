import { tr } from '../lang';
import { useMemo, useState } from 'react';
import { Hash, Megaphone, ShieldCheck } from 'lucide-react';
import { Input } from '../../../shared/ui';
import { useStore } from '../store';
import DiscordComposer from './DiscordComposer';
import { BLUEPRINT_KINDS, blueprintFor, blueprintText } from './model';
import { creatorSettings, setSetting } from './store';
import { Chip, CopyButton, Label, Panel, Row } from './ui';

const KIND_ICON = { text: '#', announcement: '!', forum: '?', voice: '♪' };

/**
 * Discord, for a developer who wants a community: a server plan to work through, a way to post announcements to your own server,
 * and the lines not to cross. Discord's own paid subscriptions are not open outside the US, so paid tiers here are done with an
 * outside page and a role you give by hand.
 */
export default function DiscordPanel() {
  const settings = useStore(creatorSettings);
  const [kind, setKind] = useState('dev');
  const plan = useMemo(() => blueprintFor(kind, settings.community || 'our community'), [kind, settings.community]);
  const text = useMemo(() => blueprintText(plan), [plan]);

  return (
    <div className="flex flex-col gap-4" data-discord>
      <Panel title={tr('Plan your server')} icon={Hash} hue={235} aside={<CopyButton text={text} label={tr('Copy checklist')} what={tr('Checklist copied')} />}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={tr('Kind of community')}>
            {BLUEPRINT_KINDS.map((k) => (
              <Chip key={k.id} on={kind === k.id} onClick={() => setKind(k.id)}>
                {k.label}
              </Chip>
            ))}
          </div>
          <Row label={tr('Community name')}>
            <Input aria-label={tr('Community name')} placeholder={tr('e.g. Hank Devs')} value={settings.community} onChange={(e) => setSetting({ community: e.target.value })} compact />
          </Row>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {plan.categories.map((c) => (
              <div key={c.name} className="cl-card rounded-2xl border border-line p-3.5">
                <Label className="mb-2">{c.name}</Label>
                <ul className="flex flex-col gap-1.5">
                  {c.channels.map((ch) => (
                    <li key={ch.name} className="text-[0.84rem] leading-snug">
                      <b className="mr-1.5 font-mono text-bone-faint">{KIND_ICON[ch.kind] ?? '#'}</b>
                      <span className="text-bone">{ch.name}</span>
                      <span className="text-bone-faint"> · {ch.topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="cl-card rounded-2xl border border-line p-3.5">
              <Label className="mb-2">{tr('Roles')}</Label>
              <ul className="flex flex-col gap-1.5 text-[0.84rem] leading-snug">
                {plan.roles.map((r) => (
                  <li key={r.name}>
                    <b className="text-bone">{r.name}</b> <span className="text-bone-faint">· {r.why}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="cl-card rounded-2xl border border-line p-3.5">
              <Label className="mb-2">{tr('Tiers')}</Label>
              <ul className="flex flex-col gap-2 text-[0.84rem] leading-snug">
                {plan.tiers.map((t) => (
                  <li key={t.name}>
                    <b className="text-bone">{t.name}</b> <span className="text-bone-faint">· {t.price}</span>
                    <br />
                    <span className="text-bone-dim">{t.perks.join(' · ')}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[0.76rem] leading-relaxed text-bone-faint">{tr('Discord\'s own paid subscriptions are available only to creators in the US (per Discord\'s support pages when this was written; check them again). A paid tier here means an outside page for payment and a role you give by hand.')}</p>
            </div>
          </div>
          <div className="cl-card rounded-2xl border border-line p-3.5">
            <Label className="mb-2">{tr('Welcome message')}</Label>
            <p className="text-fine leading-snug text-bone-dim">{plan.welcome}</p>
            <CopyButton className="mt-2" text={plan.welcome} label={tr('Copy welcome')} />
          </div>
        </div>
      </Panel>

      <Panel title={tr('Post to your server')} icon={Megaphone} hue={22}>
        <DiscordComposer />
      </Panel>

      <Panel title={tr('Lines not to cross')} icon={ShieldCheck} hue={150} aside={<ShieldCheck size={16} className="text-ok" aria-hidden="true" />}>
        <ul className="flex flex-col gap-2 text-fine leading-snug text-bone-dim" data-guardrails>
          <li>
            <b className="text-bone">{tr('No self-bots, no mass DMs.')}</b> {tr('Discord forbids automating a user account and unsolicited messages. This app only posts to your own server through a webhook.')}
          </li>
          <li>
            <b className="text-bone">{tr('No fake growth.')}</b> {tr('No bought members, no engagement swaps, no invite-spam in other servers.')}
          </li>
          <li>
            <b className="text-bone">{tr('Read each server\'s rules before you share a link.')}</b> {tr('Promote only where it is allowed.')}
          </li>
          <li>
            <b className="text-bone">{tr('Keep the webhook secret.')}</b> {tr('Anyone who has the URL can post as it. If it leaks, delete it in Discord and make a new one.')}
          </li>
        </ul>
      </Panel>
    </div>
  );
}

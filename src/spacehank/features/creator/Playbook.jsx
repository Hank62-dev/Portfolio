import { useRef } from 'react';
import { ArrowRight, Compass, Download, Map as MapIcon, ShieldAlert, Store, Upload, Database } from 'lucide-react';
import { Button, pushToast } from '../../../shared/ui';
import { useSyncStatus } from '../../core/sync/useSync';
import { buildBackup, parseBackup } from './backup';
import { content, creatorSettings, deals, income, setSetting } from './store';
import { Label, Panel } from './ui';
import { tr } from '../../core/i18n/lang';

const download = () => {
  const text = buildBackup({ content: content.store.get().items, income: income.store.get().items, deals: deals.store.get().items, settings: creatorSettings.get() });
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `creator-lab-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const restore = async (file) => {
  const result = parseBackup(await file.text());
  if (result.error) {
    pushToast(result.error, { tone: 'error' });
    return;
  }
  await Promise.all([content.putMany(result.content), income.putMany(result.income), deals.putMany(result.deals)]);
  setSetting(result.settings);
  pushToast(tr('Restored {0} pieces, {1} income entries and {2} deals', result.content.length, result.income.length, result.deals.length), { tone: 'success' });
};

const WEEKS = [
  { week: 'Week 1', title: 'Foundation', go: 'ideas', goLabel: tr('Open Ideas'), items: [tr('Pick ONE niche you can talk about for 50 videos (for you: building with AI, Discord bots, apps for students or sellers).'), tr('Write 10 ideas in Ideas. Keep the 3 with the strongest hooks.'), tr('Film 3 short videos with the teleprompter. Do not wait for perfect.'), tr('Set a small income goal for the month in Money.')] },
  { week: 'Week 2', title: 'Ship', go: 'pipeline', goLabel: tr('Open Pipeline'), items: [tr('Post 5 videos. Same time of day. Move each card to Posted and write the views down.'), tr('Open a small Discord server from the plan. Invite people you know, then people who watch.'), tr('Post the announcement of each video in your server.')] },
  { week: 'Week 3', title: tr('Make an offer'), go: 'deals', goLabel: tr('Open Deals'), items: [tr('Write 3 packages you can deliver (for example: a Discord bot set up for a community; a landing page for a TikTok Shop seller; an order tracker).'), tr('Price them in Pricing & quotes. Quote the whole job.'), tr('Send 10 honest messages to communities and sellers you could really help. Log each in Deals with a follow-up date.')] },
  { week: 'Week 4', title: tr('Learn and double down'), go: 'money', goLabel: tr('Open Money'), items: [tr('Look at which videos got the most views and which messages got replies.'), tr('Read what Money says. Make more of what worked; drop what did not.'), tr('Plan the next month on the same loop.')] },
];

const SOURCES = [
  { name: tr('Client work (your skills)'), status: tr('Works anywhere'), note: tr('The fastest path for a developer: build for creators, sellers and communities. Content is how they find you.') },
  { name: tr('Sponsorships and affiliate'), status: tr('Needs an audience'), note: tr('Brands pay for views and trust. Use the rate tool, and ask what others in your niche charge.') },
  { name: tr('TikTok Creator Rewards'), status: tr('Check it in the app'), note: tr('Reported requirements: 10,000 followers, 100,000 views in 30 days, videos over 60 seconds. Sources disagree on whether Vietnam is covered: look under Creator tools in your TikTok app.') },
  { name: tr('TikTok Shop affiliate'), status: tr('Check Seller Center'), note: tr('Reported as open in Vietnam with commissions that vary by product. Confirm the current rules and rates in TikTok\'s own pages.') },
  { name: tr('Discord paid subscriptions'), status: tr('US only'), note: tr('Discord says server subscriptions are not available outside the US. A paid community here means an outside payment page and a role you give.') },
  { name: tr('Digital products and memberships'), status: tr('Check payouts'), note: tr('Gumroad, Lemon Squeezy, PayPal, Payoneer: whether each pays out to a Vietnamese account changes, so check their pages before you build on one.') },
];

const GUARDRAILS = [
  tr('Never buy followers or fake engagement, never spam DMs, never run a self-bot. Accounts get banned and the audience is worth nothing.'),
  tr('TikTok only lets apps post publicly after an audit, so this app helps you write and prepare; you post from the TikTok app yourself.'),
  tr('Do not scrape platforms. Look at trends in the apps, like everyone else.'),
  tr('Never promise income or results in a video or a message. Say what you did, not what viewers will earn.'),
  tr('Label AI-made or AI-edited content where the platform asks for it.'),
  tr('Income in Vietnam may be taxable. Keep your log and ask an accountant when it grows.'),
];

/** The plan, in one page: where the money can come from (with what is and is not verified), a 30-day loop, and the lines not to cross. */
export default function Playbook({ onGo }) {
  const picker = useRef(null);
  const sync = useSyncStatus();
  return (
    <div className="flex flex-col gap-4" data-playbook>
      <Panel title={tr('The idea')} icon={Compass} hue={22}>
        <p className="text-fine leading-relaxed text-bone-dim">
          {tr('You are a developer with an AI workspace. Money comes from what you can')} <b className="text-bone">{tr('build for other people')}</b>{tr(', what an')} <b className="text-bone">{tr('audience')}</b> {tr('will pay for, and what you can')} <b className="text-bone">{tr('package')}</b> {tr('and sell more than once. At the start, content is not the product: it is how people find you. So the loop is:')} <b className="text-bone">{tr('make short videos in a niche → bring people to a small community → turn the people who need help into clients and sponsors → write down the numbers → repeat what worked.')}</b> {tr('Every part of this tab is one step of that loop.')}
        </p>
      </Panel>

      <Panel title={tr('30 days, one loop')} icon={MapIcon} hue={208}>
        <ol className="flex flex-col gap-3">
          {WEEKS.map((w) => (
            <li key={w.week} className="cl-card relative overflow-hidden rounded-2xl border border-line p-4">
              <span className="pointer-events-none absolute -top-3 right-3 font-display text-[5rem] leading-none text-wash/[0.05] select-none" aria-hidden="true">{w.week.replace('Week ', '')}</span>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-baseline gap-2">
                  <Label>{w.week}</Label>
                  <b className="font-display text-lead text-bone">{w.title}</b>
                </p>
                <Button variant="ghost" size="sm" onClick={() => onGo(w.go)}>
                  {w.goLabel} <ArrowRight size={13} aria-hidden="true" />
                </Button>
              </div>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-fine leading-snug text-bone-dim">
                {w.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title={tr('Where the money can come from')} icon={Store} hue={150}>
        <ul className="flex flex-col gap-2.5" data-sources-table>
          {SOURCES.map((s) => (
            <li key={s.name} className="cl-card rounded-2xl border border-line p-3.5">
              <p className="flex flex-wrap items-center justify-between gap-2">
                <b className="text-fine text-bone">{s.name}</b>
                <span className="rounded-full bg-wash/[0.07] px-2.5 py-0.5 font-mono text-[0.68rem] text-bone-dim">{s.status}</span>
              </p>
              <p className="mt-1.5 text-[0.84rem] leading-snug text-bone-dim">{s.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[0.76rem] leading-relaxed text-bone-faint">{tr('These notes come from searches of platform pages and third-party guides; several sources disagree. Treat them as a reason to check, not as the rules.')}</p>
      </Panel>

      <Panel title={tr('Your data')} icon={Database} hue={270}>
        <p className="text-fine leading-relaxed text-bone-dim">
          {sync.enabled ? tr('Your Creator Lab data is kept in your database and follows you to every device you sign in on. ') : tr('Sync is off, so your Creator Lab data lives in this browser only. ')}
          {tr('Your income log is worth a copy of its own: download one now and then, and restore it if you ever need to start over.')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={download} data-export>
            <Download size={14} aria-hidden="true" /> {tr('Download a copy')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => picker.current?.click()}>
            <Upload size={14} aria-hidden="true" /> {tr('Restore from a copy')}
          </Button>
          <input
            ref={picker}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label={tr('Backup file')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void restore(file);
            }}
          />
        </div>
      </Panel>

      <Panel title={tr('Lines not to cross')} icon={ShieldAlert} hue={4}>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-fine leading-snug text-bone-dim">
          {GUARDRAILS.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

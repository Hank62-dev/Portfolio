import { tr } from '../lang';
import { Lock } from 'lucide-react';
import { Button } from '../../../design-system';
import { NAVIGATION } from '../navigation';

// One line on what is behind each private tab: enough to know it exists, not enough to see how it looks.
const BLURB = {
  hank: tr('Your daily briefing, your agents and your pet.'),
  space: tr('A 3D floor where the AI agents work.'),
  rag: tr('Ask Hank anything, with answers drawn from your own documents.'),
  pulse: tr('Projects, commits and uptime at a glance.'),
  shell: tr('A terminal for quick commands.'),
  docs: tr('Your documents, kept so Hank can read them.'),
  notes: tr('Notes that link to each other.'),
  constellation: tr('Your notes drawn as a map of stars.'),
  memos: tr('Voice memos with their transcripts.'),
  memory: tr('A timeline of what happened.'),
  studio: tr('Make pictures and keep them.'),
  music: tr('A music library and player.'),
  podcast: tr('Podcasts you follow, played from where you stopped.'),
  missions: tr('A board for plans and tasks.'),
  wallet: tr('Spending and budgets.'),
  diary: tr('A private diary.'),
  creator: tr('A cockpit for content, deals and income.'),
};

/** What a guest sees on a tab that belongs to the owner. */
export default function PrivateTab({ tab, onHome, onSignIn }) {
  const item = NAVIGATION.find((entry) => entry.id === tab);
  const Icon = item?.icon ?? Lock;
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-12 text-center" data-private-tab={tab}>
      <span className="relative grid size-16 place-items-center rounded-3xl border border-line bg-ink-1 text-bone-dim">
        <Icon size={26} aria-hidden="true" />
        <span className="absolute -right-1.5 -bottom-1.5 grid size-7 place-items-center rounded-full border border-line-strong bg-ink-2 text-signal">
          <Lock size={13} aria-hidden="true" />
        </span>
      </span>
      <div>
        <h2 className="font-display text-h3 text-bone">{item?.label ?? tr('Private')}</h2>
        <p className="mt-1.5 text-fine text-bone-dim">{BLURB[tab] ?? tr('This part of the workspace is private.')}</p>
        <p className="mt-3 font-mono text-[0.72rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Private · owner only')}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="ghost" size="sm" onClick={onHome}>
          {tr('Try Ra chơi')}
        </Button>
        <Button size="sm" onClick={onSignIn}>
          {tr('Sign in')}
        </Button>
      </div>
    </div>
  );
}

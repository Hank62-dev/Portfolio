import { Lock } from 'lucide-react';
import { Button } from '../../../design-system';
import { NAVIGATION } from '../navigation';

// One line on what is behind each private tab: enough to know it exists, not enough to see how it looks.
const BLURB = {
  space: 'A 3D floor where the AI agents work.',
  rag: 'Ask Hank anything, with answers drawn from your own documents.',
  pulse: 'Projects, commits and uptime at a glance.',
  shell: 'A terminal for quick commands.',
  docs: 'Your documents, kept so Hank can read them.',
  notes: 'Notes that link to each other.',
  constellation: 'Your notes drawn as a map of stars.',
  memos: 'Voice memos with their transcripts.',
  memory: 'A timeline of what happened.',
  studio: 'Make pictures and keep them.',
  music: 'A music library and player.',
  missions: 'A board for plans and tasks.',
  wallet: 'Spending and budgets.',
  diary: 'A private diary.',
  creator: 'A cockpit for content, deals and income.',
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
        <h2 className="font-display text-h3 text-bone">{item?.label ?? 'Private'}</h2>
        <p className="mt-1.5 text-fine text-bone-dim">{BLURB[tab] ?? 'This part of the workspace is private.'}</p>
        <p className="mt-3 font-mono text-[0.72rem] tracking-[0.12em] text-bone-faint uppercase">Private · owner only</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="ghost" size="sm" onClick={onHome}>
          Back to Home
        </Button>
        <Button size="sm" onClick={onSignIn}>
          Sign in
        </Button>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, CircleDollarSign, Handshake, KanbanSquare, Lightbulb, MessageCircle } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { PageHead, Segmented } from '../components/Page';
import { useStore } from '../store';
import DealsPanel from './DealsPanel';
import DiscordPanel from './DiscordPanel';
import IdeasPanel from './IdeasPanel';
import { dueFollowUps, dueToPost, goalProgress, monthKeyOf, monthTotal, vndShort } from './model';
import MoneyPanel from './MoneyPanel';
import PipelinePanel from './PipelinePanel';
import Playbook from './Playbook';
import { content, creatorSettings, deals, income, loadSettings } from './store';

const SECTIONS = [
  { id: 'ideas', label: 'Ideas', icon: Lightbulb },
  { id: 'pipeline', label: 'Pipeline', icon: KanbanSquare },
  { id: 'money', label: 'Money', icon: CircleDollarSign },
  { id: 'deals', label: 'Deals', icon: Handshake },
  { id: 'discord', label: 'Discord', icon: MessageCircle },
  { id: 'playbook', label: 'Playbook', icon: BookOpenText },
];

/** One number at the top of the Creator Lab that takes you where it points. */
function Today({ value, label, tone, onClick }) {
  return (
    <button type="button" onClick={onClick} className="min-w-0 rounded-2xl border border-line bg-ink-1 px-3 py-3 text-left transition-colors hover:border-line-strong active:bg-ink-2">
      <b className={clsx('block truncate font-display text-[1.45rem] leading-none tabular-nums', tone ?? 'text-bone')}>{value}</b>
      <small className="mt-1.5 block truncate text-[0.74rem] text-bone-faint">{label}</small>
    </button>
  );
}

/**
 * Creator Lab: the owner's cockpit for earning from content and skills on other platforms. Ideas (an AI content engine with a
 * hook score and a teleprompter), the content pipeline, income and goals, deals with sponsors and clients, a Discord plan, and
 * the playbook. Everything is kept on this device; only the AI and Discord posting go through the server.
 */
export default function CreatorView() {
  const [section, setSection] = useState('ideas');
  const { items: pieces } = useStore(content.store);
  const { items: entries } = useStore(income.store);
  const { items: dealList } = useStore(deals.store);
  const settings = useStore(creatorSettings);

  useEffect(() => {
    void content.load();
    void income.load();
    void deals.load();
    void loadSettings();
  }, []);

  const now = Date.now();
  const post = useMemo(() => dueToPost(pieces, now).length, [pieces, now]);  
  const follow = useMemo(() => dueFollowUps(dealList, now).length, [dealList, now]);  
  const total = monthTotal(entries, monthKeyOf(now));
  const g = goalProgress({ total, goal: settings.goal, now });

  return (
    <div className="flex flex-col gap-5">
      <PageHead eyebrow="Create" title="Creator" accent="Lab." description="Turn what you know into content, deals and income on the platforms where people already are. Everything here stays on your device." />

      <div className="grid grid-cols-3 gap-2" data-today-strip>
        <Today value={post} label="To post today" tone={post ? 'text-warn' : 'text-bone'} onClick={() => setSection('pipeline')} />
        <Today value={follow} label="To follow up" tone={follow ? 'text-warn' : 'text-bone'} onClick={() => setSection('deals')} />
        <Today value={settings.goal > 0 ? `${g.pct}%` : vndShort(total)} label={settings.goal > 0 ? 'Of the goal' : 'This month'} tone={g.reached ? 'text-ok' : 'text-bone'} onClick={() => setSection('money')} />
      </div>

      <Segmented value={section} onChange={setSection} options={SECTIONS} label="Creator Lab" />

      {section === 'ideas' && <IdeasPanel onSaved={() => setSection('pipeline')} />}
      {section === 'pipeline' && <PipelinePanel />}
      {section === 'money' && <MoneyPanel />}
      {section === 'deals' && <DealsPanel />}
      {section === 'discord' && <DiscordPanel />}
      {section === 'playbook' && <Playbook onGo={setSection} />}
    </div>
  );
}

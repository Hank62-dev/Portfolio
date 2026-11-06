import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BookOpenText, CircleDollarSign, Clapperboard, Coins, Handshake, KanbanSquare, Lightbulb, MessageCircle, Target } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { PageHead, Segmented } from '../components/Page';
import { useStore } from '../store';
import DealsPanel from './DealsPanel';
import DiscordPanel from './DiscordPanel';
import IdeasPanel from './IdeasPanel';
import { dueFollowUps, dueToPost, goalProgress, monthKeyOf, monthTotal, pipelineValue, trend, vnd, vndShort } from './model';
import MoneyPanel from './MoneyPanel';
import PipelinePanel from './PipelinePanel';
import Playbook from './Playbook';
import { content, creatorSettings, deals, income, loadSettings } from './store';
import { IconBubble, Label, Ring, Spark } from './ui';
import { locale, tr } from '../lang';

const SECTIONS = [
  { id: 'ideas', label: tr('Ideas'), icon: Lightbulb },
  { id: 'pipeline', label: tr('Pipeline'), icon: KanbanSquare },
  { id: 'money', label: tr('Money'), icon: CircleDollarSign },
  { id: 'deals', label: tr('Deals'), icon: Handshake },
  { id: 'discord', label: tr('Discord'), icon: MessageCircle },
  { id: 'playbook', label: tr('Playbook'), icon: BookOpenText },
];

const monthName = (key) => new Date(`${key}-01T00:00:00`).toLocaleDateString(locale(), { month: 'short' });

/** One thing waiting for you at the top of the Creator Lab, that takes you where it points. */
function Today({ icon, hue, value, label, hint, urgent, onClick, delay = 0 }) {
  return (
    <button type="button" onClick={onClick} style={{ animationDelay: `${delay}ms` }} className="cl-card cl-rise group relative flex min-w-0 flex-col gap-3 rounded-[1.4rem] border border-line p-3.5 text-left md:p-4">
      <span className="flex items-center justify-between">
        <IconBubble icon={icon} hue={hue} />
        {urgent && <i className="size-2 animate-pulse rounded-full bg-warn shadow-[0_0_0_4px_rgb(240_180_90/0.18)]" aria-label={tr('Needs you today')} />}
      </span>
      <span className="min-w-0 leading-tight">
        <b className={clsx('block truncate font-display text-[1.9rem] leading-none tabular-nums', urgent ? 'text-warn' : 'text-bone')}>{value}</b>
        <small className="mt-1.5 block truncate text-[0.78rem] text-bone-dim">{label}</small>
        <small className="mt-0.5 block truncate font-mono text-[0.64rem] text-bone-faint transition-colors group-hover:text-bone-dim max-sm:hidden">{hint} →</small>
      </span>
    </button>
  );
}

/** The month at a glance: what has come in, how near the goal is, and the last six months drawn as a line. */
function Hero({ total, previous, goal, g, months, weighted, onGoal }) {
  const change = previous ? Math.round(((total - previous) / previous) * 100) : null;
  const Arrow = change !== null && change < 0 ? ArrowDownRight : ArrowUpRight;
  return (
    <section className="cl-hero cl-rise rounded-[2rem] border border-line p-5 md:p-8" aria-label={tr('This month')}>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-10">
        <div className="min-w-0">
          <Label className="flex items-center gap-2">
            <span className="inline-block h-px w-6 bg-signal" aria-hidden="true" />
            {new Date().toLocaleDateString(locale(), { month: 'long', year: 'numeric' })} {tr('· earned')}
          </Label>
          <p className="cl-gleam mt-3 font-display text-[clamp(2.7rem,9vw,4.8rem)] leading-[0.95] tracking-tight tabular-nums" data-month-total>
            {vnd(total)}
          </p>
          <p className="mt-3 max-w-[46ch] text-fine leading-snug text-bone-dim">
            {goal > 0
              ? g.reached
                ? tr('Goal of {0} reached. Everything from here is a bonus.', vnd(goal))
                : tr('{0}% of your {1} goal. {2} to go with {3} {4} left.', g.pct, vnd(goal), vnd(g.remaining), g.daysLeft, g.daysLeft === 1 ? tr('day') : tr('days'))
              : tr('Set a goal for the month and watch the ring fill.')}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {change !== null && (
              <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[0.72rem] tabular-nums', change >= 0 ? 'border-ok/35 bg-ok/10 text-ok' : 'border-danger/35 bg-danger/10 text-danger')}>
                <Arrow size={12} aria-hidden="true" /> {Math.abs(change)}{tr('% vs last month')}
              </span>
            )}
            {total > 0 && <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-wash/[0.05] px-2.5 py-1 font-mono text-[0.72rem] text-bone-dim tabular-nums">{tr('At this pace')} {vndShort(g.projected)}</span>}
            {weighted > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-wash/[0.05] px-2.5 py-1 font-mono text-[0.72rem] text-bone-dim tabular-nums">
                <Coins size={12} aria-hidden="true" /> {vndShort(weighted)} {tr('likely from deals')}
              </span>
            )}
          </div>

          <div className="mt-6 max-w-lg">
            <Spark values={months.map((m) => m.total)} className="h-14 w-full" />
            <ol className="mt-1.5 flex justify-between font-mono text-[0.62rem] text-bone-faint" aria-label={tr('Last six months')}>
              {months.map((m, i) => (
                <li key={m.month} className={clsx(i === months.length - 1 && 'text-signal')}>
                  {monthName(m.month)}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex items-center gap-5 md:flex-col md:gap-3">
          <Ring pct={g.pct} size={150} stroke={10} done={g.reached}>
            {goal > 0 ? (
              <span className="leading-none">
                <b className="block font-display text-[2.4rem] tabular-nums text-bone">{g.pct}%</b>
                <small className="mt-1 block font-mono text-[0.64rem] tracking-[0.14em] text-bone-faint uppercase">{g.reached ? tr('reached') : tr('of goal')}</small>
              </span>
            ) : (
              <Target size={30} strokeWidth={1.4} className="text-bone-faint" aria-hidden="true" />
            )}
          </Ring>
          <button type="button" onClick={onGoal} className="rounded-full border border-line-strong px-3.5 py-1.5 font-mono text-[0.72rem] text-bone-dim transition-colors hover:border-bone hover:text-bone">
            {goal > 0 ? tr('Adjust the goal') : tr('Set a goal')}
          </button>
        </div>
      </div>
    </section>
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
  const key = monthKeyOf(now);
  const post = useMemo(() => dueToPost(pieces, now).length, [pieces, now]);
  const follow = useMemo(() => dueFollowUps(dealList, now).length, [dealList, now]);
  const total = monthTotal(entries, key);
  const months = useMemo(() => trend(entries, key, 6), [entries, key]);
  const g = goalProgress({ total, goal: settings.goal, now });
  const weighted = useMemo(() => pipelineValue(dealList).weighted, [dealList]);

  return (
    <div className="flex flex-col gap-5">
      <PageHead eyebrow={tr('Create')} title={tr('Creator')} accent="Lab." description={tr('Turn what you know into content, deals and income on the platforms where people already are. Everything here stays on your device.')} />

      <Hero total={total} previous={months.at(-2)?.total ?? 0} goal={settings.goal} g={g} months={months} weighted={weighted} onGoal={() => setSection('money')} />

      <div className="grid grid-cols-3 gap-2.5 md:gap-3.5" data-today-strip>
        <Today icon={Clapperboard} hue={22} value={post} label={tr('To post today')} hint={tr('Open the pipeline')} urgent={post > 0} onClick={() => setSection('pipeline')} delay={80} />
        <Today icon={Handshake} hue={208} value={follow} label={tr('To follow up')} hint={tr('Open your deals')} urgent={follow > 0} onClick={() => setSection('deals')} delay={140} />
        <Today icon={Coins} hue={150} value={vndShort(weighted)} label={tr('Likely from deals')} hint={tr('See the pipeline value')} onClick={() => setSection('deals')} delay={200} />
      </div>

      <Segmented scroll large round value={section} onChange={setSection} options={SECTIONS} label={tr('Creator Lab')} />

      <div key={section} className="cl-rise">
        {section === 'ideas' && <IdeasPanel onSaved={() => setSection('pipeline')} />}
        {section === 'pipeline' && <PipelinePanel />}
        {section === 'money' && <MoneyPanel />}
        {section === 'deals' && <DealsPanel />}
        {section === 'discord' && <DiscordPanel />}
        {section === 'playbook' && <Playbook onGo={setSection} />}
      </div>
    </div>
  );
}

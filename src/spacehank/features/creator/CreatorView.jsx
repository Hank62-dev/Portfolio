import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, CalendarDays, CircleDollarSign, Handshake, KanbanSquare, Lightbulb, Link2, Megaphone, MessageCircle, ShoppingBag } from 'lucide-react';
import { PageHead, Segmented } from '../../ui/Page';
import { useStore } from '../../core/store';
import CalendarPanel from './CalendarPanel';
import DealsPanel from './DealsPanel';
import DiscordPanel from './DiscordPanel';
import IdeasPanel from './IdeasPanel';
import KitPanel from './KitPanel';
import LinksPanel from './LinksPanel';
import { dueFollowUps, dueToPost, goalProgress, monthKeyOf, monthTotal, trend } from './model';
import MoneyPanel from './MoneyPanel';
import PipelinePanel from './PipelinePanel';
import Playbook from './Playbook';
import { loadShop, shop } from './shopStore';
import StorePanel from './StorePanel';
import { content, creatorSettings, deals, income, loadSettings } from './store';
import StudioDesk from './StudioDesk';
import { isReportTime, moneyMove, salesSummary, weekKey } from './studio';
import WeekReport from './WeekReport';
import { tr } from '../../core/i18n/lang';

const SECTIONS = [
  { id: 'ideas', label: tr('Ideas'), icon: Lightbulb },
  { id: 'pipeline', label: tr('Pipeline'), icon: KanbanSquare },
  { id: 'calendar', label: tr('Calendar'), icon: CalendarDays },
  { id: 'store', label: tr('Shop'), icon: ShoppingBag },
  { id: 'links', label: tr('Links'), icon: Link2 },
  { id: 'kit', label: tr('Media kit'), icon: Megaphone },
  { id: 'money', label: tr('Money'), icon: CircleDollarSign },
  { id: 'deals', label: tr('Deals'), icon: Handshake },
  { id: 'discord', label: tr('Discord'), icon: MessageCircle },
  { id: 'playbook', label: tr('Playbook'), icon: BookOpenText },
];

const REPORT_KEY = 'hank62.creator.report';
const reportSeen = () => {
  try {
    return localStorage.getItem(REPORT_KEY);
  } catch {
    return null;
  }
};

/**
 * Creator Lab: the owner's studio for earning from content and skills. On top, the month as a till roll and the one move most
 * likely to bring money in today. Below: ideas (hooks dealt as cards), the pipeline as a film strip, the content calendar with
 * the posting streak, the shop on the portfolio (products, paid calls, membership, tips, invoices, paid by VietQR), the
 * link-in-bio page with its counted short links, the media kit for brands, money, deals as a funnel, Discord and the playbook.
 * On Sunday evening the week is looked back on.
 */
export default function CreatorView() {
  const [section, setSection] = useState('ideas');
  const [openPiece, setOpenPiece] = useState(null);
  const [report, setReport] = useState(false);
  const { items: pieces } = useStore(content.store);
  const { items: entries } = useStore(income.store);
  const { items: dealList } = useStore(deals.store);
  const { orders, config } = useStore(shop);
  const settings = useStore(creatorSettings);

  useEffect(() => {
    void content.load();
    void income.load();
    void deals.load();
    void loadSettings();
    void loadShop();
  }, []);

  // the week in review offers itself once, on Sunday evening
  useEffect(() => {
    if (isReportTime() && reportSeen() !== weekKey()) {
      setReport(true);
      try {
        localStorage.setItem(REPORT_KEY, weekKey());
      } catch {
        /* it may offer itself again, which is fine */
      }
    }
  }, []);

  const now = Date.now();
  const key = monthKeyOf(now);
  const post = useMemo(() => dueToPost(pieces, now).length, [pieces, now]);
  const follow = useMemo(() => dueFollowUps(dealList, now).length, [dealList, now]);
  const total = monthTotal(entries, key);
  const months = useMemo(() => trend(entries, key, 6), [entries, key]);
  const g = goalProgress({ total, goal: settings.goal, now });
  const sales = useMemo(() => salesSummary(orders, now), [orders, now]);
  const hasShop = Boolean(config && (config.products.length || config.booking.active || config.tiers.length));
  const move = useMemo(() => moneyMove({ orders, deals: dealList, pieces, hasShop, now }), [orders, dealList, pieces, hasShop, now]);
  const tape = useMemo(() => entries.filter((e) => monthKeyOf(e.at) === key).slice(0, 6), [entries, key]);

  const go = (to, id) => {
    if (to === 'pipeline' && id) setOpenPiece(id);
    setSection(to);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHead eyebrow={tr('Create')} title={tr('Creator')} accent="Lab." description={tr('Turn what you know into content, sales and deals: a shop on your portfolio that takes payments by QR, a link-in-bio page, a media kit for brands, and everything around the videos.')} />

      <StudioDesk entries={tape} total={total} previous={months.at(-2)?.total ?? 0} goal={settings.goal} g={g} move={move} counts={{ post, follow, soldToday: sales.today }} onGo={go} onGoal={() => setSection('money')} onReport={() => setReport(true)} />

      <Segmented scroll large round value={section}
        onChange={(next) => {
          setOpenPiece(null);
          setSection(next);
        }}
        options={SECTIONS} label={tr('Creator Lab')} />

      <div key={section} className="cl-rise">
        {section === 'ideas' && <IdeasPanel onSaved={() => setSection('pipeline')} />}
        {section === 'pipeline' && <PipelinePanel key={openPiece ?? 'board'} openId={openPiece} />}
        {section === 'calendar' && <CalendarPanel onOpen={(id) => go('pipeline', id)} />}
        {section === 'store' && <StorePanel />}
        {section === 'links' && <LinksPanel />}
        {section === 'kit' && <KitPanel />}
        {section === 'money' && <MoneyPanel />}
        {section === 'deals' && <DealsPanel />}
        {section === 'discord' && <DiscordPanel />}
        {section === 'playbook' && <Playbook onGo={setSection} />}
      </div>

      {report && <WeekReport entries={entries} pieces={pieces} deals={dealList} orders={orders} onClose={() => setReport(false)} />}
    </div>
  );
}

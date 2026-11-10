import { useState } from 'react';
import { tr } from '../lang';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import BriefingCard from '../components/BriefingCard';
import CommandCard from '../components/CommandCard';
import AppIcon from '../components/AppIcon';
import PetCard from '../components/PetCard';
import { isWorking } from '../model/agents';
import { bySection, openModules, useNav } from '../modules';
import SkyHero from '../today/SkyHero';
import TodayPanel from '../today/TodayPanel';

/**
 * A phone's menu of every place that is switched on, as app icons grouped like the menu. It is folded away on the home screen
 * (the bar below and its "More" sheet already reach every place), and opens with one tap.
 */
function Launcher({ onTab }) {
  const [open, setOpen] = useState(false);
  const groups = bySection(useNav().filter((item) => item.id !== 'hank'));
  return (
    <nav aria-label={tr('All apps')} className="flex flex-col items-center gap-5 md:hidden" data-launcher>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 font-mono text-fine text-bone-dim active:scale-95"
        data-launcher-toggle
      >
        {open ? tr('Show fewer apps') : tr('Show all apps')}
        <ChevronDown size={15} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} aria-hidden="true" />
      </button>
      {open && (
        <div className="flex w-full animate-fade-in flex-col gap-5">
          {groups.map(({ section, items }) => (
            <div key={section}>
              <p className="mb-3 font-mono text-[0.62rem] tracking-[0.18em] text-bone-faint uppercase">{tr(section)}</p>
              <ul className="grid grid-cols-4 gap-x-2 gap-y-4">
                {items.map((item) => (
                  <AppIcon key={item.id} item={item} onPick={onTab} />
                ))}
              </ul>
            </div>
          ))}
          <button type="button" onClick={openModules} className="inline-flex items-center gap-2 self-center rounded-full border border-line px-4 py-2 font-mono text-fine text-bone-dim active:scale-95" data-customise>
            <SlidersHorizontal size={14} aria-hidden="true" /> {tr('Choose which places to show')}
          </button>
        </div>
      )}
    </nav>
  );
}

export default function DashboardView({ agents, events, connected, onTab, onNotify, owner: isOwner = true }) {
  const active = connected ? agents.filter(isWorking).length : 0;
  return (
    <div className="relative isolate flex flex-col gap-6">
      <SkyHero owner={isOwner} onNotify={onNotify} />
      <TodayPanel onTab={onTab} onNotify={onNotify} />
      <Launcher onTab={onTab} />
      <PetCard onTab={onTab} />
      <BriefingCard owner={isOwner} agents={agents} connected={connected} />
      <CommandCard agents={agents} events={events} active={active} connected={connected} onTab={onTab} />
    </div>
  );
}

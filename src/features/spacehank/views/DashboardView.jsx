import { useState } from 'react';
import { tr } from '../lang';
import { Activity, BrainCircuit, Boxes, ChevronDown, Database, Gauge, MessageCircle, Network, SlidersHorizontal, Users, Wifi } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Eyebrow, Stat } from '../../../design-system';
import BriefingCard from '../components/BriefingCard';
import AppIcon from '../components/AppIcon';
import PetCard from '../components/PetCard';
import { isWorking } from '../model/agents';
import { bySection, openModules, useNav } from '../modules';
import SkyHero from '../today/SkyHero';
import TodayPanel from '../today/TodayPanel';

function LayerRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
      <Icon size={16} className="text-bone-faint" aria-hidden="true" />
      <span className="flex-1 text-bone-dim">{label}</span>
      <b className="font-mono text-fine font-medium">{value}</b>
    </div>
  );
}

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
    <div className="flex flex-col gap-6">
      <SkyHero owner={isOwner} onTab={onTab} onCustomise={openModules} onNotify={onNotify} />
      <TodayPanel onTab={onTab} onNotify={onNotify} />
      <Launcher onTab={onTab} />
      <PetCard onTab={onTab} />
      <BriefingCard owner={isOwner} agents={agents} connected={connected} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Users} label={tr('AI WORKFORCE')} value={active} note="agents active" />
        <Stat icon={Activity} label={tr('LIVE EVENTS')} value={events.length} note="server events" />
        <Stat icon={Gauge} label={tr('WORKSPACE LOAD')} value="-" note="telemetry unavailable" />
        <Stat icon={Wifi} label={tr('SYSTEM LINK')} value={connected ? 'LIVE' : 'OFFLINE'} note="realtime channel" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Eyebrow>{tr('TODAY\'S COMMAND')}</Eyebrow>
            <Badge tone={connected ? 'ok' : 'danger'} dot>
              {connected ? tr('OPERATIONAL') : tr('OFFLINE')}
            </Badge>
          </div>
          <h2 className="font-display text-h3 leading-tight [&_em]:serif-accent">
            {tr('Everything important,')} <em>{tr('within reach.')}</em>
          </h2>
          <p className="text-bone-dim">{tr('Hank62 coordinates your AI company. Open the floor or ask Hank RAG for context.')}</p>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onTab('space')}>
              <Boxes size={15} aria-hidden="true" /> {tr('Launch floor')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onTab('rag')}>
              <MessageCircle size={15} aria-hidden="true" /> {tr('Ask Hank RAG')}
            </Button>
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow={tr('COMPANY PULSE')} title={tr('Live activity')} aside={<Activity size={17} aria-hidden="true" />} />
          {events.length ? (
            <ul className="flex flex-col gap-3">
              {events.slice(0, 4).map((event, index) => (
                <li className="flex items-start gap-3" key={`${event.name}-${index}`}>
                  <Avatar size={28} color={event.color}>
                    {event.name.slice(0, 1)}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <b className="text-fine font-medium">{event.name}</b>{' '}
                    <small className="font-mono text-[0.72rem] text-bone-faint">{event.action}</small>
                    <p className="truncate text-fine text-bone-dim">{event.text}</p>
                  </div>
                  <time className="font-mono text-[0.72rem] text-bone-faint">{event.time}</time>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Activity} title={tr('No realtime events yet')} description={tr('Events appear here as agents start and finish work.')} />
          )}
        </Card>
        <Card>
          <CardHeader eyebrow={tr('SYSTEM MAP')} title={tr('Connected layers')} aside={<Network size={17} aria-hidden="true" />} />
          <LayerRow icon={Database} label={tr('Realtime workers')} value={`${connected ? agents.length : 0}/${agents.length}`} />
          <LayerRow icon={BrainCircuit} label={tr('Hank RAG API')} value="EXTERNAL" />
          <LayerRow icon={Wifi} label={tr('Workspace sync')} value={connected ? 'LIVE' : 'OFFLINE'} />
        </Card>
      </div>
    </div>
  );
}

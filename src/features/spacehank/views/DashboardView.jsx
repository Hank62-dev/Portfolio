import { useState } from 'react';
import { Activity, ArrowUpRight, BrainCircuit, Boxes, ChevronDown, Database, Gauge, MessageCircle, Network, Users, Wifi } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Eyebrow, PageHeader, Stat } from '../../../design-system';
import BriefingCard from '../components/BriefingCard';
import PetCard from '../components/PetCard';
import { greetingFor, owner } from '../config';
import { isWorking } from '../model/agents';
import { NAVIGATION, tabHue } from '../navigation';

function LayerRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-3 first:border-t-0 first:pt-0">
      <Icon size={16} className="text-bone-faint" aria-hidden="true" />
      <span className="flex-1 text-bone-dim">{label}</span>
      <b className="font-mono text-fine font-medium">{value}</b>
    </div>
  );
}

/** A phone's home screen: every part of the workspace as an app icon, like a launcher. Two rows show; the rest open on request. */
const FIRST_ROWS = 8;

function AppIcon({ item, onTab }) {
  const { id, label, icon: Icon } = item;
  const hue = tabHue(id);
  return (
    <li>
      <button type="button" onClick={() => onTab(id)} className="group flex w-full flex-col items-center gap-1.5 active:scale-95">
        <span className="grid size-[3.6rem] place-items-center rounded-[1.25rem] shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] transition-transform" style={{ background: `linear-gradient(150deg, hsl(${hue} 70% 46% / 0.9), hsl(${(hue + 40) % 360} 65% 30% / 0.95))`, color: `hsl(${hue} 100% 92%)` }}>
          <Icon size={25} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <span className="line-clamp-2 w-full text-center font-mono text-[0.6rem] leading-tight tracking-tight [overflow-wrap:anywhere] text-bone-dim">{label}</span>
      </button>
    </li>
  );
}

function Launcher({ onTab }) {
  const [more, setMore] = useState(false);
  const items = NAVIGATION.filter((item) => item.id !== 'hank');
  return (
    <nav aria-label="All apps" className="md:hidden" data-launcher>
      <ul className="grid grid-cols-4 gap-x-2 gap-y-4">
        {items.slice(0, FIRST_ROWS).map((item) => (
          <AppIcon key={item.id} item={item} onTab={onTab} />
        ))}
      </ul>
      <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out-expo ${more ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`} aria-hidden={!more}>
        <ul className="grid min-h-0 grid-cols-4 gap-x-2 gap-y-4 overflow-hidden pt-4">
          {items.slice(FIRST_ROWS).map((item) => (
            <AppIcon key={item.id} item={item} onTab={onTab} />
          ))}
        </ul>
      </div>
      <button
        type="button"
        aria-expanded={more}
        aria-label={more ? 'Show fewer apps' : 'Show all apps'}
        onClick={() => setMore((open) => !open)}
        className="mx-auto mt-3 grid size-9 place-items-center rounded-full border border-line bg-ink-2/80 text-bone-dim shadow-[0_8px_18px_-8px_rgb(0_0_0/0.8)] backdrop-blur transition-colors active:scale-90"
      >
        <ChevronDown size={17} className={`transition-transform duration-500 ${more ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
    </nav>
  );
}

export default function DashboardView({ agents, events, connected, onTab, owner: isOwner = true }) {
  const active = connected ? agents.filter(isWorking).length : 0;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="PERSONAL COMMAND CENTER"
        title={
          <>
            {greetingFor(new Date().getHours())}, <em>{owner.name}.</em>
          </>
        }
        description="Coordinate AI, knowledge and work from one command center."
        actions={
          <Button variant="ghost" size="sm" onClick={() => onTab('space')}>
            <Boxes size={15} aria-hidden="true" /> Open company floor <ArrowUpRight size={14} aria-hidden="true" />
          </Button>
        }
      />
      <Launcher onTab={onTab} />
      <PetCard onTab={onTab} />
      <BriefingCard owner={isOwner} agents={agents} connected={connected} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Users} label="AI WORKFORCE" value={active} note="agents active" />
        <Stat icon={Activity} label="LIVE EVENTS" value={events.length} note="server events" />
        <Stat icon={Gauge} label="WORKSPACE LOAD" value="-" note="telemetry unavailable" />
        <Stat icon={Wifi} label="SYSTEM LINK" value={connected ? 'LIVE' : 'OFFLINE'} note="realtime channel" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Eyebrow>TODAY'S COMMAND</Eyebrow>
            <Badge tone={connected ? 'ok' : 'danger'} dot>
              {connected ? 'OPERATIONAL' : 'OFFLINE'}
            </Badge>
          </div>
          <h2 className="font-display text-h3 leading-tight [&_em]:serif-accent">
            Everything important, <em>within reach.</em>
          </h2>
          <p className="text-bone-dim">Hank62 coordinates your AI company. Open the floor or ask Hank RAG for context.</p>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onTab('space')}>
              <Boxes size={15} aria-hidden="true" /> Launch floor
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onTab('rag')}>
              <MessageCircle size={15} aria-hidden="true" /> Ask Hank RAG
            </Button>
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow="COMPANY PULSE" title="Live activity" aside={<Activity size={17} aria-hidden="true" />} />
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
            <EmptyState icon={Activity} title="No realtime events yet" description="Events appear here as agents start and finish work." />
          )}
        </Card>
        <Card>
          <CardHeader eyebrow="SYSTEM MAP" title="Connected layers" aside={<Network size={17} aria-hidden="true" />} />
          <LayerRow icon={Database} label="Realtime workers" value={`${connected ? agents.length : 0}/${agents.length}`} />
          <LayerRow icon={BrainCircuit} label="Hank RAG API" value="EXTERNAL" />
          <LayerRow icon={Wifi} label="Workspace sync" value={connected ? 'LIVE' : 'OFFLINE'} />
        </Card>
      </div>
    </div>
  );
}

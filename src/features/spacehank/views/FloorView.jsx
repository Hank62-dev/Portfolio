import { lazy, Suspense } from 'react';
import { BrainCircuit, MessageCircle, Network, Users } from 'lucide-react';
import { Badge, Button, Card, Eyebrow, Loading, PageHeader, Skeleton, Stat } from '../../../design-system';
import { isWorking } from '../model/agents';
import { ROOMS } from '../scene/layout';
import { tr } from '../lang';

// three.js, R3F and the office models only download when the floor is opened.
const World = lazy(() => import('../scene/World'));

export default function FloorView({ agents, events, selected, onSelect, paused, onTab }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={tr('SPATIAL OPERATIONS')}
        title={tr('The Agent Floor')}
        description={tr('A 3D company floor with live agent telemetry.')}
        actions={
          <>
            <Badge tone={paused ? 'warn' : 'ok'} dot>
              {paused ? tr('FLOOR PAUSED') : tr('LIVE TELEMETRY')}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => onTab('rag')}>
              <MessageCircle size={15} aria-hidden="true" /> {tr('Ask the company')}
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat icon={Users} label={tr('REGISTERED AGENTS')} value={agents.length} note="configured workforce" />
        <Stat icon={BrainCircuit} label={tr('WORKING NOW')} value={agents.filter(isWorking).length} note="from realtime state" />
        <Stat icon={Network} label={tr('DEPARTMENTS')} value={String(ROOMS.length).padStart(2, '0')} note="connected rooms" />
      </div>
      <Card as="section" className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <div>
            <Eyebrow>{tr('WEBGL COMPANY FLOOR')}</Eyebrow>
            <p className="font-mono text-fine text-bone-dim">{tr('Drag to orbit · scroll to zoom · click an employee')}</p>
          </div>
          <Badge>{tr('WebGL / telemetry')}</Badge>
        </div>
        <div className="dark-island relative h-[clamp(380px,62vh,640px)] bg-ink-0">
          <Suspense
            fallback={
              <Loading label={tr('Loading the 3D floor')} className="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-3 p-4">
                {Array.from({ length: 12 }, (_, i) => (
                  <Skeleton key={i} className="rounded-2xl opacity-60" />
                ))}
              </Loading>
            }
          >
            <World agents={agents} selected={selected} onSelect={onSelect} paused={paused} />
          </Suspense>
          <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-1 rounded-sm border border-line bg-ink-1/85 px-3 py-2 backdrop-blur">
            <span className="font-mono text-fine">{events.length ? tr('LIVE FEED') : tr('NO EVENTS')}</span>
            <small className="font-mono text-[0.72rem] text-bone-faint">
              {agents.length} {tr('agents -')} {ROOMS.length} {tr('departments -')} {events.length} {tr('events')}
            </small>
          </div>
        </div>
      </Card>
    </div>
  );
}

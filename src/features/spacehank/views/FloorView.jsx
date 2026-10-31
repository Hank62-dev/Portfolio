import { lazy, Suspense } from 'react';
import { BrainCircuit, MessageCircle, Network, Users } from 'lucide-react';
import { Badge, Button, Card, Eyebrow, PageHeader, Spinner, Stat } from '../../../design-system';
import { isWorking } from '../model/agents';
import { ROOMS } from '../scene/layout';

// three.js, R3F and the office models only download when the floor is opened.
const World = lazy(() => import('../scene/World'));

export default function FloorView({ agents, events, selected, onSelect, paused, onTab }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="SPATIAL OPERATIONS"
        title="The Agent Floor"
        description="A 3D company floor with live agent telemetry."
        actions={
          <>
            <Badge tone={paused ? 'warn' : 'ok'} dot>
              {paused ? 'FLOOR PAUSED' : 'LIVE TELEMETRY'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => onTab('rag')}>
              <MessageCircle size={15} aria-hidden="true" /> Ask the company
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Users} label="REGISTERED AGENTS" value={agents.length} note="configured workforce" />
        <Stat icon={BrainCircuit} label="WORKING NOW" value={agents.filter(isWorking).length} note="from realtime state" />
        <Stat icon={Network} label="DEPARTMENTS" value={String(ROOMS.length).padStart(2, '0')} note="connected rooms" />
      </div>
      <Card as="section" className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
          <div>
            <Eyebrow>WEBGL COMPANY FLOOR</Eyebrow>
            <p className="font-mono text-fine text-bone-dim">Drag to orbit · scroll to zoom · click an employee</p>
          </div>
          <Badge>WebGL / telemetry</Badge>
        </div>
        <div className="relative h-[clamp(380px,62vh,640px)] bg-ink-0">
          <Suspense
            fallback={
              <div className="absolute inset-0 grid place-items-center">
                <span className="flex items-center gap-3 font-mono text-fine text-bone-dim">
                  <Spinner label="Loading 3D floor" /> Loading 3D floor…
                </span>
              </div>
            }
          >
            <World agents={agents} selected={selected} onSelect={onSelect} paused={paused} />
          </Suspense>
          <div className="pointer-events-none absolute top-4 left-4 flex flex-col gap-1 rounded-sm border border-line bg-ink-1/85 px-3 py-2 backdrop-blur">
            <span className="font-mono text-fine">{events.length ? 'LIVE FEED' : 'NO EVENTS'}</span>
            <small className="font-mono text-[0.72rem] text-bone-faint">
              {agents.length} agents - {ROOMS.length} departments - {events.length} events
            </small>
          </div>
        </div>
      </Card>
    </div>
  );
}

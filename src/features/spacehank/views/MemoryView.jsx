import { BrainCircuit } from 'lucide-react';
import { Avatar, Badge, Card, CardHeader, EmptyState, Eyebrow, PageHeader } from '../../../design-system';
import { spacehankConfig } from '../config';

export default function MemoryView({ events }) {
  const coverage = Math.min(100, Math.round((events.length / spacehankConfig.maxEvents) * 100));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="LONG-TERM CONTEXT" title="Memory Stream" description="Timeline from the realtime server." />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader
            eyebrow="LIVE MEMORY"
            title="Recent signals"
            aside={
              <Badge tone={events.length ? 'ok' : 'warn'} dot>
                {events.length ? 'SYNCED' : 'WAITING'}
              </Badge>
            }
          />
          {events.length ? (
            <ol className="flex flex-col gap-4">
              {events.slice(0, 8).map((event, index) => (
                <li className="flex items-start gap-3" key={`${event.name}-${event.action}-${index}`}>
                  <Avatar size={28} color={event.color}>
                    {event.name.slice(0, 1)}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <b className="text-fine font-medium">{event.name}</b>{' '}
                    <small className="font-mono text-[0.72rem] text-bone-faint">{event.action}</small>
                    <p className="text-fine break-words text-bone-dim">{event.text}</p>
                  </div>
                  <time className="font-mono text-[0.72rem] text-bone-faint">{event.time}</time>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState icon={BrainCircuit} title="No realtime events yet" description="Signals from the agent floor appear here." />
          )}
        </Card>
        <Card className="flex flex-col gap-3">
          <BrainCircuit size={28} className="text-signal" aria-hidden="true" />
          <Eyebrow>MEMORY HEALTH</Eyebrow>
          <h3 className="font-display text-h3 leading-tight">Context is connected.</h3>
          <p className="text-bone-dim">Only verified events from Agent Floor are shown.</p>
          <div
            role="progressbar"
            aria-label="Server event coverage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={coverage}
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-3"
          >
            <div className="h-full bg-signal transition-[width] duration-500" style={{ width: `${coverage}%` }} />
          </div>
          <small className="font-mono text-fine text-bone-faint">{coverage}% server event coverage</small>
        </Card>
      </div>
    </div>
  );
}

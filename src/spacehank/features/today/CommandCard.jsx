import { Boxes, MessageCircle } from 'lucide-react';
import { Avatar, Badge, Button, Card, Eyebrow } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { tr } from '../../core/i18n/lang';

/** One figure of the strip: a big number over its label. */
function Figure({ label, children }) {
  return (
    <div className="min-w-0 flex-1 px-2.5 first:pl-0 last:pr-0 sm:px-4">
      <div className="font-display text-[clamp(1.7rem,4vw,2.6rem)] leading-none tabular-nums">{children}</div>
      <p className="mt-1.5 font-mono text-[0.58rem] leading-snug tracking-[0.1em] text-bone-faint uppercase sm:truncate sm:text-[0.62rem] sm:tracking-[0.14em]">{label}</p>
    </div>
  );
}

/** A heartbeat that runs across when the link is up, and lies flat when it is not. */
function Heartbeat({ live }) {
  const path = 'M0 34 H72 L82 34 L90 10 L101 54 L111 20 L119 34 H196 L205 34 L213 25 L221 41 L229 34 H300';
  return (
    <svg viewBox="0 0 300 60" preserveAspectRatio="none" className="h-12 w-full overflow-visible sm:h-14" aria-hidden="true">
      <path d={live ? path : 'M0 34 H300'} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-line-strong" vectorEffect="non-scaling-stroke" />
      {live && <path d={path} pathLength="1" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="ecg-pulse text-signal" stroke="currentColor" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

function Layer({ label, value, ok }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-0/40 py-1.5 pr-3 pl-2.5 text-fine">
      <i className={clsx('size-1.5 rounded-full', ok ? 'bg-ok' : 'bg-bone-faint')} />
      <span className="text-bone-dim">{label}</span>
      <b className="font-mono text-[0.68rem] font-medium text-bone">{value}</b>
    </li>
  );
}

/**
 * The studio in one card (it was seven: four counters and three cards, one of them with nothing to show): what to do next on
 * the left, and on the right whether the link and the agents are alive, with a heartbeat and the last things that happened.
 */
export default function CommandCard({ agents, events, active, connected, onTab }) {
  return (
    <Card className="tint-card relative overflow-hidden max-sm:p-4" style={{ '--card-hue': 262 }} data-command>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <Eyebrow>{tr("TODAY'S COMMAND")}</Eyebrow>
            <Badge tone={connected ? 'ok' : 'danger'} dot>
              {connected ? tr('OPERATIONAL') : tr('OFFLINE')}
            </Badge>
          </div>
          <h2 className="font-display text-h3 leading-tight [&_em]:serif-accent">
            {tr('Everything important,')} <em>{tr('within reach.')}</em>
          </h2>
          <p className="max-w-[44ch] text-bone-dim">{tr('Hank62 coordinates your AI company. Open the floor or ask Hank RAG for context.')}</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-1 max-sm:[&>button]:flex-1">
            <Button size="sm" onClick={() => onTab('space')}>
              <Boxes size={15} aria-hidden="true" /> {tr('Launch floor')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onTab('rag')}>
              <MessageCircle size={15} aria-hidden="true" /> {tr('Ask Hank RAG')}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-line bg-ink-0/35 p-3.5 sm:p-5">
          <div className="flex items-start divide-x divide-line">
            <Figure label={tr('AI WORKFORCE')}>{active}</Figure>
            <Figure label={tr('LIVE EVENTS')}>{events.length}</Figure>
            <Figure label={tr('SYSTEM LINK')}>
              <span className="inline-flex items-center gap-2 text-[0.8em]">
                <i className={clsx('size-2.5 rounded-full', connected ? 'animate-pulse bg-ok' : 'bg-danger')} />
                {connected ? 'LIVE' : 'OFF'}
              </span>
            </Figure>
          </div>

          <Heartbeat live={connected} />

          {events.length > 0 ? (
            <ul className="flex flex-col gap-2.5" aria-label={tr('Live activity')}>
              {events.slice(0, 3).map((event, index) => (
                <li className="flex items-center gap-3" key={`${event.name}-${index}`}>
                  <Avatar size={26} color={event.color}>
                    {event.name.slice(0, 1)}
                  </Avatar>
                  <p className="min-w-0 flex-1 truncate text-fine">
                    <b className="font-medium">{event.name}</b> <span className="text-bone-dim">{event.action}</span>
                  </p>
                  <time className="font-mono text-[0.7rem] text-bone-faint">{event.time}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-[0.7rem] text-bone-faint">{tr('No realtime events yet')}</p>
          )}

          <ul className="flex flex-wrap gap-2" aria-label={tr('Connected layers')}>
            <Layer label={tr('Realtime workers')} value={`${connected ? agents.length : 0}/${agents.length}`} ok={connected} />
            <Layer label={tr('Hank RAG API')} value="EXTERNAL" ok />
            <Layer label={tr('Workspace sync')} value={connected ? 'LIVE' : 'OFFLINE'} ok={connected} />
          </ul>
        </div>
      </div>
    </Card>
  );
}

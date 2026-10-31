import { Activity, ArrowUpRight, BrainCircuit, Boxes, Database, Gauge, MessageCircle, Network, Users, Wifi } from 'lucide-react';
import { greetingFor, owner } from '../config';
import { isWorking } from '../model/agents';
import { EmptyState, Metric, SectionIntro } from '../components/ui';

export default function DashboardView({ agents, events, connected, onTab }) {
  const active = connected ? agents.filter(isWorking).length : 0;
  return (
    <div className="modern-page">
      <SectionIntro
        eyebrow="PERSONAL COMMAND CENTER"
        title={
          <>
            {greetingFor(new Date().getHours())}, <em>{owner.name}.</em>
          </>
        }
        description="Coordinate AI, knowledge and work from one command center."
        action={
          <button className="soft-action" onClick={() => onTab('space')}>
            <Boxes size={16} /> Open company floor <ArrowUpRight size={14} />
          </button>
        }
      />
      <div className="metric-grid">
        <Metric icon={Users} label="AI WORKFORCE" value={active} change="agents active" />
        <Metric icon={Activity} label="LIVE EVENTS" value={events.length} change="server events" tone="violet" />
        <Metric icon={Gauge} label="WORKSPACE LOAD" value="-" change="telemetry unavailable" tone="amber" />
        <Metric icon={Wifi} label="SYSTEM LINK" value={connected ? 'LIVE' : 'OFFLINE'} change="realtime channel" tone="blue" />
      </div>
      <div className="dashboard-grid">
        <section className="surface-card command-card">
          <div className="card-topline">
            <span className="eyebrow">TODAY'S COMMAND</span>
            <span className="live-tag">
              <i /> {connected ? 'OPERATIONAL' : 'OFFLINE'}
            </span>
          </div>
          <h2>
            Everything important,
            <br />
            <em>within reach.</em>
          </h2>
          <p>Hank62 coordinates your AI company. Open the floor or ask Hank RAG for context.</p>
          <div className="command-actions">
            <button className="primary-action" onClick={() => onTab('space')}>
              <Boxes size={16} /> Launch floor
            </button>
            <button className="secondary-action" onClick={() => onTab('rag')}>
              <MessageCircle size={16} /> Ask Hank RAG
            </button>
          </div>
        </section>
        <section className="surface-card pulse-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">COMPANY PULSE</span>
              <h3>Live activity</h3>
            </div>
            <Activity size={17} />
          </div>
          {events.slice(0, 4).map((event, index) => (
            <div className="pulse-row" key={`${event.name}-${index}`}>
              <span className="pulse-avatar" style={{ '--agent-color': event.color }}>
                {event.name.slice(0, 1)}
              </span>
              <div>
                <b>{event.name}</b>
                <small>{event.action}</small>
                <p>{event.text}</p>
              </div>
              <time>{event.time}</time>
            </div>
          ))}
          {!events.length && (
            <EmptyState icon={Activity}>
              <p>No realtime events received.</p>
            </EmptyState>
          )}
        </section>
        <section className="surface-card stack-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">SYSTEM MAP</span>
              <h3>Connected layers</h3>
            </div>
            <Network size={18} />
          </div>
          <div className="layer-row">
            <Database size={16} />
            <span>Realtime workers</span>
            <b>
              {connected ? agents.length : 0}/{agents.length}
            </b>
          </div>
          <div className="layer-row">
            <BrainCircuit size={16} />
            <span>Hank RAG API</span>
            <b>EXTERNAL</b>
          </div>
          <div className="layer-row">
            <Wifi size={16} />
            <span>Workspace sync</span>
            <b>{connected ? 'LIVE' : 'OFFLINE'}</b>
          </div>
        </section>
      </div>
    </div>
  );
}

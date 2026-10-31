import { BrainCircuit, Search } from 'lucide-react';
import { spacehankConfig } from '../config';
import { EmptyState, SectionIntro } from '../components/ui';

export default function MemoryView({ events }) {
  const coverage = Math.min(100, Math.round((events.length / spacehankConfig.maxEvents) * 100));
  return (
    <div className="modern-page">
      <SectionIntro
        eyebrow="LONG-TERM CONTEXT"
        title="Memory Stream"
        description="Timeline from the realtime server."
        action={
          <button className="soft-action">
            <Search size={16} /> Search memory
          </button>
        }
      />
      <section className="memory-layout">
        <div className="surface-card memory-timeline">
          <div className="card-heading">
            <div>
              <span className="eyebrow">LIVE MEMORY</span>
              <h3>Recent signals</h3>
            </div>
            <span className="live-tag">
              <i /> {events.length ? 'SYNCED' : 'WAITING'}
            </span>
          </div>
          {events.slice(0, 8).map((event, index) => (
            <div className="memory-row" key={`${event.name}-${event.action}-${index}`}>
              <span className="memory-line">
                <i />
              </span>
              <time>{event.time}</time>
              <div>
                <b>
                  {event.name} <small>{event.action}</small>
                </b>
                <p>{event.text}</p>
              </div>
            </div>
          ))}
          {!events.length && (
            <EmptyState icon={BrainCircuit} size={25}>
              <p>No realtime events received.</p>
            </EmptyState>
          )}
        </div>
        <div className="surface-card memory-side">
          <div className="memory-visual">
            <div className="memory-ring ring-one" />
            <div className="memory-ring ring-two" />
            <BrainCircuit size={31} />
          </div>
          <span className="eyebrow">MEMORY HEALTH</span>
          <h3>Context is connected.</h3>
          <p>Only verified events from Agent Floor are shown.</p>
          <div className="memory-progress">
            <span style={{ width: `${coverage}%` }} />
            <b>{coverage}%</b>
          </div>
          <small>server event coverage</small>
        </div>
      </section>
    </div>
  );
}

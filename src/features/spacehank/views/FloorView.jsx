import { lazy, Suspense } from 'react';
import { BrainCircuit, CircleDot, MessageCircle, Network, Users } from 'lucide-react';
import { isWorking } from '../model/agents';
import { ROOMS } from '../scene/layout';
import { Metric, SectionIntro } from '../components/ui';

// three.js, R3F and the office models only download when the floor is opened.
const World = lazy(() => import('../scene/World'));

export default function FloorView({ agents, events, selected, onSelect, paused, onTab }) {
  return (
    <div className="modern-page floor-page">
      <SectionIntro
        eyebrow="SPATIAL OPERATIONS"
        title="The Agent Floor"
        description="A 3D company floor with live agent telemetry."
        action={
          <div className="intro-actions">
            <span className="floor-status">
              <i /> {paused ? 'FLOOR PAUSED' : 'LIVE TELEMETRY'}
            </span>
            <button className="soft-action" onClick={() => onTab('rag')}>
              <MessageCircle size={16} /> Ask the company
            </button>
          </div>
        }
      />
      <div className="floor-metrics">
        <Metric icon={Users} label="REGISTERED AGENTS" value={agents.length} change="configured workforce" />
        <Metric
          icon={BrainCircuit}
          label="WORKING NOW"
          value={agents.filter(isWorking).length}
          change="from realtime state"
          tone="violet"
        />
        <Metric
          icon={Network}
          label="DEPARTMENTS"
          value={String(ROOMS.length).padStart(2, '0')}
          change="connected rooms"
          tone="blue"
        />
      </div>
      <section className="floor-surface">
        <div className="floor-surface-bar">
          <div>
            <span className="eyebrow">WEBGL COMPANY FLOOR</span>
            <b>Drag to orbit - scroll to zoom - click an employee</b>
          </div>
          <span className="renderer-chip">
            <CircleDot size={12} /> WebGL / telemetry
          </span>
        </div>
        <div className="modern-floor-canvas">
          <Suspense fallback={<div className="floor-tip">Loading 3D floor…</div>}>
            <World agents={agents} selected={selected} onSelect={onSelect} paused={paused} />
          </Suspense>
          <div className="floor-overlay">
            <span>
              <i /> {events.length ? 'LIVE FEED' : 'NO EVENTS'}
            </span>
            <small>
              {agents.length} agents - {ROOMS.length} departments - {events.length} events
            </small>
          </div>
          <div className="floor-tip">
            Orbit <b>-</b> Zoom <b>-</b> Select
          </div>
        </div>
      </section>
    </div>
  );
}

import { ChevronRight, Pause, Play, Plus } from 'lucide-react';
import { owner } from '../config';
import { NAVIGATION } from '../navigation';

export default function Topbar({ tab, connected, paused, onPause, onNewTask }) {
  const current = NAVIGATION.find((item) => item.id === tab) || NAVIGATION[0];
  return (
    <header className="modern-topbar">
      <div className="modern-breadcrumb">
        <span>HANK62</span>
        <ChevronRight size={14} />
        <b>{current.label.toUpperCase()}</b>
      </div>
      <div className="topbar-actions">
        <span className={`connection-pill ${connected ? 'connected' : ''}`}>
          <i />
          {connected ? 'REALTIME LINK' : 'SERVER OFFLINE'}
        </span>
        <button className="icon-action" title={paused ? 'Resume floor' : 'Pause floor'} onClick={onPause}>
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button className="primary-action" onClick={onNewTask}>
          <Plus size={16} /> New task
        </button>
        <span className="avatar-action">{owner.initials}</span>
      </div>
    </header>
  );
}

import { lazy, Suspense, useState } from 'react';
import Sidebar from './components/Sidebar';
import TaskModal from './components/TaskModal';
import Topbar from './components/Topbar';
import DashboardView from './views/DashboardView';
import DocumentsView from './views/DocumentsView';
import FloorView from './views/FloorView';
import MemoryView from './views/MemoryView';

// The markdown renderer and i18n only load when the chat is opened.
const RagView = lazy(() => import('./views/RagView'));

export default function Workspace({
  tab,
  onTab,
  agents,
  selected,
  onSelect,
  paused,
  onPause,
  connected,
  events,
  onNewTask,
  onLogout,
  activeAgent,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);

  const views = {
    space: <FloorView agents={agents} events={events} selected={selected} onSelect={onSelect} paused={paused} onTab={onTab} />,
    rag: <RagView />,
    docs: <DocumentsView onTab={onTab} />,
    memory: <MemoryView events={events} />,
  };
  const page = views[tab] || <DashboardView agents={agents} events={events} connected={connected} onTab={onTab} />;

  return (
    <div className={`modern-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar tab={tab} onTab={onTab} collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} onLogout={onLogout} />
      <main className="modern-content">
        <Topbar tab={tab} connected={connected} paused={paused} onPause={onPause} onNewTask={() => setTaskOpen(true)} />
        <Suspense fallback={<div className="modern-page">Loading…</div>}>{page}</Suspense>
        <footer className="modern-footer">
          <span>HANK62 PRIVATE OS</span>
          <span>LOCAL-FIRST - ENCRYPTED SESSION</span>
          <span>{activeAgent ? `Focused: ${activeAgent.name}` : 'All systems nominal'}</span>
        </footer>
      </main>
      {taskOpen && <TaskModal agents={agents} onClose={() => setTaskOpen(false)} onSubmit={onNewTask} />}
    </div>
  );
}

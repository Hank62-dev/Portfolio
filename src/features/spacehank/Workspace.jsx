import { lazy, Suspense, useState } from 'react';
import { Spinner, TooltipProvider } from '../../design-system';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import Sidebar from './components/Sidebar';
import TaskModal from './components/TaskModal';
import Topbar from './components/Topbar';
import DashboardView from './views/DashboardView';
import DocumentsView from './views/DocumentsView';
import FloorView from './views/FloorView';
import MemoryView from './views/MemoryView';

// The markdown renderer and i18n only load when the chat is opened.
const RagView = lazy(() => import('./views/RagView'));

const PageLoading = () => (
  <div className="flex items-center gap-3 py-10 font-mono text-fine text-bone-dim">
    <Spinner label="Loading" /> Loading…
  </div>
);

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
  // Narrow screens always get the icon rail; the collapse toggle only matters on wide ones.
  const wide = useMediaQuery('(min-width: 1000px)');
  const rail = collapsed || !wide;

  const views = {
    space: <FloorView agents={agents} events={events} selected={selected} onSelect={onSelect} paused={paused} onTab={onTab} />,
    rag: <RagView />,
    docs: <DocumentsView onTab={onTab} />,
    memory: <MemoryView events={events} />,
  };
  const page = views[tab] || <DashboardView agents={agents} events={events} connected={connected} onTab={onTab} />;

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-ink-0 text-bone">
        <Sidebar
          tab={tab}
          onTab={onTab}
          rail={rail}
          canCollapse={wide}
          onCollapse={() => setCollapsed((value) => !value)}
          onLogout={onLogout}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar tab={tab} connected={connected} paused={paused} onPause={onPause} onNewTask={() => setTaskOpen(true)} />
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-gutter py-8">
            <Suspense fallback={<PageLoading />}>{page}</Suspense>
          </main>
          <footer className="flex flex-wrap justify-between gap-2 border-t border-line px-gutter py-4 font-mono text-fine text-bone-faint">
            <span>HANK62 PRIVATE OS</span>
            <span>{activeAgent ? `Focused: ${activeAgent.name}` : 'All systems nominal'}</span>
          </footer>
        </div>
        {taskOpen && <TaskModal agents={agents} onClose={() => setTaskOpen(false)} onSubmit={onNewTask} />}
      </div>
    </TooltipProvider>
  );
}

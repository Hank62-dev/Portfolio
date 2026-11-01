import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Copy, Pause, Play, Plus, SkipBack, SkipForward, Users } from 'lucide-react';
import { Button, Spinner, TooltipProvider } from '../../design-system';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { clsx } from '../../lib/format';
import CommandPalette from './components/CommandPalette';
import GuestLocked from './components/GuestLocked';
import Sidebar from './components/Sidebar';
import TaskModal from './components/TaskModal';
import Topbar from './components/Topbar';
import { NAVIGATION } from './navigation';
import { library, loadLibrary } from './music/library';
import NowPlayingBar from './music/NowPlayingBar';
import { next, player, previous, togglePlay } from './music/player';
import { toCss } from './studio/brand';
import { useStore } from './store';
import DashboardView from './views/DashboardView';
import DocumentsView from './views/DocumentsView';
import FloorView from './views/FloorView';
import MemoryView from './views/MemoryView';

// The markdown renderer, the music library and the studio only load when their tab is opened.
const RagView = lazy(() => import('./views/RagView'));
const MusicView = lazy(() => import('./views/MusicView'));
const StudioView = lazy(() => import('./views/StudioView'));

const PageLoading = () => (
  <div className="flex items-center gap-3 py-10 font-mono text-fine text-bone-dim">
    <Spinner label="Loading" /> Loading…
  </div>
);

const LOCKED = {
  rag: {
    eyebrow: 'HANK RAG / PRIVATE CHANNEL',
    title: (
      <>
        Hank <em>RAG.</em>
      </>
    ),
    description: 'Ask questions of your own documents and data, with sources.',
    why: 'It reads private documents, so it is closed in the demo. Sign in to ask Hank.',
  },
  docs: {
    eyebrow: 'KNOWLEDGE',
    title: (
      <>
        Document <em>Vault.</em>
      </>
    ),
    description: 'Upload files and make them searchable.',
    why: 'The vault holds private files, so it is closed in the demo. Sign in to open it.',
  },
  music: {
    eyebrow: 'PRIVATE LIBRARY',
    title: (
      <>
        Hank <em>Music.</em>
      </>
    ),
    description: 'A private player for the owner\'s own songs, kept on their device.',
    why: 'The library lives in the owner\'s browser and is never shared, so there is nothing to show here. Sign in on your own device to use it.',
  },
};

export default function Workspace({
  guest = false,
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
  onNotify,
  activeAgent,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Narrow screens always get the icon rail; the collapse toggle only matters on wide ones.
  const wide = useMediaQuery('(min-width: 1000px)');
  const rail = collapsed || !wide;
  const hasTrack = useStore(player, (s) => Boolean(s.trackId));
  const playing = useStore(player, (s) => s.playing);
  const trackCount = useStore(library, (s) => s.tracks.length);
  const music = !guest;

  useEffect(() => {
    if (music) void loadLibrary();
  }, [music]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const commands = useMemo(() => {
    const list = [
      ...NAVIGATION.map((item) => ({ id: `go-${item.id}`, label: `Go to ${item.label}`, hint: 'Navigate', icon: item.icon, keywords: `${item.section} ${item.keywords ?? ''}`, run: () => onTab(item.id) })),
      { id: 'new-task', label: 'New task for an agent', hint: 'Action', icon: Plus, keywords: 'dispatch assign', run: () => setTaskOpen(true) },
      { id: 'pause', label: paused ? 'Resume the floor' : 'Pause the floor', hint: 'Action', icon: paused ? Play : Pause, keywords: 'stop animation', run: onPause },
      {
        id: 'brand-css',
        label: 'Copy the brand CSS variables',
        hint: 'Studio',
        icon: Copy,
        keywords: 'tokens colours palette',
        run: () => navigator.clipboard?.writeText(toCss()).then(() => onNotify?.('Brand variables copied'), () => onNotify?.('The browser would not let me copy')),
      },
      ...agents.map((agent) => ({ id: `agent-${agent.id}`, label: `Focus ${agent.name}`, hint: agent.role, icon: Users, keywords: `${agent.model} ${agent.room} agent`, run: () => { onSelect(agent.id); onTab('space'); } })),
    ];
    if (music && hasTrack) {
      list.push(
        { id: 'music-toggle', label: playing ? 'Pause the music' : 'Resume the music', hint: 'Music', icon: playing ? Pause : Play, keywords: 'play song', run: togglePlay },
        { id: 'music-next', label: 'Next song', hint: 'Music', icon: SkipForward, run: next },
        { id: 'music-prev', label: 'Previous song', hint: 'Music', icon: SkipBack, run: previous }
      );
    }
    return list;
  }, [agents, hasTrack, music, onNotify, onPause, onSelect, onTab, paused, playing]);

  const views = {
    space: <FloorView agents={agents} events={events} selected={selected} onSelect={onSelect} paused={paused} onTab={onTab} />,
    memory: <MemoryView events={events} />,
    studio: <StudioView locked={guest} />,
    ...(guest
      ? Object.fromEntries(Object.entries(LOCKED).map(([id, copy]) => [id, <GuestLocked key={id} {...copy} onSignIn={onLogout} />]))
      : { rag: <RagView />, docs: <DocumentsView onTab={onTab} />, music: <MusicView /> }),
  };
  const page = views[tab] || <DashboardView agents={agents} events={events} connected={connected} onTab={onTab} owner={!guest} />;

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-ink-0 text-bone">
        <Sidebar
          tab={tab}
          onTab={onTab}
          rail={rail}
          guest={guest}
          canCollapse={wide}
          onCollapse={() => setCollapsed((value) => !value)}
          onLogout={onLogout}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar tab={tab} connected={connected} guest={guest} paused={paused} onPause={onPause} onNewTask={() => setTaskOpen(true)} onPalette={() => setPaletteOpen(true)} />
          {guest && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warn/30 bg-warn/10 px-gutter py-2 font-mono text-fine text-warn" role="status" data-demo-banner>
              <span>You are viewing a demo with sample data. Nothing here is real, and nothing you do is sent anywhere.</span>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Sign in
              </Button>
            </div>
          )}
          <main className={clsx('mx-auto w-full max-w-[1280px] flex-1 px-gutter py-8', music && hasTrack && 'pb-28')}>
            <Suspense fallback={<PageLoading />}>{page}</Suspense>
          </main>
          <footer className="flex flex-wrap justify-between gap-2 border-t border-line px-gutter py-4 font-mono text-fine text-bone-faint">
            <span>HANK62 PRIVATE OS</span>
            <span>{activeAgent ? `Focused: ${activeAgent.name}` : 'All systems nominal'}</span>
          </footer>
        </div>
        {taskOpen && <TaskModal agents={agents} onClose={() => setTaskOpen(false)} onSubmit={onNewTask} />}
        {music && <NowPlayingBar onOpen={() => onTab('music')} />}
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} music={music && trackCount > 0} />
      </div>
    </TooltipProvider>
  );
}

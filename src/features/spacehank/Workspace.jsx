import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Copy, Download, Pause, Play, Plus, SkipBack, SkipForward, Users } from 'lucide-react';
import { Button, Spinner, TooltipProvider } from '../../design-system';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useInstall, useOnline } from './hooks/useInstall';
import { clsx } from '../../lib/format';
import CommandPalette from './components/CommandPalette';
import GuestLocked from './components/GuestLocked';
import { LOCKED } from './components/lockedCopy';
import Sidebar from './components/Sidebar';
import TaskModal from './components/TaskModal';
import Topbar from './components/Topbar';
import { interpretCommand } from './api/owner';
import { buildCatalog, validate } from './model/nlcommands';
import { NAVIGATION } from './navigation';
import { sendIntent } from './notes/library';
import { useShellContext, playMood } from './hooks/useShellContext';
import { missions } from './missions/store';
import { newCard } from './missions/model';
import { entries } from './wallet/store';
import { parseEntry } from './wallet/model';
import { library, loadLibrary } from './music/library';
import NowPlayingBar from './music/NowPlayingBar';
import { next, player, previous, setSleepTimer, togglePlay } from './music/player';
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
const NotesView = lazy(() => import('./views/NotesView'));
const ConstellationView = lazy(() => import('./views/ConstellationView'));
const MissionView = lazy(() => import('./views/MissionView'));
const StudyView = lazy(() => import('./views/StudyView'));
const HabitsView = lazy(() => import('./views/HabitsView'));
const WalletView = lazy(() => import('./views/WalletView'));
const PulseView = lazy(() => import('./views/PulseView'));
const ShellView = lazy(() => import('./views/ShellView'));
const MemosView = lazy(() => import('./views/MemosView'));

const PageLoading = () => (
  <div className="flex items-center gap-3 py-10 font-mono text-fine text-bone-dim">
    <Spinner label="Loading" /> Loading…
  </div>
);

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
  const app = useInstall();
  const online = useOnline();

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
    if (app.canInstall || app.ios) {
      list.push({
        id: 'install',
        label: 'Install Hank62 as an app',
        hint: 'App',
        icon: Download,
        keywords: 'pwa home screen phone',
        run: () => (app.canInstall ? app.install() : onNotify?.('On iPhone: tap Share, then Add to Home Screen')),
      });
    }
    if (music && hasTrack) {
      list.push(
        { id: 'music-toggle', label: playing ? 'Pause the music' : 'Resume the music', hint: 'Music', icon: playing ? Pause : Play, keywords: 'play song', run: togglePlay },
        { id: 'music-next', label: 'Next song', hint: 'Music', icon: SkipForward, run: next },
        { id: 'music-prev', label: 'Previous song', hint: 'Music', icon: SkipBack, run: previous }
      );
    }
    return list;
  }, [agents, app, hasTrack, music, onNotify, onPause, onSelect, onTab, paused, playing]);

  const shellTabs = useMemo(() => NAVIGATION.map(({ id, label }) => ({ id, label })), []);

  // "Tell Hank what to do": the sentence goes to the server, which only picks from this catalog, and the answer is
  // checked here before it is shown. Nothing runs until the person confirms.
  const interpret = async (text) => {
    const tabsList = NAVIGATION.map(({ id, label }) => ({ id, label }));
    const reply = await interpretCommand({
      text,
      catalog: buildCatalog({ tabs: tabsList, agents }),
      context: { tab, agents: agents.length, songs: library.get().tracks.length, playing: player.get().playing },
    });
    return validate(reply, { tabs: tabsList, agents });
  };

  const execute = async ({ action, params }) => {
    switch (action) {
      case 'navigate':
        return onTab(params.tab);
      case 'dispatch_task':
        return onNewTask(params.task, params.agent);
      case 'focus_agent':
        onSelect(params.agent);
        return onTab('space');
      case 'music': {
        const { playing: isPlaying, trackId } = player.get();
        if (params.do === 'next') return next();
        if (params.do === 'previous') return previous();
        if (!trackId) return onNotify?.('Nothing is playing yet');
        if ((params.do === 'pause') === isPlaying || (params.do === 'resume') === !isPlaying) return togglePlay();
        return undefined;
      }
      case 'play_mood':
        try {
          return onNotify?.(await playMood(params.mood));
        } catch (error) {
          return onNotify?.(error.message);
        }
      case 'sleep_timer':
        setSleepTimer(params.minutes);
        return onNotify?.(`Music will stop in ${params.minutes} minutes`);
      case 'new_note':
        sendIntent('notes', { text: params.text });
        return onTab('notes');
      case 'ask_notes':
        sendIntent('notes', { question: params.question });
        return onTab('notes');
      case 'search_notes':
        sendIntent('notes', { search: params.query });
        return onTab('notes');
      case 'draft_image':
        sendIntent('studio', { prompt: params.prompt });
        return onTab('studio');
      case 'new_card': {
        await missions.load();
        const cards = missions.store.get().items;
        await missions.create(newCard(params.title, 'backlog', cards.filter((c) => c.column === 'backlog').length));
        onNotify?.('Added to the Mission Board');
        return onTab('missions');
      }
      case 'log_money': {
        const entry = parseEntry(params.text);
        if (entry.amount <= 0) return onNotify?.('I could not find an amount in that');
        await entries.create({ ...entry, at: Date.now() });
        onNotify?.('Logged in the Wallet');
        return onTab('wallet');
      }
      case 'floor':
        return (params.do === 'pause') !== paused ? onPause() : undefined;
      default:
        return undefined;
    }
  };

  const shell = useShellContext({ tabs: shellTabs, agents, onTab, onNewTask });

  const views = {
    space: <FloorView agents={agents} events={events} selected={selected} onSelect={onSelect} paused={paused} onTab={onTab} />,
    memory: <MemoryView events={events} />,
    studio: <StudioView locked={guest} />,
    ...(guest
      ? Object.fromEntries(Object.entries(LOCKED).map(([id, copy]) => [id, <GuestLocked key={id} {...copy} onSignIn={onLogout} />]))
      : {
          rag: <RagView />,
          docs: <DocumentsView onTab={onTab} />,
          music: <MusicView />,
          notes: <NotesView />,
          constellation: <ConstellationView onOpenNote={(id) => { sendIntent('notes', { open: id }); onTab('notes'); }} />,
          memos: <MemosView onNotify={onNotify} />,
          missions: <MissionView agents={agents} events={events} onNewTask={onNewTask} onNotify={onNotify} connected={connected} />,
          study: <StudyView onNotify={onNotify} onFocusMusic={() => playMood('deep focus, calm and steady').then(onNotify, (e) => onNotify?.(e.message))} />,
          habits: <HabitsView />,
          wallet: <WalletView />,
          shell: <ShellView ctx={shell} />,
        }),
    pulse: <PulseView owner={!guest} />,
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
          app={app}
          onNotify={onNotify}
          canCollapse={wide}
          onCollapse={() => setCollapsed((value) => !value)}
          onLogout={onLogout}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar tab={tab} connected={connected} guest={guest} paused={paused} onPause={onPause} onNewTask={() => setTaskOpen(true)} onPalette={() => setPaletteOpen(true)} />
          {!online && (
            <div className="border-b border-line bg-ink-2 px-gutter py-2 font-mono text-fine text-bone-dim" role="status" data-offline>
              You are offline. Music, notes and pictures still work; AI, the calendar and the realtime link wait for the connection.
            </div>
          )}
          {guest && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-warn/30 bg-warn/10 px-gutter py-2 font-mono text-fine text-warn" role="status" data-demo-banner>
              <span>You are viewing a demo with sample data. Nothing here is real, and nothing you do is sent anywhere.</span>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Sign in
              </Button>
            </div>
          )}
          <main className={clsx('mx-auto w-full max-w-[1280px] flex-1 px-gutter py-8', music && hasTrack && tab !== 'music' && 'pb-28')}>
            <Suspense fallback={<PageLoading />}>{page}</Suspense>
          </main>
          <footer className="flex flex-wrap justify-between gap-2 border-t border-line px-gutter py-4 font-mono text-fine text-bone-faint">
            <span>HANK62 PRIVATE OS</span>
            <span>{activeAgent ? `Focused: ${activeAgent.name}` : 'All systems nominal'}</span>
          </footer>
        </div>
        {taskOpen && <TaskModal agents={agents} onClose={() => setTaskOpen(false)} onSubmit={onNewTask} />}
        {music && tab !== 'music' && <NowPlayingBar onOpen={() => onTab('music')} />}
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          commands={commands}
          music={music && trackCount > 0}
          onInterpret={guest ? undefined : interpret}
          onRun={execute}
        />
      </div>
    </TooltipProvider>
  );
}

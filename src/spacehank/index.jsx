import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoginScreen, { AuthLoading, ServerUnreachable } from './layout/LoginScreen';
import { Toast } from '../shared/ui';
import { DEMO_URL, GUEST_HOME, WORKSPACE_URL, isDemo } from './core/demo/mode';
import { resetDemo, seedDemo } from './app/demo/seed';
import { useDemo } from './app/demo/useDemo';
import { useRealtime } from './core/realtime/useRealtime';
import { startSync } from './core/sync';
import { useAppViewport } from './core/hooks/useAppViewport';
import { DEFAULT_AGENT_ID } from './core/agents';
import { spacehankConfig } from './core/config';
import { DEFAULT_TAB, NAVIGATION } from './core/navigation';

// the open tab lives in the address (/spacehank?tab=notes), which is also what an installed app's shortcuts use
const tabOf = (params, fallback) => {
  const wanted = params.get('tab');
  return NAVIGATION.some((item) => item.id === wanted) ? wanted : fallback;
};
import Workspace from './app/Workspace';
import { tr } from './core/i18n/lang';

export default function SpaceHank() {
  useAppViewport(); // the workspace is an app: the page cannot be pinched to zoom
  const live = useRealtime();
  // the portfolio links here with ?demo: the same workspace, filled with made-up data (see ./demo)
  const guest = isDemo();
  const [ready, setReady] = useState(!guest);
  const demo = useDemo(guest, live.notify);
  const [params, setParams] = useSearchParams();
  const tab = tabOf(params, guest ? GUEST_HOME : DEFAULT_TAB);
  // each tab is its own history entry, so the browser's Back button returns to the tab you came from
  const setTab = (next) => {
    if (next === tab) return;
    setParams((previous) => {
      const search = new URLSearchParams(previous);
      search.set('tab', next);
      return search;
    });
  };
  const [selected, setSelected] = useState(DEFAULT_AGENT_ID);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (guest) seedDemo().catch(() => {}).finally(() => setReady(true));
  }, [guest]);

  const { authenticated } = live;

  // the owner's data is kept in step with the database while signed in (a guest has nothing to sync)
  useEffect(() => (!guest && authenticated ? startSync() : undefined), [guest, authenticated]);

  if (guest && !ready) return <AuthLoading label={tr('Setting up the demo')} />;
  if (!guest && authenticated === null && live.unreachable) return <ServerUnreachable apiUrl={spacehankConfig.realtimeApiUrl} />;
  if (!guest && authenticated === null) return <AuthLoading label={live.waking ? tr('Waking the server (a free server can take up to a minute)') : undefined} />;
  // a full page load, so the demo's storage and the real one are never open at the same time
  if (!guest && !authenticated) return <LoginScreen onLogin={live.login} />;

  // A guest sees the same workspace driven by a local script; the owner sees the real server.
  const { agents, events, dispatchTask } = guest ? demo : live;
  const connected = guest ? true : live.connected;
  const link = guest ? 'online' : live.link;
  const activeAgent = agents.find((agent) => agent.id === selected) || agents[0];

  const submitTask = (text, agentId) => {
    const sent = dispatchTask(text, agentId);
    if (sent) setSelected(agentId);
    return sent;
  };

  const leave = () => {
    if (guest) window.location.assign(WORKSPACE_URL);
    else live.logout();
  };
  const reset = async () => {
    await resetDemo();
    window.location.assign(DEMO_URL);
  };

  return (
    <>
      <Workspace
        guest={guest}
        tab={tab}
        onTab={setTab}
        agents={agents}
        selected={selected}
        onSelect={setSelected}
        paused={paused}
        onPause={() => setPaused((value) => !value)}
        connected={connected}
        link={link}
        events={events}
        onNewTask={submitTask}
        onLogout={leave}
        onResetDemo={reset}
        onNotify={live.notify}
        activeAgent={activeAgent}
      />
      <Toast />
    </>
  );
}

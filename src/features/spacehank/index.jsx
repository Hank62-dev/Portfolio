import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoginScreen, { AuthLoading } from './components/LoginScreen';
import { Toast } from '../../design-system';
import { DEMO_URL, WORKSPACE_URL, isDemo } from './demo/mode';
import { resetDemo, seedDemo } from './demo/seed';
import { useDemo } from './hooks/useDemo';
import { useRealtime } from './hooks/useRealtime';
import { startSync } from './sync';
import { DEFAULT_AGENT_ID } from './model/agents';
import { DEFAULT_TAB, NAVIGATION } from './navigation';

// the open tab lives in the address (/spacehank?tab=notes), which is also what an installed app's shortcuts use
const tabOf = (params) => {
  const wanted = params.get('tab');
  return NAVIGATION.some((item) => item.id === wanted) ? wanted : DEFAULT_TAB;
};
import Workspace from './Workspace';

export default function SpaceHank() {
  const live = useRealtime();
  // the portfolio links here with ?demo: the same workspace, filled with made-up data (see ./demo)
  const guest = isDemo();
  const [ready, setReady] = useState(!guest);
  const demo = useDemo(guest, live.notify);
  const [params, setParams] = useSearchParams();
  const tab = tabOf(params);
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

  if (guest && !ready) return <AuthLoading label="Setting up the demo" />;
  if (!guest && authenticated === null) return <AuthLoading label={live.waking ? 'Waking the server (a free server can take up to a minute)' : undefined} />;
  // a full page load, so the demo's storage and the real one are never open at the same time
  if (!guest && !authenticated) return <LoginScreen onLogin={live.login} onGuest={() => window.location.assign(DEMO_URL)} />;

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

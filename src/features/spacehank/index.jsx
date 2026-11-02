import { useState } from 'react';
import LoginScreen, { AuthLoading } from './components/LoginScreen';
import { Toast } from '../../design-system';
import { useDemo } from './hooks/useDemo';
import { useRealtime } from './hooks/useRealtime';
import { DEFAULT_AGENT_ID } from './model/agents';
import { DEFAULT_TAB } from './navigation';
import Workspace from './Workspace';

export default function SpaceHank() {
  const live = useRealtime();
  // the portfolio links here with ?demo, to open the guest view straight away
  const [guest, setGuest] = useState(() => new URLSearchParams(window.location.search).has('demo'));
  const demo = useDemo(guest, live.notify);
  const [tab, setTab] = useState(DEFAULT_TAB);
  const [selected, setSelected] = useState(DEFAULT_AGENT_ID);
  const [paused, setPaused] = useState(false);

  const { authenticated, toast } = live;
  if (!guest && authenticated === null) return <AuthLoading />;
  if (!guest && !authenticated) return <LoginScreen onLogin={live.login} onGuest={() => setGuest(true)} />;

  // A guest sees the same workspace driven by a local script; the owner sees the real server.
  const { agents, events, dispatchTask } = guest ? demo : live;
  const connected = guest ? true : live.connected;
  const activeAgent = agents.find((agent) => agent.id === selected) || agents[0];

  const submitTask = (text, agentId) => {
    const sent = dispatchTask(text, agentId);
    if (sent) setSelected(agentId);
    return sent;
  };

  const leave = () => {
    if (guest) {
      setGuest(false);
      setTab(DEFAULT_TAB);
    } else live.logout();
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
        events={events}
        onNewTask={submitTask}
        onLogout={leave}
        onNotify={live.notify}
        activeAgent={activeAgent}
      />
      <Toast message={toast} />
    </>
  );
}

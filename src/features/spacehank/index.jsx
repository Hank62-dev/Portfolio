import { useState } from 'react';
import './styles/spacehank.css';
import './styles/modern.css';
import LoginScreen, { AuthLoading } from './components/LoginScreen';
import { Toast } from './components/ui';
import { useRealtime } from './hooks/useRealtime';
import { DEFAULT_AGENT_ID } from './model/agents';
import { DEFAULT_TAB } from './navigation';
import Workspace from './Workspace';

export default function SpaceHank() {
  const { authenticated, connected, agents, events, toast, login, logout, dispatchTask } = useRealtime();
  const [tab, setTab] = useState(DEFAULT_TAB);
  const [selected, setSelected] = useState(DEFAULT_AGENT_ID);
  const [paused, setPaused] = useState(false);

  if (authenticated === null) return <AuthLoading />;
  if (!authenticated) return <LoginScreen onLogin={login} />;

  const activeAgent = agents.find((agent) => agent.id === selected) || agents[0];

  const submitTask = (text, agentId) => {
    if (dispatchTask(text, agentId)) setSelected(agentId);
  };

  return (
    <>
      <Workspace
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
        onLogout={logout}
        activeAgent={activeAgent}
      />
      <Toast message={toast} />
    </>
  );
}

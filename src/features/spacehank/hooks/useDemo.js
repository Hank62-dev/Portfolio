import { useEffect, useReducer, useRef } from 'react';
import { spacehankConfig } from '../config';
import { DEFAULT_AGENT_ID, createInitialAgents } from '../model/agents';
import { demoMessage, demoOpening } from '../model/demo';
import { applyRealtimeMessage } from '../model/realtime';
import { tr } from '../lang';

const { maxEvents } = spacehankConfig;
const TICK_MS = 2600;

const reducer = (state, message) => {
  const { agents, events } = applyRealtimeMessage(state, message, maxEvents);
  return agents === state.agents && events === state.events ? state : { agents, events };
};

/**
 * Guest mode: the same shape as `useRealtime`, but fed by a local script instead of a server. Nothing is sent
 * anywhere, and a task a guest "dispatches" is only added to the simulated feed.
 */
export function useDemo(active, notify) {
  const [{ agents, events }, dispatch] = useReducer(reducer, undefined, () => {
    const opening = applyRealtimeMessage({ agents: createInitialAgents(), events: [] }, demoOpening(), maxEvents);
    return { agents: opening.agents, events: opening.events };
  });
  const step = useRef(0);

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => {
      dispatch(demoMessage(step.current));
      step.current += 1;
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [active]);

  const dispatchTask = (text, agentId = DEFAULT_AGENT_ID) => {
    const task = String(text || '').trim();
    if (!task) return false;
    dispatch({
      type: 'event',
      agents: [{ id: agentId, status: 'working', task: task.slice(0, 80) }],
      event: { agent: agentId, action: 'started', text: task.slice(0, 120), at: Date.now() },
    });
    notify?.(tr('Demo mode: this task is simulated and goes nowhere'));
    return true;
  };

  return { agents, events, dispatchTask };
}

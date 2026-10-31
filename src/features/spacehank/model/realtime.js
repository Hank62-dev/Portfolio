import { findAgent } from './agents';

/** Turns a server event into the shape the UI renders. */
export const toUiEvent = (event, { now = false } = {}) => {
  const agent = findAgent(event.agent);
  return {
    name: agent.name,
    action: event.action,
    text: event.text,
    time: !now && event.at ? new Date(event.at).toLocaleTimeString() : 'now',
    color: agent.color,
  };
};

/**
 * Folds one realtime message into { agents, events }.
 *  - `agents`  live status for the agents it names (the roster itself is fixed client-side)
 *  - `events`  the server's full recent list, replacing ours
 *  - `event`   one new event, prepended to the list
 * Returns the new state plus `error` when the server rejected a task.
 */
export const applyRealtimeMessage = (state, message, maxEvents) => {
  let { agents, events } = state;

  if (message.agents) {
    agents = agents.map((local) => ({ ...local, ...(message.agents.find((remote) => remote.id === local.id) || {}) }));
  }
  if (message.events) events = message.events.map((event) => toUiEvent(event));
  if (message.event) events = [toUiEvent(message.event, { now: true }), ...events].slice(0, maxEvents);

  return { agents, events, error: message.type === 'task_error' ? message.error : null };
};

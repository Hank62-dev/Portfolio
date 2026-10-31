import { randomUUID } from 'node:crypto';

/** Shared realtime state (agents, tasks, recent events) and the connected WebSocket clients. */
export const createHub = ({ agents, maxEvents, maxTasks }) => {
  const clients = new Set();
  const tasks = [];
  const events = [];

  const snapshot = () => ({ agents, tasks, events });

  const broadcast = (message) => {
    const payload = JSON.stringify(message);
    for (const client of clients) if (client.readyState === 1) client.send(payload);
  };

  const pushEvent = (event) => {
    const item = { id: randomUUID(), at: new Date().toISOString(), ...event };
    events.unshift(item);
    if (events.length > maxEvents) events.pop();
    // `events` is deliberately left out: clients prepend `event` to the list they already have.
    broadcast({ type: 'event', event: item, agents, tasks });
    return item;
  };

  const addTask = (task) => {
    tasks.unshift(task);
    if (tasks.length > maxTasks) tasks.pop();
  };

  return { clients, snapshot, broadcast, pushEvent, addTask };
};

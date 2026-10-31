// The registry of agents the server can dispatch work to.
// A worker only runs when SPACEHANK_<ID>_CMD is set; nothing is ever simulated.

const DEFINITIONS = [
  ['codex', 'Codex', 'ENGINEERING'],
  ['claude', 'Claude', 'RESEARCH'],
  ['nova', 'Nova', 'DOCUMENTS'],
  ['pixel', 'Pixel', 'DESIGN'],
  ['atlas', 'Atlas', 'QUALITY'],
  ['rhea', 'Rhea', 'ML LAB'],
  ['gemini', 'Gemini', 'RESEARCH'],
  ['grok', 'Grok', 'RESEARCH'],
  ['deepseek', 'DeepSeek', 'ENGINEERING'],
  ['qwen', 'Qwen', 'DOCUMENTS'],
  ['mira', 'Mira Core', 'CONTROL'],
];

export const IDLE_TASK = 'Waiting for a task';

export const createAgents = () =>
  DEFINITIONS.map(([id, name, room]) => ({
    id,
    name,
    room,
    status: 'offline',
    task: 'Waiting for realtime telemetry',
  }));

/** The shell command configured for an agent, or undefined when it has no worker. */
export const workerCommand = (env, agent) => env[`SPACEHANK_${agent.id.toUpperCase()}_CMD`] || undefined;

export const configuredWorkers = (env, agents) =>
  agents.filter((agent) => workerCommand(env, agent)).map((agent) => agent.id);

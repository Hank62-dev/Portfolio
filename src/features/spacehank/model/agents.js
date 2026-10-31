// The AI workforce shown on the floor. Scene coordinates live in scene/layout.js.

export const OFFLINE_TASK = 'Waiting for realtime telemetry';
export const DEFAULT_AGENT_ID = 'codex';

export const AGENTS = [
  { id: 'codex', name: 'Minh Codex', role: 'Lead engineer', model: 'GPT-5', color: '#62e7d3', room: 'ENGINEERING' },
  { id: 'claude', name: 'An Claude', role: 'Research analyst', model: 'Claude Sonnet 4', color: '#c9a5ff', room: 'RESEARCH' },
  { id: 'nova', name: 'Linh Nova', role: 'Document builder', model: 'GPT-4.1', color: '#ffb76b', room: 'DOCUMENTS' },
  { id: 'pixel', name: 'Khoa Pixel', role: 'UI systems', model: 'Claude Sonnet 4', color: '#ff7e9e', room: 'DESIGN' },
  { id: 'atlas', name: 'Huy Atlas', role: 'QA architect', model: 'GPT-5 mini', color: '#7ab8ff', room: 'QUALITY' },
  { id: 'rhea', name: 'Mai Rhea', role: 'ML operator', model: 'Claude Opus 4', color: '#f48dca', room: 'ML LAB' },
  { id: 'gemini', name: 'Vy Gemini', role: 'Data researcher', model: 'Gemini 2.5 Pro', color: '#6da8ff', room: 'RESEARCH' },
  { id: 'grok', name: 'Son Grok', role: 'Realtime scout', model: 'Grok 4', color: '#f5f5f5', room: 'RESEARCH' },
  { id: 'deepseek', name: 'Ha DeepSeek', role: 'Code specialist', model: 'DeepSeek V3', color: '#4aa5ff', room: 'ENGINEERING' },
  { id: 'qwen', name: 'Thu Qwen', role: 'Knowledge curator', model: 'Qwen 3 Max', color: '#ffc765', room: 'DOCUMENTS' },
  { id: 'mira', name: 'Mira Core', role: 'Infrastructure operator', model: 'SpaceHank Control AI', color: '#62e7d3', room: 'CONTROL' },
];

export const createInitialAgents = () => AGENTS.map((agent) => ({ ...agent, status: 'offline', task: OFFLINE_TASK }));

const INACTIVE_STATUSES = ['idle', 'offline', 'completed'];

export const isWorking = (agent) => !INACTIVE_STATUSES.includes(agent.status);

export const findAgent = (id) => AGENTS.find((agent) => agent.id === id) || AGENTS[0];

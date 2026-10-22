import http from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.SPACEHANK_PORT || 8787);
const DEMO_MODE = process.env.SPACEHANK_DEMO !== 'false';
const AUTH_PASSWORD = process.env.SPACEHANK_PASSWORD || 'spacehank-local';
const SESSION_TTL = 1000 * 60 * 60 * 12;
const clients = new Set();
const sessions = new Map();
const tasks = [];
const events = [];
const agents = [
  { id: 'codex', name: 'Codex', status: 'idle', room: 'ENGINEERING', task: 'Waiting for a task' },
  { id: 'claude', name: 'Claude', status: 'idle', room: 'RESEARCH', task: 'Waiting for a task' },
  { id: 'nova', name: 'Nova', status: 'idle', room: 'DOCUMENTS', task: 'Waiting for a task' },
  { id: 'pixel', name: 'Pixel', status: 'idle', room: 'DESIGN', task: 'Waiting for a task' },
  { id: 'atlas', name: 'Atlas', status: 'idle', room: 'QUALITY', task: 'Waiting for a task' },
  { id: 'rhea', name: 'Rhea', status: 'idle', room: 'ML LAB', task: 'Waiting for a task' },
  { id: 'gemini', name: 'Gemini', status: 'analysing', room: 'RESEARCH', task: 'Comparing multimodal sources' },
  { id: 'grok', name: 'Grok', status: 'scanning', room: 'RESEARCH', task: 'Monitoring live signals' },
  { id: 'deepseek', name: 'DeepSeek', status: 'coding', room: 'ENGINEERING', task: 'Optimising inference code' },
  { id: 'qwen', name: 'Qwen', status: 'curating', room: 'DOCUMENTS', task: 'Indexing company memory' },
  { id: 'mira', name: 'Mira Core', status: 'monitoring', room: 'CONTROL', task: 'Monitoring central server room' },
];

const pushEvent = (event) => {
  const item = { id: randomUUID(), at: new Date().toISOString(), ...event };
  events.unshift(item);
  if (events.length > 40) events.pop();
  const message = JSON.stringify({ type: 'event', event: item, agents, tasks });
  for (const client of clients) if (client.readyState === 1) client.send(message);
};

const corsHeaders = { 'Access-Control-Allow-Origin': process.env.SPACEHANK_ORIGIN || 'http://localhost:5173', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (res, status, data, extra = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders, ...extra }); res.end(JSON.stringify(data)); };
const body = (req) => new Promise((resolve, reject) => { let data = ''; req.on('data', (chunk) => { data += chunk; }); req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (error) { reject(error); } }); });
const cookie = (req, name) => req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
const sessionFrom = (req) => { const token = cookie(req, 'spacehank_session'); const session = token && sessions.get(token); if (!session || session.expiresAt < Date.now()) { if (token) sessions.delete(token); return null; } return session; };
const authorized = (req) => Boolean(sessionFrom(req));
const safePasswordMatch = (candidate) => { const left = Buffer.from(String(candidate || '')); const right = Buffer.from(AUTH_PASSWORD); return left.length === right.length && timingSafeEqual(left, right); };
const requireAuth = (req, res) => { if (authorized(req)) return true; json(res, 401, { error: 'Authentication required' }); return false; };

function runAgent(agent, task) {
  const command = agent.id === 'codex' ? process.env.SPACEHANK_CODEX_CMD : process.env.SPACEHANK_CLAUDE_CMD;
  if (!command) {
    setTimeout(() => { agent.status = 'completed'; agent.task = 'Waiting for a task'; task.status = 'completed'; pushEvent({ agent: agent.id, action: 'completed', text: `Demo completed: ${task.title}` }); }, 5000);
    return;
  }
  const child = spawn(command, { shell: true, cwd: process.env.SPACEHANK_WORKDIR || process.cwd(), env: process.env, windowsHide: true });
  child.stdin?.write(task.prompt);
  child.stdin?.end();
  child.stdout.on('data', (chunk) => pushEvent({ agent: agent.id, action: 'output', text: String(chunk).trim().slice(-300) }));
  child.stderr.on('data', (chunk) => pushEvent({ agent: agent.id, action: 'warning', text: String(chunk).trim().slice(-300) }));
  child.on('close', (code) => { agent.status = code === 0 ? 'completed' : 'failed'; agent.task = 'Waiting for a task'; task.status = code === 0 ? 'completed' : 'failed'; pushEvent({ agent: agent.id, action: agent.status, text: `${agent.name} exited with code ${code}` }); });
}

function createTask(input) {
  const agent = agents.find((candidate) => candidate.id === input.agentId) || agents.find((candidate) => candidate.status === 'idle') || agents[0];
  const task = { id: randomUUID(), title: input.title || 'Untitled task', prompt: input.prompt || input.title || '', agentId: agent.id, status: 'running', createdAt: new Date().toISOString() };
  tasks.unshift(task); agent.status = 'working'; agent.task = task.title;
  pushEvent({ agent: agent.id, action: 'started', text: `${agent.name} accepted “${task.title}”` });
  runAgent(agent, task);
  return task;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, corsHeaders); return res.end(); }
  if (req.url === '/health') return json(res, 200, { ok: true, demo: DEMO_MODE, uptime: process.uptime(), agents: agents.length });
  if (req.method === 'GET' && req.url === '/api/auth/session') return json(res, 200, { authenticated: authorized(req) });
  if (req.method === 'POST' && req.url === '/api/auth/login') { try { const input = await body(req); if (!safePasswordMatch(input.password)) return json(res, 401, { error: 'Invalid password' }); const token = randomUUID(); sessions.set(token, { expiresAt: Date.now() + SESSION_TTL }); return json(res, 200, { authenticated: true }, { 'Set-Cookie': `spacehank_session=${token}; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL / 1000}; Path=/` }); } catch { return json(res, 400, { error: 'Invalid JSON' }); } }
  if (req.method === 'POST' && req.url === '/api/auth/logout') { const token = cookie(req, 'spacehank_session'); if (token) sessions.delete(token); return json(res, 200, { authenticated: false }, { 'Set-Cookie': 'spacehank_session=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/' }); }
  if (req.url === '/api/state') { if (!requireAuth(req, res)) return; return json(res, 200, { agents, tasks, events }); }
  if (req.method === 'POST' && req.url === '/api/tasks') { if (!requireAuth(req, res)) return; try { const task = createTask(await body(req)); return json(res, 201, task); } catch { return json(res, 400, { error: 'Invalid JSON' }); } }
  return json(res, 404, { error: 'Not found' });
});

const wss = new WebSocketServer({ server });
wss.on('connection', (socket, req) => { if (!authorized(req)) return socket.close(1008, 'Authentication required'); clients.add(socket); socket.send(JSON.stringify({ type: 'state', agents, tasks, events })); socket.on('message', (raw) => { try { const message = JSON.parse(raw); if (message.type === 'task') createTask(message); } catch { /* ignore malformed client events */ } }); socket.on('close', () => clients.delete(socket)); });

if (DEMO_MODE) {
  setInterval(() => { const available = agents.filter((agent) => agent.status === 'idle' || agent.status === 'completed'); if (!available.length) return; const agent = available[Math.floor(Math.random() * available.length)]; agent.status = 'syncing'; agent.task = 'Syncing with another department'; pushEvent({ agent: agent.id, action: 'handoff', text: `${agent.name} is exchanging context with the team` }); setTimeout(() => { agent.status = 'idle'; agent.task = 'Waiting for a task'; }, 2600); }, 9000);
}

server.listen(PORT, () => console.log(`SpaceHank realtime server listening on http://localhost:${PORT} (password auth enabled)`));

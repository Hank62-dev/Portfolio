import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { IDLE_TASK, workerCommand } from './agents.mjs';
import { HttpError } from './http.mjs';

const tail = (chunk) => String(chunk).trim().slice(-300);

/** Validates a task request and starts the matching worker process. */
export const createTaskService = ({ agents, hub, config, spawnProcess = spawn }) => {
  const normalize = (input) => {
    if (!input || typeof input !== 'object') throw new HttpError(400, 'Invalid task');
    const { agentId, title, prompt } = input;
    if (typeof agentId !== 'string') throw new HttpError(400, 'Unknown agent');
    for (const value of [title, prompt]) {
      if (value !== undefined && typeof value !== 'string') throw new HttpError(400, 'Invalid task');
      if (value && value.length > config.maxTaskChars) throw new HttpError(400, 'Task is too long');
    }
    return { agentId, title: title || 'Untitled task', prompt: prompt || title || '' };
  };

  // Workers get the server's environment, minus the password that guards this very server.
  const workerEnv = () => {
    const env = { ...config.env };
    delete env.SPACEHANK_PASSWORD;
    return env;
  };

  const run = (agent, task, command) => {
    agent.status = 'working';
    agent.task = task.title;
    const child = spawnProcess(command, { shell: true, cwd: config.workdir, env: workerEnv(), windowsHide: true });
    child.stdin?.write(task.prompt);
    child.stdin?.end();
    child.stdout?.on('data', (chunk) => hub.pushEvent({ agent: agent.id, action: 'output', text: tail(chunk) }));
    child.stderr?.on('data', (chunk) => hub.pushEvent({ agent: agent.id, action: 'warning', text: tail(chunk) }));
    child.on('error', (error) => {
      agent.status = 'failed';
      agent.task = 'Worker process error';
      task.status = 'failed';
      task.error = error.message;
      hub.pushEvent({ agent: agent.id, action: 'failed', text: `${agent.name}: ${error.message}` });
    });
    child.on('close', (code) => {
      agent.status = code === 0 ? 'completed' : 'failed';
      agent.task = IDLE_TASK;
      task.status = code === 0 ? 'completed' : 'failed';
      hub.pushEvent({ agent: agent.id, action: agent.status, text: `${agent.name} exited with code ${code}` });
    });
  };

  const create = (input) => {
    const { agentId, title, prompt } = normalize(input);
    const agent = agents.find((candidate) => candidate.id === agentId);
    if (!agent) throw new HttpError(400, 'Unknown agent');
    const command = workerCommand(config.env, agent);
    if (!command) throw new HttpError(400, `Worker command is not configured for ${agent.name}`);

    const task = {
      id: randomUUID(),
      title,
      prompt,
      agentId: agent.id,
      status: 'running',
      createdAt: new Date().toISOString(),
    };
    hub.addTask(task);
    hub.pushEvent({ agent: agent.id, action: 'started', text: `${agent.name} accepted “${task.title}”` });
    run(agent, task, command);
    return task;
  };

  return { create };
};

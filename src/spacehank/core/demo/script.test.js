import { describe, expect, it } from 'vitest';
import { AGENTS, isWorking } from '../agents';
import { DEMO_STEPS, demoMessage, demoOpening, demoSchedule } from './script';
import { applyRealtimeMessage } from '../realtime/model';

const start = () => applyRealtimeMessage({ agents: AGENTS.map((a) => ({ ...a, status: 'offline', task: '' })), events: [] }, demoOpening(), 40);

describe('guest demo script', () => {
  it('only mentions agents that exist', () => {
    const ids = new Set(AGENTS.map((a) => a.id));
    expect(DEMO_STEPS.every((s) => ids.has(s.agent))).toBe(true);
  });

  it('opens with a few agents already busy and the rest idle', () => {
    const { agents } = start();
    expect(agents.filter(isWorking).map((a) => a.id)).toEqual(['codex', 'claude', 'nova']);
  });

  it('marks agents working on start and idle on completion, and adds an event each step', () => {
    let state = start();
    const step = DEMO_STEPS.findIndex((s) => s.action === 'completed');
    state = applyRealtimeMessage(state, demoMessage(step), 40);
    expect(isWorking(state.agents.find((a) => a.id === DEMO_STEPS[step].agent))).toBe(false);
    expect(state.events[0]).toMatchObject({ action: 'completed' });
  });

  it('loops forever', () => {
    expect(demoMessage(DEMO_STEPS.length).event.text).toBe(demoMessage(0).event.text);
  });

  it('places the sample schedule on the day asked, in order', () => {
    const events = demoSchedule(new Date(2026, 10, 1));
    expect(events.map((e) => new Date(e.start).getDate())).toEqual([1, 1, 1]);
    expect(events.map((e) => e.start)).toEqual([...events.map((e) => e.start)].sort());
  });
});

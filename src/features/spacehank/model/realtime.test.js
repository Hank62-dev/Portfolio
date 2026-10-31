import { describe, expect, it } from 'vitest';
import { createInitialAgents, isWorking } from './agents';
import { applyRealtimeMessage, toUiEvent } from './realtime';

const fresh = () => ({ agents: createInitialAgents(), events: [] });

describe('applyRealtimeMessage', () => {
  it('merges live status into the fixed roster', () => {
    const next = applyRealtimeMessage(fresh(), { type: 'state', agents: [{ id: 'codex', status: 'working', task: 'Fix bug' }] }, 40);
    const codex = next.agents.find((agent) => agent.id === 'codex');
    expect(codex).toMatchObject({ name: 'Minh Codex', status: 'working', task: 'Fix bug' });
    expect(next.agents).toHaveLength(11);
    expect(isWorking(codex)).toBe(true);
  });

  it('replaces events from a full list and prepends a single new event', () => {
    const at = '2026-01-01T10:00:00.000Z';
    const state = applyRealtimeMessage(fresh(), { type: 'state', events: [{ agent: 'claude', action: 'started', text: 'a', at }] }, 40);
    expect(state.events).toHaveLength(1);
    const next = applyRealtimeMessage(state, { type: 'event', event: { agent: 'codex', action: 'output', text: 'b', at } }, 40);
    expect(next.events.map((event) => event.text)).toEqual(['b', 'a']);
    expect(next.events[0]).toMatchObject({ name: 'Minh Codex', time: 'now' });
  });

  it('caps the event list', () => {
    let state = fresh();
    for (let i = 0; i < 5; i += 1) {
      state = applyRealtimeMessage(state, { type: 'event', event: { agent: 'codex', action: 'output', text: String(i) } }, 3);
    }
    expect(state.events.map((event) => event.text)).toEqual(['4', '3', '2']);
  });

  it('reports task errors without touching state', () => {
    const state = fresh();
    const next = applyRealtimeMessage(state, { type: 'task_error', error: 'Nope' }, 40);
    expect(next.error).toBe('Nope');
    expect(next.agents).toBe(state.agents);
    expect(next.events).toBe(state.events);
  });

  it('falls back to the first agent for an unknown id', () => {
    expect(toUiEvent({ agent: 'ghost', action: 'x', text: 'y' }).name).toBe('Minh Codex');
  });
});

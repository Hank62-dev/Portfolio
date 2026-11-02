import { describe, expect, it } from 'vitest';
import { AGENTS } from './agents';
import { buildCatalog, looksLikeRequest, validate } from './nlcommands';

const tabs = [
  { id: 'hank', label: 'Hank 62' },
  { id: 'music', label: 'Hank Music' },
  { id: 'notes', label: 'Second Brain' },
];
const ctx = { tabs, agents: AGENTS };
const run = (action, params = {}) => validate({ action, params }, ctx);

describe('buildCatalog', () => {
  const catalog = buildCatalog(ctx);
  it('lists every action once with a description, and names the real tabs and agents', () => {
    expect(new Set(catalog.map((a) => a.id)).size).toBe(catalog.length);
    expect(catalog.every((a) => a.description && a.params)).toBe(true);
    expect(catalog.find((a) => a.id === 'navigate').description).toContain('music (Hank Music)');
    expect(catalog.find((a) => a.id === 'dispatch_task').description).toContain('codex (Minh Codex');
  });
  it('has an action for everything validate can accept', () => {
    for (const id of ['navigate', 'dispatch_task', 'focus_agent', 'music', 'play_mood', 'sleep_timer', 'new_note', 'ask_notes', 'search_notes', 'draft_image', 'new_card', 'log_money', 'floor']) {
      expect(catalog.some((a) => a.id === id), id).toBe(true);
    }
  });
});

describe('validate', () => {
  it('turns "none" or nothing into a refusal that carries the explanation', () => {
    expect(validate({ action: 'none', say: 'I cannot do that.' }, ctx)).toEqual({ ok: false, say: 'I cannot do that.' });
    expect(validate(null, ctx).ok).toBe(false);
  });

  it('accepts a tab by id or by its label, and refuses an unknown one', () => {
    expect(run('navigate', { tab: 'music' })).toMatchObject({ ok: true, params: { tab: 'music' } });
    expect(run('navigate', { tab: 'Second Brain' })).toMatchObject({ ok: true, params: { tab: 'notes' } });
    expect(run('navigate', { tab: 'settings' }).ok).toBe(false);
  });

  it('finds an agent by id or name and needs a task to give', () => {
    expect(run('dispatch_task', { agent: 'codex', task: 'fix the login bug' })).toMatchObject({ ok: true, params: { agent: 'codex' } });
    expect(run('dispatch_task', { agent: 'Minh Codex', task: 'x' }).params.agent).toBe('codex');
    expect(run('dispatch_task', { agent: 'nobody', task: 'x' }).ok).toBe(false);
    expect(run('dispatch_task', { agent: 'codex', task: '  ' }).ok).toBe(false);
  });

  it('only allows the music moves it knows', () => {
    expect(run('music', { do: 'Pause' })).toMatchObject({ ok: true, params: { do: 'pause' } });
    expect(run('music', { do: 'format the disk' }).ok).toBe(false);
  });

  it('keeps the sleep timer to 1 to 180 whole minutes', () => {
    expect(run('sleep_timer', { minutes: '29.6' }).params.minutes).toBe(30);
    expect(run('sleep_timer', { minutes: 0 }).ok).toBe(false);
    expect(run('sleep_timer', { minutes: 999 }).ok).toBe(false);
    expect(run('sleep_timer', { minutes: 'soon' }).ok).toBe(false);
  });

  it('needs content for notes, questions, searches, moods and pictures', () => {
    for (const [action, params] of [['new_note', { text: '' }], ['ask_notes', {}], ['search_notes', { query: ' ' }], ['play_mood', {}], ['draft_image', {}]]) {
      expect(run(action, params).ok, action).toBe(false);
    }
    expect(run('new_note', { text: '# Title\nbody' }).params.text).toBe('# Title\nbody');
  });

  it('adds a card, and logs money only when there is an amount', () => {
    expect(run('new_card', { title: ' Fix the login ' })).toMatchObject({ ok: true, params: { title: 'Fix the login' } });
    expect(run('new_card', { title: '' }).ok).toBe(false);
    expect(run('log_money', { text: 'ăn trưa 45k' })).toMatchObject({ ok: true, params: { text: 'ăn trưa 45k' } });
    expect(run('log_money', { text: 'ăn trưa' }).ok).toBe(false);
  });

  it('rejects an action that is not on the list, even if the model insists', () => {
    expect(run('delete_everything', { all: 'yes' }).ok).toBe(false);
    expect(run('__proto__').ok).toBe(false);
  });

  it('describes what it will do in words', () => {
    expect(run('dispatch_task', { agent: 'codex', task: 'fix the login bug' }).describe).toBe('Give Minh Codex the task: “fix the login bug”');
  });
});

describe('looksLikeRequest', () => {
  it('is for sentences, not for a word or two', () => {
    expect(looksLikeRequest('music')).toBe(false);
    expect(looksLikeRequest('go music')).toBe(false);
    expect(looksLikeRequest('play something calm please')).toBe(true);
  });
});

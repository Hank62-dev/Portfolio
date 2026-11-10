import { describe, expect, it, vi } from 'vitest';
import { COMMANDS, complete, parseLine, runLine, tokenize } from './commands';

const ctx = () => ({
  tabs: [{ id: 'music', label: 'Hank Music' }, { id: 'notes', label: 'Second Brain' }],
  agents: [{ id: 'codex', name: 'Minh Codex', status: 'working', task: 'Fix bug' }, { id: 'atlas', name: 'Huy Atlas', status: 'idle', task: '' }],
  go: vi.fn(),
  task: vi.fn(() => true),
  play: vi.fn(async (mood) => (mood ? `Playing a mix for ${mood}` : 'Playing')),
  music: vi.fn(async (move) => `Music: ${move}`),
  note: vi.fn(async () => {}),
  card: vi.fn(async () => {}),
  spend: vi.fn((text) => {
    if (!/\d/.test(text)) throw new Error('I could not find an amount.');
    return `Logged: ${text}`;
  }),
  habits: vi.fn(() => [{ name: 'Read', done: true, streak: 3 }, { name: 'Run', done: false, streak: 0 }]),
  toggleHabit: vi.fn((name) => `Toggled ${name}`),
  search: vi.fn((q) => (q === 'trip' ? [{ title: 'Trip plan' }] : [])),
  ask: vi.fn(async () => 'You fly on 12 December.\nSee [1].'),
  weather: vi.fn(async () => 'Clear, 27°C'),
  now: () => new Date(2026, 10, 2, 9, 30),
});

const run = (line, c = ctx()) => runLine(line, c).then((r) => ({ ...r, text: r.lines.map((l) => l.text) }));

describe('parsing', () => {
  it('splits words and keeps quoted phrases together', () => {
    expect(tokenize('task codex "fix the login bug" now')).toEqual(['task', 'codex', 'fix the login bug', 'now']);
  });
  it('separates the command, its words and the rest of the line', () => {
    expect(parseLine('  NOTE buy milk  ')).toEqual({ name: 'note', args: ['buy', 'milk'], rest: 'buy milk' });
    expect(parseLine('')).toEqual({ name: '', args: [], rest: '' });
  });
  it('completes command names by prefix', () => {
    expect(complete('pa')).toEqual(['pause']);
    expect(complete('')).toHaveLength(COMMANDS.length);
    expect(complete('zz')).toEqual([]);
  });
});

describe('commands', () => {
  it('goes to a tab by id or label, and says when there is none', async () => {
    const c = ctx();
    expect((await run('go music', c)).text).toEqual(['Opening Hank Music']);
    expect(c.go).toHaveBeenCalledWith('music');
    await run('go second', c);
    expect(c.go).toHaveBeenLastCalledWith('notes');
    expect((await run('go nowhere', c)).lines[0].tone).toBe('err');
  });

  it('gives an agent a task, by id or name, and reports a failure', async () => {
    const c = ctx();
    expect((await run('task codex "fix the login bug"', c)).text[0]).toBe('Sent to Minh Codex: fix the login bug');
    expect(c.task).toHaveBeenCalledWith('codex', 'fix the login bug');
    expect((await run('task atlas', c)).lines[0].text).toBe('What should Huy Atlas do?');
    c.task.mockReturnValueOnce(false);
    expect((await run('task codex hi', c)).lines[0].tone).toBe('err');
  });

  it('controls the music', async () => {
    const c = ctx();
    expect((await run('play late night coding', c)).text).toEqual(['Playing a mix for late night coding']);
    expect(c.play).toHaveBeenCalledWith('late night coding');
    expect((await run('pause', c)).text).toEqual(['Music: pause']);
    expect((await run('prev', c)).text).toEqual(['Music: previous']);
  });

  it('saves notes and cards, and refuses empty ones', async () => {
    const c = ctx();
    await run('note remember the milk', c);
    expect(c.note).toHaveBeenCalledWith('remember the milk');
    await run('card Ship the portfolio', c);
    expect(c.card).toHaveBeenCalledWith('Ship the portfolio');
    expect((await run('note', c)).lines[0].tone).toBe('err');
  });

  it('logs spending and turns a failure into a red line', async () => {
    expect((await run('spend ăn trưa 45k')).text).toEqual(['Logged: ăn trưa 45k']);
    expect((await run('spend nothing here')).lines[0]).toEqual({ text: 'I could not find an amount.', tone: 'err' });
  });

  it('lists habits and ticks one', async () => {
    const c = ctx();
    expect((await run('habits', c)).text).toEqual(['[x] Read  3 day streak', '[ ] Run']);
    expect((await run('done run', c)).text).toEqual(['Toggled run']);
  });

  it('searches and asks the notes, one line per line of the answer', async () => {
    const c = ctx();
    expect((await run('search trip', c)).text).toEqual(['- Trip plan']);
    expect((await run('search zebra', c)).text).toEqual(['Nothing found.']);
    expect((await run('ask when do I fly', c)).text).toEqual(['You fly on 12 December.', 'See [1].']);
  });

  it('prints help for every command, clears, and reports the date and weather', async () => {
    expect((await run('help')).lines).toHaveLength(COMMANDS.length);
    expect((await run('clear')).clear).toBe(true);
    expect((await run('weather')).text).toEqual(['Clear, 27°C']);
    expect((await run('date')).text[0]).toContain('2026');
  });

  it('suggests close commands for a typo and never throws', async () => {
    const result = await run('plya');
    expect(result.lines[0].text).toBe('Unknown command: plya');
    expect(result.lines[1].text).toContain('play');
    const broken = ctx();
    broken.weather.mockRejectedValue(new Error('offline'));
    expect((await run('weather', broken)).lines[0]).toEqual({ text: 'offline', tone: 'err' });
    expect(await run('   ')).toMatchObject({ lines: [] });
  });
});

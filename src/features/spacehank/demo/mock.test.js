import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { askNotes, askRag, djPick, generateCards, interpretCommand, listDocuments } from './mock';

// the mock "thinks" for a moment; fake timers make that instant
const run = async (promise) => {
  const done = promise;
  await vi.runAllTimersAsync();
  return done;
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const catalog = ['log_money', 'ask_notes', 'navigate'].map((id) => ({ id }));

describe('interpretCommand', () => {
  it('turns plain sentences into the actions the workspace already knows', async () => {
    expect((await run(interpretCommand({ text: 'ăn trưa 45k', catalog }))).action).toBe('log_money');
    expect(await run(interpretCommand({ text: 'mở ví', catalog }))).toEqual({ action: 'navigate', params: { tab: 'wallet' } });
    expect(await run(interpretCommand({ text: 'phát nhạc tập trung', catalog }))).toEqual({ action: 'play_mood', params: { mood: 'nhạc tập trung' } });
    expect((await run(interpretCommand({ text: 'note: gọi cho Lan', catalog }))).params.text).toBe('gọi cho Lan');
  });

  it('says what it can do when it does not understand', async () => {
    const reply = await run(interpretCommand({ text: 'blorp', catalog }));
    expect(reply.action).toBe('none');
    expect(reply.say).toMatch(/demo/i);
  });
});

describe('djPick', () => {
  it('picks songs whose genre fits the mood, and always returns something', async () => {
    const tracks = [{ id: 'a', title: 'Slow Tide', artist: 'X', genre: 'lofi' }, { id: 'b', title: 'Neon Rain', artist: 'Y', genre: 'synthwave' }];
    expect((await run(djPick({ mood: 'late-night focus', tracks }))).ids[0]).toBe('a');
    expect((await run(djPick({ mood: 'zzz', tracks }))).ids.length).toBeGreaterThan(0);
  });
});

describe('askNotes', () => {
  it('quotes the notes it was given and numbers them', async () => {
    const reply = await run(askNotes({ question: 'design?', notes: [{ title: 'Design tokens', text: 'Design tokens\nColours live in one stylesheet.' }] }));
    expect(reply.answer).toContain('Design tokens');
    expect(reply.cited).toEqual([1]);
  });
  it('admits when there is nothing to quote', async () => {
    expect((await run(askNotes({ question: 'x', notes: [] }))).cited).toEqual([]);
  });
});

describe('generateCards', () => {
  it('makes cards from full sentences and refuses a text with none', async () => {
    const { cards } = await run(generateCards({ text: 'A primary key is a column that identifies each row uniquely. An index is a structure that speeds up reads.' }));
    expect(cards.length).toBe(2);
    expect(cards[0].back).toMatch(/identifies each row/);
    const failure = generateCards({ text: 'hi' });
    failure.catch(() => {});
    await vi.runAllTimersAsync();
    await expect(failure).rejects.toThrow(/sentences/);
  });
});

describe('Hank RAG and the vault', () => {
  it('greets in the language it was greeted in, and cites a document when asked about the vault', async () => {
    expect((await run(askRag({ message: 'xin chào' }))).text).toMatch(/Xin chào/);
    const docs = await run(askRag({ message: 'summarise my documents' }));
    expect(docs.source).toBe('rag');
    expect(docs.citations[0].name).toBeTruthy();
  });
  it('lists a few documents to start with', async () => {
    expect((await run(listDocuments())).length).toBeGreaterThan(1);
  });
});

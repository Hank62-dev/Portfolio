import { describe, expect, it } from 'vitest';
import { groupChats, historyOf, messagesOf, newChat, newMessage, summaryOf, titleFrom } from './model';

describe('a conversation\'s title', () => {
  it('is the first question on one line', () => {
    expect(titleFrom('  How does\n  a delivery\tclear customs? ')).toBe('How does a delivery clear customs?');
  });

  it('is cut at a word, with an ellipsis, when it is long', () => {
    const long = 'Explain the whole procedure for moving a racehorse from the EU to the UK with every document needed';
    const title = titleFrom(long);
    expect(title.endsWith('…')).toBe(true);
    expect(title.length).toBeLessThanOrEqual(61);
    expect(long.startsWith(title.slice(0, -1))).toBe(true);
    expect(title.slice(0, -1).endsWith(' ')).toBe(false);
  });

  it('is empty for nothing', () => {
    expect(titleFrom('   ')).toBe('');
    expect(titleFrom(undefined)).toBe('');
  });
});

describe('a new conversation', () => {
  it('has a title, a session of its own and the time', () => {
    const chat = newChat({ text: 'Hello Hank', sessionPrefix: 'hank62', id: 'c1', now: 1000 });
    expect(chat).toMatchObject({ id: 'c1', title: 'Hello Hank', createdAt: 1000, updatedAt: 1000 });
    expect(chat.sessionId).toMatch(/^hank62-/);
    expect(newChat({ text: 'x', sessionPrefix: 'hank62' }).sessionId).not.toBe(newChat({ text: 'x', sessionPrefix: 'hank62' }).sessionId);
  });

  it('is called "New chat" when the question has no words', () => {
    expect(newChat({ text: '  ', sessionPrefix: 'p' }).title).toBe('New chat');
  });
});

describe('messages', () => {
  it('keep their extras and never share a moment with the one before', () => {
    const a = newMessage({ chatId: 'c1', message: { role: 'user', text: 'hi' }, now: 500, id: 'a' });
    const b = newMessage({ chatId: 'c1', message: { role: 'assistant', text: 'hello', source: 'rag', citations: [{ name: 'x', url: '' }] }, last: a.at, now: 500, id: 'b' });
    expect(a.at).toBe(500);
    expect(b.at).toBe(501);
    expect(b).toMatchObject({ source: 'rag', citations: [{ name: 'x', url: '' }], chatId: 'c1' });
  });

  it('come back oldest first, only the ones of that conversation', () => {
    const all = [
      { id: '3', chatId: 'c1', at: 30, role: 'assistant', text: 'c' },
      { id: '1', chatId: 'c1', at: 10, role: 'user', text: 'a' },
      { id: '9', chatId: 'c2', at: 20, role: 'user', text: 'other' },
      { id: '2', chatId: 'c1', at: 20, role: 'assistant', text: 'b' },
    ];
    expect(messagesOf(all, 'c1').map((m) => m.id)).toEqual(['1', '2', '3']);
    expect(historyOf(all, 'c1')).toEqual([{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }, { role: 'assistant', text: 'c' }]);
    expect(summaryOf(all, 'c1')).toEqual({ count: 3, snippet: 'c' });
    expect(summaryOf(all, 'none')).toEqual({ count: 0, snippet: '' });
  });
});

describe('the list of conversations', () => {
  const noon = new Date(2026, 10, 4, 12).getTime();
  const at = (days, hour = 9) => new Date(2026, 10, 4 - days, hour).getTime();

  it('groups by today, yesterday, the last week and older, newest first, without empty groups', () => {
    const chats = [
      { id: 'old', updatedAt: at(30) },
      { id: 'y', updatedAt: at(1, 22) },
      { id: 't1', updatedAt: at(0, 8) },
      { id: 'w', updatedAt: at(5) },
      { id: 't2', updatedAt: at(0, 11) },
    ];
    expect(groupChats(chats, noon).map((g) => [g.key, g.chats.map((c) => c.id)])).toEqual([
      ['today', ['t2', 't1']],
      ['yesterday', ['y']],
      ['week', ['w']],
      ['older', ['old']],
    ]);
    expect(groupChats([{ id: 'a', updatedAt: at(0, 7) }], noon).map((g) => g.key)).toEqual(['today']);
    expect(groupChats([], noon)).toEqual([]);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { askRag, uploadDocument } from './rag';

const reply = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe('askRag', () => {
  const args = { sessionId: 's1', message: 'hi', mode: 'fast', history: [{ role: 'user', text: 'earlier' }] };

  it('sends the question with history and returns the answer', async () => {
    const fetchMock = vi.fn(() =>
      reply(200, { response: { message: 'hello' }, verification: { is_verified: true }, citations: ['c1'] })
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(askRag(args)).resolves.toEqual({ text: 'hello', verified: true, citations: ['c1'] });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ session_id: 's1', message: 'hi', mode: 'fast', user_id: 'hank62' });
    expect(body.conversation_history).toEqual([{ role: 'user', content: 'earlier' }]);
  });

  it('turns failures into readable errors', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    await expect(askRag(args)).rejects.toThrow('Hank RAG offline.');

    vi.stubGlobal('fetch', () => reply(502, null));
    await expect(askRag(args)).rejects.toThrow('Hank RAG request failed (502)');

    vi.stubGlobal('fetch', () => reply(200, { status: 'error', error: { message: 'quota' } }));
    await expect(askRag(args)).rejects.toThrow('quota');

    vi.stubGlobal('fetch', () => reply(200, { response: {} }));
    await expect(askRag(args)).rejects.toThrow(/^$/);
  });
});

describe('uploadDocument', () => {
  it('returns the number of chunks created', async () => {
    vi.stubGlobal('fetch', () => reply(200, { chunks_created: 7 }));
    const file = new File(['abc'], 'a.txt');
    await expect(uploadDocument({ file, conversationId: 'c' })).resolves.toBe(7);
  });

  it('rejects oversized files before uploading', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const file = { name: 'big.pdf', size: 26 * 1024 * 1024 };
    await expect(uploadDocument({ file, conversationId: 'c' })).rejects.toThrow('larger than 25 MB');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { askRag, deleteDocument, listDocuments, uploadDocument } from './rag';

const reply = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

afterEach(() => vi.unstubAllGlobals());

describe('askRag', () => {
  const args = { sessionId: 's1', message: 'hi', mode: 'fast', history: [{ role: 'user', text: 'earlier' }] };

  it('sends the question with history and returns the answer', async () => {
    const fetchMock = vi.fn(() =>
      reply(200, {
        response: { message: 'hello' },
        verification: { is_verified: true },
        citations: [
          { source_id: 'policy.pdf', source_name: 'policy.pdf' },
          { source_id: 'https://example.com/a', source_name: 'example.com' },
        ],
        metadata: { knowledge_source: 'web' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(askRag(args)).resolves.toEqual({
      text: 'hello',
      verified: true,
      citations: [
        { name: 'policy.pdf', url: '' },
        { name: 'example.com', url: 'https://example.com/a' },
      ],
      source: 'web',
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ session_id: 's1', message: 'hi', mode: 'fast', user_id: 'hank62', web_search: 'auto' });
    expect(body.conversation_history).toEqual([{ role: 'user', content: 'earlier' }]);
  });

  it('passes the web choice on', async () => {
    const fetchMock = vi.fn(() => reply(200, { response: { message: 'ok' } }));
    vi.stubGlobal('fetch', fetchMock);
    await askRag({ ...args, web: 'off' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).web_search).toBe('off');
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

describe('the shared library', () => {
  it('lists documents from the library scope', async () => {
    const fetchMock = vi.fn(() => reply(200, { documents: [{ id: 'd1', name: 'a.pdf', chunks: 3 }] }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(listDocuments()).resolves.toEqual([{ id: 'd1', name: 'a.pdf', chunks: 3 }]);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/docs\/hank62-library$/);
  });

  it('deletes one document and reports failures', async () => {
    const fetchMock = vi.fn(() => reply(200, { deleted_chunks: 3 }));
    vi.stubGlobal('fetch', fetchMock);
    await deleteDocument('d1');
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/docs\/hank62-library\/d1$/);
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
    vi.stubGlobal('fetch', () => reply(500, null));
    await expect(deleteDocument('d1')).rejects.toThrow('Could not delete');
  });
});

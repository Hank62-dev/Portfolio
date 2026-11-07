import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The Hank RAG service answers only a request that carries a ticket from the realtime server. Each test starts with a fresh
// copy of the module, because the ticket in hand is kept in it.

const reply = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

let ragTicket;
let rag;

beforeEach(async () => {
  vi.resetModules();
  ragTicket = vi.fn();
  vi.doMock('./owner', () => ({ ragTicket }));
  rag = await import('./rag');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('./owner');
});

describe('asking the RAG service', () => {
  it('shows the ticket on every request, and fetches one only when needed', async () => {
    ragTicket.mockResolvedValue({ enabled: true, token: 'ticket-1', expiresIn: 900 });
    const fetchMock = vi.fn(() => reply(200, { documents: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await rag.listDocuments();
    await rag.listDocuments();
    await rag.deleteDocument('d1');
    expect(ragTicket).toHaveBeenCalledTimes(1);
    for (const [, init] of fetchMock.mock.calls) expect(init.headers.Authorization).toBe('Bearer ticket-1');
  });

  it('gets a new ticket and tries again when the service refuses the one it holds', async () => {
    ragTicket.mockResolvedValueOnce({ enabled: true, token: 'old', expiresIn: 900 }).mockResolvedValueOnce({ enabled: true, token: 'new', expiresIn: 900 });
    const fetchMock = vi.fn((url, init) => (init.headers.Authorization === 'Bearer new' ? reply(200, { documents: [{ id: 'd', name: 'a', chunks: 1 }] }) : reply(401, { detail: 'A valid ticket is required.' })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(rag.listDocuments()).resolves.toEqual([{ id: 'd', name: 'a', chunks: 1 }]);
    expect(fetchMock.mock.calls.map(([, init]) => init.headers.Authorization)).toEqual(['Bearer old', 'Bearer new']);
  });

  it('gives up with the service’s own message when even a new ticket is refused', async () => {
    ragTicket.mockResolvedValue({ enabled: true, token: 'bad', expiresIn: 900 });
    vi.stubGlobal('fetch', vi.fn(() => reply(401, { detail: 'A valid ticket is required.' })));
    await expect(rag.listDocuments()).rejects.toThrow('A valid ticket is required.');
    expect(ragTicket).toHaveBeenCalledTimes(2);
  });

  it('works without any ticket when the service is not protected, and does not ask for one on every request', async () => {
    ragTicket.mockResolvedValue({ enabled: false, token: '', expiresIn: 0 });
    const fetchMock = vi.fn(() => reply(200, { documents: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await rag.listDocuments();
    await rag.listDocuments();
    expect(ragTicket).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.headers?.Authorization).toBeUndefined();
  });

  it('still tries the service when the realtime server cannot be reached for a ticket', async () => {
    ragTicket.mockRejectedValue(new Error('unreachable'));
    const fetchMock = vi.fn(() => reply(200, { documents: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(rag.listDocuments()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

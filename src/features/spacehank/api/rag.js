import { spacehankConfig } from '../config';
import { ragTicket } from './owner';
import { isDemo } from '../demo/mode';
import * as demo from '../demo/mock';
import { tr } from '../lang';

const { ragApiUrl, ragUserId, maxUploadBytes } = spacehankConfig;

// The RAG service answers only a request with a ticket from the realtime server (which knows the owner is signed in). A ticket lasts
// a quarter of an hour; one is fetched when none is held, and again if the service says the one held is no good.
let held = { token: '', until: 0 };
const ticket = async (fresh = false) => {
  if (!fresh && held.until > Date.now() + 60 * 1000) return held.token;
  const given = await ragTicket();
  // when the service is not protected (no secret set) there is no ticket: ask again in a few minutes, not for every request
  held = { token: given.token || '', until: Date.now() + (given.enabled ? given.expiresIn * 1000 : 5 * 60 * 1000) };
  return held.token;
};

/** A fetch to the RAG service that carries a ticket (when there is one) and tries once more with a new one if it is refused. */
const reach = async (path, init = {}) => {
  const attempt = async (fresh) => {
    const token = await ticket(fresh).catch(() => '');
    return fetch(`${ragApiUrl}${path}`, token ? { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } } : init);
  };
  const response = await attempt(false);
  return response.status === 401 ? attempt(true) : response;
};

/** POST to the RAG service, mapping network failures and non-JSON error pages to readable errors. */
const post = async (path, init) => {
  let response;
  try {
    response = await reach(path, { method: 'POST', ...init });
  } catch {
    throw new Error(tr('Hank RAG offline.'));
  }
  const data = (await response.json().catch(() => null)) ?? {};
  return { response, data };
};

const isLink = (value) => /^https?:\/\//i.test(value ?? '');

/** A citation from the service as { name, url }: a web page has a link, a document does not. */
const toSource = (citation) => {
  if (typeof citation === 'string') return { name: citation, url: '' };
  const id = citation?.source_id ?? '';
  return { name: citation?.source_name || id, url: isLink(id) ? id : '' };
};

/**
 * Asks Hank a question. `web` is 'auto' (search when the question needs it), 'on' or 'off'.
 * Resolves to { text, verified, citations: [{name, url}], source } where source says where the answer came
 * from: 'rag' (your documents), 'web' or 'general_knowledge'.
 * An empty answer throws an Error with an empty message so the caller can show its own copy.
 */
export const askRag = async ({ sessionId, message, mode, history, web = 'auto' }) => {
  if (isDemo()) return demo.askRag({ message, web });
  const { response, data } = await post('/api/chat', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: crypto.randomUUID(),
      user_id: ragUserId,
      session_id: sessionId,
      message,
      mode,
      web_search: web,
      conversation_history: history.map(({ role, text }) => ({ role, content: text })),
    }),
  });
  if (!response.ok) {
    throw new Error(data.detail || data.error?.message || tr('Hank RAG request failed ({0})', response.status));
  }
  if (data.status === 'error' || !data.response?.message) throw new Error(data.error?.message || '');
  return {
    text: data.response.message,
    verified: Boolean(data.verification?.is_verified),
    citations: (data.citations || []).map(toSource).filter((source) => source.name),
    source: data.metadata?.knowledge_source ?? '',
  };
};

/** The documents in the shared library: [{ id, name, chunks }]. */
export const listDocuments = async (scope = spacehankConfig.libraryScope) => {
  if (isDemo()) return demo.listDocuments();
  let response;
  try {
    response = await reach(`/api/docs/${encodeURIComponent(scope)}`);
  } catch {
    throw new Error(tr('Hank RAG offline.'));
  }
  const data = (await response.json().catch(() => null)) ?? {};
  if (!response.ok) throw new Error(data.detail || tr('Could not load documents ({0})', response.status));
  return data.documents ?? [];
};

/** Removes one document from the shared library. */
export const deleteDocument = async (docId, scope = spacehankConfig.libraryScope) => {
  if (isDemo()) return demo.deleteDocument(docId);
  let response;
  try {
    response = await reach(`/api/docs/${encodeURIComponent(scope)}/${encodeURIComponent(docId)}`, { method: 'DELETE' });
  } catch {
    throw new Error(tr('Hank RAG offline.'));
  }
  if (!response.ok) throw new Error(tr('Could not delete the document ({0})', response.status));
};

/** Uploads one document into the RAG index. Resolves to the number of chunks created. */
export const uploadDocument = async ({ file, conversationId }) => {
  if (file.size > maxUploadBytes) throw new Error(tr('{0} is larger than {1} MB.', file.name, maxUploadBytes / 1024 / 1024));
  if (isDemo()) return demo.uploadDocument({ file });
  const form = new FormData();
  form.append('file', file);
  form.append('conversation_id', conversationId);
  const { response, data } = await post('/api/test/upload', { body: form });
  if (!response.ok) throw new Error(data.detail || tr('Upload failed ({0})', response.status));
  return data.chunks_created ?? data.chunks ?? 0;
};

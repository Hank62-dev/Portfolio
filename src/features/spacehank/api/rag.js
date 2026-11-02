import { spacehankConfig } from '../config';
import { isDemo } from '../demo/mode';
import * as demo from '../demo/mock';

const { ragApiUrl, ragUserId, maxUploadBytes } = spacehankConfig;

/** POST to the RAG service, mapping network failures and non-JSON error pages to readable errors. */
const post = async (path, init) => {
  let response;
  try {
    response = await fetch(`${ragApiUrl}${path}`, { method: 'POST', ...init });
  } catch {
    throw new Error('Hank RAG offline.');
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
    throw new Error(data.detail || data.error?.message || `Hank RAG request failed (${response.status})`);
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
    response = await fetch(`${ragApiUrl}/api/docs/${encodeURIComponent(scope)}`);
  } catch {
    throw new Error('Hank RAG offline.');
  }
  const data = (await response.json().catch(() => null)) ?? {};
  if (!response.ok) throw new Error(data.detail || `Could not load documents (${response.status})`);
  return data.documents ?? [];
};

/** Removes one document from the shared library. */
export const deleteDocument = async (docId, scope = spacehankConfig.libraryScope) => {
  if (isDemo()) return demo.deleteDocument(docId);
  let response;
  try {
    response = await fetch(`${ragApiUrl}/api/docs/${encodeURIComponent(scope)}/${encodeURIComponent(docId)}`, { method: 'DELETE' });
  } catch {
    throw new Error('Hank RAG offline.');
  }
  if (!response.ok) throw new Error(`Could not delete the document (${response.status})`);
};

/** Uploads one document into the RAG index. Resolves to the number of chunks created. */
export const uploadDocument = async ({ file, conversationId }) => {
  if (file.size > maxUploadBytes) throw new Error(`${file.name} is larger than ${maxUploadBytes / 1024 / 1024} MB.`);
  if (isDemo()) return demo.uploadDocument({ file });
  const form = new FormData();
  form.append('file', file);
  form.append('conversation_id', conversationId);
  const { response, data } = await post('/api/test/upload', { body: form });
  if (!response.ok) throw new Error(data.detail || `Upload failed (${response.status})`);
  return data.chunks_created ?? data.chunks ?? 0;
};

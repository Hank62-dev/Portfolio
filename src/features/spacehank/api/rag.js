import { spacehankConfig } from '../config';

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

/**
 * Asks Hank RAG a question. Resolves to { text, verified, citations }.
 * An empty answer throws an Error with an empty message so the caller can show its own copy.
 */
export const askRag = async ({ sessionId, message, mode, history }) => {
  const { response, data } = await post('/api/chat', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: crypto.randomUUID(),
      user_id: ragUserId,
      session_id: sessionId,
      message,
      mode,
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
    citations: data.citations || [],
  };
};

/** Uploads one document into the RAG index. Resolves to the number of chunks created. */
export const uploadDocument = async ({ file, conversationId }) => {
  if (file.size > maxUploadBytes) throw new Error(`${file.name} is larger than ${maxUploadBytes / 1024 / 1024} MB.`);
  const form = new FormData();
  form.append('file', file);
  form.append('conversation_id', conversationId);
  const { response, data } = await post('/api/test/upload', { body: form });
  if (!response.ok) throw new Error(data.detail || `Upload failed (${response.status})`);
  return data.chunks_created ?? data.chunks ?? 0;
};

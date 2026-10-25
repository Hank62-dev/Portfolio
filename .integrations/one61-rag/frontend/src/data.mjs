export const STORAGE_KEY = 'one61.workspace.v1';

export function newConversation() {
  return { id: crypto.randomUUID(), title: 'Cuộc trò chuyện mới', messages: [], documents: [] };
}

export function loadWorkspace(raw) {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string'
      && Array.isArray(item.messages) && item.messages.every(m => m && typeof m.id === 'string'
        && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string')
      && Array.isArray(item.documents) && item.documents.every(d => d && typeof d.filename === 'string'));
  } catch {
    return [];
  }
}

export async function requestJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') throw error;
    throw new Error('Chưa kết nối được máy chủ. Kiểm tra dịch vụ tại cổng 8000 rồi thử lại.');
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ. Hãy thử lại sau.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Máy chủ trả về dữ liệu không hợp lệ. Hãy thử lại sau.');
  if (!response.ok || data.status === 'error') {
    throw new Error(typeof data.detail === 'string' ? data.detail : data.error?.message || `Yêu cầu thất bại (${response.status}).`);
  }
  return data;
}

export async function requestChat(sessionId, message, mode, history, signal) {
  const data = await requestJson('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      request_id: crypto.randomUUID(), user_id: 'workspace', session_id: sessionId, message, mode,
      conversation_history: history.filter(m => !m.error).map(m => ({ role: m.role, content: m.text })),
    }),
  });
  if (typeof data.response?.message !== 'string') throw new Error('Phản hồi từ trợ lý không hợp lệ. Hãy thử lại.');
  return data;
}

export function validateFile(file) {
  if (!file.size) return 'Tài liệu trống. Hãy chọn tệp có nội dung.';
  if (file.size > 25 * 1024 * 1024) return 'Tài liệu vượt quá giới hạn 25 MB.';
  if (!/\.(pdf|docx|txt|md|csv|json)$/i.test(file.name)) return 'Hỗ trợ PDF, DOCX, TXT, MD, CSV và JSON.';
  return '';
}

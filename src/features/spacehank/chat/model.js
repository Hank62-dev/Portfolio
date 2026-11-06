import { tr } from '../lang';
// Hank RAG conversations as plain data. A conversation is one small record (`chats`: title, the session the RAG server remembers it by)
// and every message is a record of its own (`chatMsgs`): a message is written once and never changed, so two devices that both
// chat in the same conversation simply add to it, and a long conversation never outgrows the size limit of a record.

export const TITLE_MAX = 60;

/** A title from the first question: one line, trimmed, cut at a word when it is long. */
export const titleFrom = (text) => {
  const line = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (line.length <= TITLE_MAX) return line;
  const cut = line.slice(0, TITLE_MAX);
  const at = cut.lastIndexOf(' ');
  return `${(at > TITLE_MAX * 0.5 ? cut.slice(0, at) : cut).trim()}…`;
};

/** The record of a new conversation. `sessionId` is what the RAG server keeps its memory of the conversation under. */
export const newChat = ({ text, sessionPrefix, id = crypto.randomUUID(), now = Date.now() }) => ({
  id,
  title: titleFrom(text) || tr('New chat'),
  sessionId: `${sessionPrefix}-${crypto.randomUUID()}`,
  createdAt: now,
  updatedAt: now,
});

/**
 * The record of one message. `at` only ever grows within a conversation (a message is never stamped the same moment as the one
 * before), which is what keeps them in order.
 */
export const newMessage = ({ chatId, message, last = 0, now = Date.now(), id = crypto.randomUUID() }) => {
  const { role, text, ...extra } = message;
  return { id, chatId, role, text, ...extra, at: Math.max(now, last + 1) };
};

/** A conversation's messages, oldest first. */
export const messagesOf = (messages, chatId) => messages.filter((m) => m.chatId === chatId).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));

/** The same, as the RAG service wants the earlier turns: [{ role, text }]. */
export const historyOf = (messages, chatId) => messagesOf(messages, chatId).map(({ role, text }) => ({ role, text }));

/** How many messages and the last words, for the list: { count, snippet }. */
export const summaryOf = (messages, chatId) => {
  const own = messagesOf(messages, chatId);
  const last = own.at(-1);
  return { count: own.length, snippet: last ? last.text.replace(/\s+/g, ' ').trim().slice(0, 90) : '' };
};

const startOfDay = (time) => {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
};
const DAY = 24 * 60 * 60 * 1000;

/** Conversations, newest first, grouped for the list: [{ key: 'today' | 'yesterday' | 'week' | 'older', chats }] (empty groups left out). */
export const groupChats = (chats, now = Date.now()) => {
  const today = startOfDay(now);
  const groups = { today: [], yesterday: [], week: [], older: [] };
  for (const chat of [...chats].sort((a, b) => b.updatedAt - a.updatedAt)) {
    const when = chat.updatedAt;
    if (when >= today) groups.today.push(chat);
    else if (when >= today - DAY) groups.yesterday.push(chat);
    else if (when >= today - 7 * DAY) groups.week.push(chat);
    else groups.older.push(chat);
  }
  return Object.entries(groups)
    .filter(([, list]) => list.length)
    .map(([key, list]) => ({ key, chats: list }));
};

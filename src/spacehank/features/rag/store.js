import { askRag } from '../../core/api/rag';
import { createCollection } from '../../core/collections';
import { spacehankConfig } from '../../core/config';
import { createStore } from '../../core/store';
import { historyOf, messagesOf, newChat, newMessage } from './model';

// Hank RAG's conversations, kept on this device and (when sync is on) on the owner's other devices. Everything that happens to a
// conversation happens here, not in the screen: an answer that arrives after the owner has gone to another tab is still saved.

export const chats = createCollection('chats', { order: (a, b) => b.updatedAt - a.updatedAt });
export const chatMsgs = createCollection('chatMsgs', { order: (a, b) => a.at - b.at });

const ACTIVE = 'hank62.rag.chat'; // which conversation is open: a choice of this device, not shared
const HISTORY_TURNS = 20; // how many earlier messages ride along with a question

const readActive = () => {
  try {
    return localStorage.getItem(ACTIVE) || null;
  } catch {
    return null;
  }
};
const writeActive = (id) => {
  try {
    if (id) localStorage.setItem(ACTIVE, id);
    else localStorage.removeItem(ACTIVE);
  } catch {
    /* the open conversation is simply not remembered */
  }
};

/** active: the open conversation's id (null: a new one, made when the first question is sent); thinking: ids waiting for an answer; errors: id -> message. */
export const view = createStore({ active: readActive(), thinking: [], errors: {} });

export const loadChats = () => Promise.all([chats.load(), chatMsgs.load()]);

export const openChat = (id) => {
  view.set({ active: id });
  writeActive(id);
};
export const startNewChat = () => openChat(null);

const find = (id) => chats.store.get().items.find((c) => c.id === id);

const addMessage = async (chatId, message) => {
  const own = messagesOf(chatMsgs.store.get().items, chatId);
  const record = newMessage({ chatId, message, last: own.at(-1)?.at ?? 0 });
  await chatMsgs.put(record);
  await chats.update(chatId, {}); // brings the conversation to the top of the list
  return record;
};

const withoutError = (errors, id) => {
  const { [id]: gone, ...rest } = errors; // eslint-disable-line no-unused-vars -- only the others are kept
  return rest;
};

/**
 * Sends a question in the open conversation (starting one if none is open) and keeps the answer. Resolves to the conversation's id,
 * or undefined when that conversation is already waiting for an answer. With `retry`, `text` is the last question again, which is
 * already in the conversation: it is asked once more instead of being added a second time.
 */
export const askHank = async ({ text, mode, web, retry = false }) => {
  let chat = find(view.get().active);
  if (!chat) {
    chat = await chats.put(newChat({ text, sessionPrefix: spacehankConfig.sessionPrefix }));
    openChat(chat.id);
  }
  const { id, sessionId } = chat;
  if (view.get().thinking.includes(id)) return undefined;

  const earlier = historyOf(chatMsgs.store.get().items, id);
  const history = (retry ? earlier.slice(0, -1) : earlier).slice(-HISTORY_TURNS);
  // "thinking" first, so the screen never shows the question as unanswered between saving it and asking
  view.set((s) => ({ thinking: [...s.thinking, id], errors: withoutError(s.errors, id) }));
  try {
    if (!retry) await addMessage(id, { role: 'user', text });
    const answer = await askRag({ sessionId, message: text, mode, web, history });
    if (find(id)) await addMessage(id, { role: 'assistant', ...answer }); // not if it was deleted while Hank was thinking
  } catch (error) {
    view.set((s) => ({ errors: { ...s.errors, [id]: error.message || '' } }));
  } finally {
    view.set((s) => ({ thinking: s.thinking.filter((x) => x !== id) }));
  }
  return id;
};

export const renameChat = async (id, title) => {
  const clean = String(title ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (clean) await chats.update(id, { title: clean });
};

/** Removes a conversation and all its messages (on the other devices too). */
export const deleteChat = async (id) => {
  const own = messagesOf(chatMsgs.store.get().items, id);
  await Promise.all(own.map((m) => chatMsgs.remove(m.id)));
  await chats.remove(id);
  if (view.get().active === id) openChat(null);
};

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUp, BookOpen, BrainCircuit, Check, Copy, FileSearch, Gauge, Globe, History, Lightbulb, Newspaper, SquarePen } from 'lucide-react';
import { Badge, Dots, Loading, Ring, Skeleton, TextShimmer } from '../../../design-system';
import { clsx } from '../../../lib/format';
import ChatHistory from '../chat/ChatHistory';
import { messagesOf } from '../chat/model';
import { askHank, chatMsgs, chats, loadChats, startNewChat, view } from '../chat/store';
import Markdown from '../components/Markdown';
import { useStore } from '../store';
import { tr } from '../lang';
import '../i18n';

const MAX_COMPOSER_HEIGHT = 200;

/** A soft, slowly turning orb: Hank's face. It breathes faster while it is thinking. */
function Orb({ busy, size = 40 }) {
  return (
    <span
      className={clsx('relative inline-block shrink-0 rounded-full', busy ? 'animate-[orb_1.6s_ease-in-out_infinite]' : 'animate-[orb_5s_ease-in-out_infinite]')}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 30% 28%, #ffd2bd, #ff7a4d 38%, #8a3bff 78%, #2b1a66)',
        boxShadow: '0 0 40px -6px rgb(255 91 46 / 0.65), inset -6px -8px 14px rgb(0 0 0 / 0.35)',
      }}
      aria-hidden="true"
    />
  );
}

// where an answer came from, shown under it
const ORIGINS = {
  rag: { icon: FileSearch, key: 'rag.fromDocs' },
  web: { icon: Globe, key: 'rag.fromWeb' },
  general_knowledge: { icon: Lightbulb, key: 'rag.fromKnowledge' },
};

const WEB_CHOICES = [
  ['auto', 'rag.webAuto'],
  ['on', 'rag.webOn'],
  ['off', 'rag.webOff'],
];

const chip = 'inline-flex max-w-[16rem] items-center gap-1 truncate rounded-full border border-line px-2.5 py-0.5 font-mono text-[0.68rem] text-bone-dim';

function Message({ message, onCopy }) {
  const { t } = useTranslation();
  const mine = message.role === 'user';
  const Origin = ORIGINS[message.source]?.icon;
  const seen = new Set();
  const sources = (message.citations ?? []).filter((c) => !seen.has(c.name) && seen.add(c.name));
  if (mine) {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-3xl rounded-br-lg bg-bone px-4 py-2.5 text-fine leading-relaxed text-ink-0">{message.text}</p>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <Orb size={32} />
      <div className="min-w-0 flex-1">
        <div className="rounded-3xl rounded-tl-lg border border-wash/8 bg-wash/[0.04] px-5 py-4 text-bone backdrop-blur">
          <Markdown>{message.text}</Markdown>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
          {Origin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-wash/[0.06] px-2.5 py-0.5 font-mono text-[0.68rem] text-bone-dim">
              <Origin size={11} aria-hidden="true" /> {t(ORIGINS[message.source].key)}
            </span>
          )}
          {message.verified && (
            <Badge tone="ok">
              <Check size={12} aria-hidden="true" /> {tr('Sources verified')}
            </Badge>
          )}
          {sources.slice(0, 5).map((source) =>
            source.url ? (
              <a key={source.name} href={source.url} target="_blank" rel="noopener noreferrer" className={clsx(chip, 'transition-colors hover:border-signal/60 hover:text-bone')}>
                <Globe size={11} className="shrink-0" aria-hidden="true" /> <span className="truncate">{source.name}</span>
              </a>
            ) : (
              <span key={source.name} className={chip}>
                <FileSearch size={11} className="shrink-0" aria-hidden="true" /> <span className="truncate">{source.name}</span>
              </span>
            )
          )}
          <button type="button" onClick={() => onCopy(message.text)} aria-label={tr('Copy the answer')} className="ml-auto grid size-7 place-items-center rounded-full text-bone-faint transition-colors hover:bg-wash/8 hover:text-bone">
            <Copy size={13} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RagView() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('fast');
  const [web, setWeb] = useState('auto');
  const [historyOpen, setHistoryOpen] = useState(false);
  const composerRef = useRef(null);
  const endRef = useRef(null);

  // The conversation lives in the store, not here: leave the tab and come back, reload the page, or open it on another device,
  // and it is all still there (and an answer that was still on its way arrives where it belongs).
  const { items: chatList, loaded: chatsLoaded } = useStore(chats.store);
  const { items: allMessages, loaded: messagesLoaded } = useStore(chatMsgs.store);
  const { active, thinking, errors } = useStore(view);
  const chat = chatList.find((c) => c.id === active) ?? null;
  const messages = useMemo(() => (chat ? messagesOf(allMessages, chat.id) : []), [allMessages, chat]);
  const ready = chatsLoaded && messagesLoaded;
  const busy = Boolean(chat) && thinking.includes(chat.id);
  const error = chat && errors[chat.id] !== undefined ? errors[chat.id] || t('rag.error') : '';

  useEffect(() => {
    void loadChats();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, busy, chat?.id]);

  const grow = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  };
  const setComposer = (value) => {
    setQuery(value);
    requestAnimationFrame(() => grow(composerRef.current));
  };

  const ask = (event) => {
    event?.preventDefault();
    const text = query.trim();
    if (!text || busy || !ready) return;
    setQuery('');
    if (composerRef.current) composerRef.current.style.height = 'auto';
    void askHank({ text, mode, web });
  };

  // the last question has no answer (the page was closed while Hank was thinking, or the request failed): it can be asked again
  const last = messages.at(-1);
  const unanswered = last?.role === 'user' && !busy && ready ? last.text : '';
  const retry = () => void askHank({ text: unanswered, mode, web, retry: true });

  const newChat = () => {
    startNewChat();
    setComposer('');
    composerRef.current?.focus();
  };

  const submitOnEnter = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form.requestSubmit();
    }
  };

  const ideas = [
    { icon: BookOpen, label: t('rag.promptDocs'), text: t('rag.askDocs') },
    { icon: Newspaper, label: t('rag.promptNews'), text: t('rag.askNews') },
    { icon: Lightbulb, label: t('rag.promptExplain'), text: t('rag.askExplain') },
  ];

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-11rem)] w-full max-w-[860px] flex-col">
      <div className="pointer-events-none absolute -top-10 left-1/2 h-72 w-[min(720px,100%)] -translate-x-1/2 bg-[radial-gradient(50%_60%_at_50%_0%,rgb(255_91_46/0.16),transparent),radial-gradient(40%_50%_at_80%_20%,rgb(91_43_255/0.14),transparent)] blur-2xl" aria-hidden="true" />

      <header className="relative flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex w-full items-center gap-2" data-chat-bar>
          <button type="button" onClick={() => setHistoryOpen(true)} aria-label={t('rag.history')} title={t('rag.history')} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-ink-1/80 px-3 font-mono text-[0.78rem] text-bone-dim backdrop-blur transition-colors hover:text-bone" data-open-history>
            <History size={14} aria-hidden="true" /> <span className="max-sm:sr-only">{t('rag.history')}</span>
          </button>
          <button type="button" onClick={newChat} aria-label={t('rag.newChat')} title={t('rag.newChat')} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-ink-1/80 px-3 font-mono text-[0.78rem] text-bone-dim backdrop-blur transition-colors hover:text-bone disabled:opacity-40" disabled={!chat} data-new-chat>
            <SquarePen size={14} aria-hidden="true" /> <span className="max-sm:sr-only">{t('rag.newChat')}</span>
          </button>
          <span className="flex min-w-0 flex-1 items-center gap-2.5 font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint uppercase" data-chat-title>
            <i className="size-1.5 shrink-0 animate-pulse rounded-full bg-ok" aria-hidden="true" /> <span className="truncate">{chat ? chat.title : t('rag.channel')}</span>
          </span>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
          <div className="flex min-w-0 flex-1 items-center rounded-full border border-line bg-ink-1/80 p-1 backdrop-blur sm:flex-none" role="radiogroup" aria-label={t('rag.web')}>
            <Globe size={13} className="mr-1 ml-2 text-bone-faint max-sm:hidden" aria-hidden="true" />
            {WEB_CHOICES.map(([id, key]) => (
              <button key={id} type="button" role="radio" aria-checked={web === id} onClick={() => setWeb(id)} className={clsx('whitespace-nowrap max-sm:flex-1 rounded-full px-2.5 py-1 font-mono text-[0.78rem] transition-colors max-sm:px-1.5 max-sm:text-[0.74rem]', web === id ? 'bg-bone text-ink-0' : 'text-bone-dim hover:text-bone')}>
                {t(key)}
              </button>
            ))}
          </div>
        <div className="flex shrink-0 rounded-full border border-line bg-ink-1/80 p-1 backdrop-blur sm:flex-none" role="radiogroup" aria-label={tr('Retrieval mode')}>
          {[
            ['fast', t('rag.fast'), Gauge],
            ['reasoning', t('rag.deep'), BrainCircuit],
          ].map(([id, label, Icon]) => (
            <button key={id} type="button" role="radio" aria-checked={mode === id} aria-label={label} title={label} onClick={() => setMode(id)} className={clsx('whitespace-nowrap max-sm:size-8 max-sm:justify-center max-sm:px-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[0.78rem] transition-colors', mode === id ? 'bg-bone text-ink-0' : 'text-bone-dim hover:text-bone')}>
              <Icon size={13} aria-hidden="true" /> <span className="max-sm:sr-only">{label}</span>
            </button>
          ))}
        </div>
        </div>
      </header>

      <div className="relative flex flex-1 flex-col gap-5 pb-4" aria-live="polite">
        {!ready ? (
          <Loading label={tr('Loading')} className="flex flex-col gap-4 py-6">
            <Skeleton className="h-10 w-2/3 rounded-3xl" />
            <Skeleton className="h-24 w-full rounded-3xl" />
          </Loading>
        ) : messages.length === 0 ? (
          <div className="m-auto flex w-full max-w-xl flex-col items-center gap-6 py-10 text-center">
            <Orb size={84} busy={busy} />
            <div>
              <h1 className="font-display text-h2 leading-[1.05] text-bone">{t('rag.welcomeTitle')}</h1>
              <p className="mt-2 text-bone-dim">{t('rag.welcomeText')}</p>
            </div>
            <div className="grid grid-cols-1 w-full gap-2.5 sm:grid-cols-3">
              {ideas.map(({ icon: Icon, label, text }) => (
                <button key={label} type="button" onClick={() => setComposer(text)} className="group flex items-center gap-3 rounded-2xl border border-wash/8 bg-wash/[0.04] p-4 text-left backdrop-blur transition-all hover:-translate-y-0.5 hover:border-signal/40 hover:bg-wash/[0.07]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-signal-soft text-signal">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="text-fine font-medium text-bone">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => <Message key={`${message.role}-${index}`} message={message} onCopy={(text) => navigator.clipboard?.writeText(text)} />)
        )}

        {busy && (
          <div className="flex items-center gap-3">
            <Orb size={32} busy />
            <span className="flex items-center gap-1.5 rounded-full border border-wash/8 bg-wash/[0.04] px-4 py-2.5 font-mono text-fine text-bone-dim" role="status">
              <Dots size={6} className="text-signal" />
              <TextShimmer className="pl-1.5">{t('rag.thinking')}</TextShimmer>
            </span>
          </div>
        )}
        {(error || unanswered) && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 font-mono text-fine text-danger" role="alert" data-unanswered>
            <span className="min-w-0 flex-1">{error || t('rag.noAnswer')}</span>
            {unanswered && (
              <button type="button" onClick={retry} className="shrink-0 rounded-full border border-danger/50 px-3 py-1 text-[0.78rem] transition-colors hover:bg-danger/15" data-retry>
                {t('rag.retry')}
              </button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={ask} className="sticky bottom-24 z-10 flex items-end gap-2 rounded-[1.75rem] border border-wash/10 bg-ink-1/80 p-2 pl-5 shadow-[0_20px_60px_-20px_rgb(var(--shadow-rgb)/0.9)] backdrop-blur-xl focus-within:border-signal/50 md:bottom-6">
        <textarea
          ref={composerRef}
          aria-label={t('rag.placeholder')}
          value={query}
          onChange={(event) => setComposer(event.target.value)}
          onKeyDown={submitOnEnter}
          placeholder={t('rag.placeholder')}
          rows={1}
          className="max-h-[200px] min-h-[44px] flex-1 resize-none self-center bg-transparent py-3 text-body text-bone placeholder:text-bone-faint focus-visible:outline-none"
        />
        <button
          type="submit"
          aria-label={tr('Send question')}
          disabled={busy || !query.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-signal to-[#ff8a5c] text-ink-0 shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-35"
        >
          {busy ? <Ring size={20} thickness={3} /> : <ArrowUp size={19} strokeWidth={2.4} aria-hidden="true" />}
        </button>
      </form>
      <ChatHistory open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}

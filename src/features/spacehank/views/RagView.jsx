import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, BrainCircuit, Check, ChevronDown, Gauge, Send, Sparkles } from 'lucide-react';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Eyebrow, Menu, Spinner, Textarea } from '../../../design-system';
import { clsx } from '../../../lib/format';
import { askRag } from '../api/rag';
import Markdown from '../components/Markdown';
import { owner, spacehankConfig } from '../config';
import '../i18n';

const MAX_COMPOSER_HEIGHT = 220;

export default function RagView() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('fast');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const composerRef = useRef(null);
  const sessionId = useRef(`${spacehankConfig.sessionPrefix}-${crypto.randomUUID()}`);

  const modeLabel = mode === 'fast' ? t('rag.fast') : t('rag.deep');

  const setComposer = (value) => {
    setQuery(value);
    requestAnimationFrame(() => {
      const el = composerRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
    });
  };

  const ask = async (event) => {
    event.preventDefault();
    const text = query.trim();
    if (!text || busy) return;
    setQuery('');
    if (composerRef.current) composerRef.current.style.height = 'auto';
    setError('');
    setMessages((old) => [...old, { role: 'user', text }]);
    setBusy(true);
    try {
      const answer = await askRag({ sessionId: sessionId.current, message: text, mode, history: messages });
      setMessages((old) => [...old, { role: 'assistant', ...answer }]);
    } catch (requestError) {
      setError(requestError.message || t('rag.error'));
    } finally {
      setBusy(false);
    }
  };

  const submitOnEnter = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form.requestSubmit();
    }
  };

  const prompts = [
    { label: t('rag.promptSummary'), text: t('rag.askSummary') },
    { label: t('rag.promptPolicy'), text: t('rag.askPolicy') },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow className="flex items-center gap-2">
          <i className="size-1.5 shrink-0 rounded-full bg-ok" aria-hidden="true" /> {t('rag.channel')}
        </Eyebrow>
        <Menu
          trigger={
            <Button variant="secondary" size="sm" aria-label="Retrieval mode">
              <Gauge size={14} aria-hidden="true" /> {modeLabel} <ChevronDown size={14} aria-hidden="true" />
            </Button>
          }
          align="end"
          items={[
            { id: 'fast', label: t('rag.fast'), icon: Gauge, selected: mode === 'fast', onSelect: () => setMode('fast') },
            { id: 'reasoning', label: t('rag.deep'), icon: BrainCircuit, selected: mode === 'reasoning', onSelect: () => setMode('reasoning') },
          ]}
        />
      </div>

      <Card className="flex min-h-[420px] flex-col gap-5 p-0">
        <div className="flex flex-1 flex-col gap-5 p-5" aria-live="polite">
          {messages.length ? (
            messages.map((message, index) => (
              <div className="flex gap-3" key={`${message.role}-${index}`}>
                <Avatar color={message.role === 'assistant' ? 'var(--color-signal)' : undefined}>
                  {message.role === 'user' ? owner.initials : <Sparkles size={14} />}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <small className="font-mono text-[0.72rem] tracking-[0.14em] text-bone-faint">
                    {message.role === 'user' ? 'YOU' : 'HANK RAG'}
                  </small>
                  <div className={clsx('mt-1 break-words', message.role === 'user' ? 'text-bone-dim' : 'text-bone')}>
                    <Markdown>{message.text}</Markdown>
                  </div>
                  {message.role === 'assistant' && message.verified && (
                    <Badge tone="ok" className="mt-2">
                      <Check size={12} aria-hidden="true" /> Sources verified
                    </Badge>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              className="my-auto"
              icon={Sparkles}
              title={t('rag.welcomeTitle')}
              description={t('rag.welcomeText')}
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {prompts.map(({ label, text }) => (
                    <Button key={label} variant="ghost" size="sm" onClick={() => setComposer(text)}>
                      {label} <ArrowUpRight size={14} aria-hidden="true" />
                    </Button>
                  ))}
                </div>
              }
            />
          )}
          {busy && (
            <div className="flex items-center gap-3 font-mono text-fine text-bone-dim">
              <Spinner label={t('rag.thinking')} /> {t('rag.thinking')}
            </div>
          )}
        </div>

        {error && <ErrorState className="mx-5" title="Hank RAG could not answer" message={error} />}

        <form className="flex items-end gap-2 border-t border-line p-3" onSubmit={ask}>
          <Textarea
            ref={composerRef}
            aria-label={t('rag.placeholder')}
            value={query}
            onChange={(event) => setComposer(event.target.value)}
            onKeyDown={submitOnEnter}
            placeholder={t('rag.placeholder')}
            rows={1}
            className="max-h-[220px] min-h-[56px] resize-none border-0 bg-transparent"
          />
          <Button type="submit" size="icon" aria-label="Send question" disabled={busy || !query.trim()}>
            <Send size={16} aria-hidden="true" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

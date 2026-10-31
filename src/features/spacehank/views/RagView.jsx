import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Activity, ArrowUpRight, BrainCircuit, Check, ChevronRight, Gauge, Plus, Send, Sparkles, X } from 'lucide-react';
import { askRag } from '../api/rag';
import { owner, spacehankConfig } from '../config';
import '../i18n';

const MAX_COMPOSER_HEIGHT = 220;

export default function RagView() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('fast');
  const [autoMode, setAutoMode] = useState('auto');
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

  return (
    <div className="modern-page rag-page">
      <div className="rag-chat-toolbar">
        <span>
          <i /> {t('rag.channel')}
        </span>
        <details className="rag-mode-menu">
          <summary>
            <Gauge size={14} /> {modeLabel}
          </summary>
          <div>
            <button type="button" className={mode === 'fast' ? 'active' : ''} onClick={() => setMode('fast')}>
              <Gauge size={14} /> {t('rag.fast')}
            </button>
            <button type="button" className={mode === 'reasoning' ? 'active' : ''} onClick={() => setMode('reasoning')}>
              <BrainCircuit size={14} /> {t('rag.deep')}
            </button>
          </div>
        </details>
      </div>
      <div className="rag-workspace-panel">
        <section className="rag-conversation">
          <div className="conversation-body">
            {messages.length ? (
              messages.map((message, index) => (
                <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                  <span className="chat-avatar">{message.role === 'user' ? owner.initials : <Sparkles size={14} />}</span>
                  <div>
                    <small>{message.role === 'user' ? 'YOU' : 'HANK RAG'}</small>
                    <div className="chat-markdown">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                    </div>
                    {message.role === 'assistant' && message.verified && (
                      <span className="source-chip">
                        <Check size={12} /> Sources verified
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rag-welcome">
                <div className="welcome-icon">
                  <Sparkles size={25} />
                </div>
                <h3>{t('rag.welcomeTitle')}</h3>
                <p>{t('rag.welcomeText')}</p>
                <div className="prompt-grid">
                  <button onClick={() => setComposer(t('rag.askSummary'))}>
                    {t('rag.promptSummary')} <ArrowUpRight size={14} />
                  </button>
                  <button onClick={() => setComposer(t('rag.askPolicy'))}>
                    {t('rag.promptPolicy')} <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            )}
            {busy && (
              <div className="rag-loading">
                <i /> {t('rag.thinking')}
              </div>
            )}
          </div>
          <form className="rag-input" onSubmit={ask}>
            <div className="rag-composer-tools">
              <button type="button" aria-label="Add attachment">
                <Plus size={17} />
              </button>
              <button type="button" aria-label="Voice input">
                <Activity size={16} />
              </button>
              <button type="button" aria-label="Composer options">
                <ChevronRight size={15} />
              </button>
            </div>
            <textarea
              ref={composerRef}
              value={query}
              onChange={(event) => setComposer(event.target.value)}
              onKeyDown={submitOnEnter}
              placeholder={t('rag.placeholder')}
              rows="1"
            />
            <div className="rag-composer-meta">
              <span>Hank RAG</span>
              <span>{modeLabel}</span>
              <details>
                <summary>{autoMode === 'auto' ? 'Auto' : 'Manual'}</summary>
                <div>
                  <button type="button" onClick={() => setAutoMode('auto')}>
                    Auto
                  </button>
                  <button type="button" onClick={() => setAutoMode('manual')}>
                    Manual
                  </button>
                </div>
              </details>
            </div>
            <button className="rag-send" type="submit" disabled={busy || !query.trim()}>
              <Send size={17} />
            </button>
          </form>
          {error && (
            <div className="rag-inline-error">
              <X size={14} /> {error}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

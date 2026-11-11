import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button, Dialog, DialogClose, Field, Textarea } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { DEFAULT_AGENT_ID } from '../../core/agents';
import { statusTone } from './model';
import { Helmet, statusWord } from './parts';
import { tr } from '../../core/i18n/lang';
import './station.css';

/** Giving a task: what to do, and who on the crew does it (picked by their helmet, with how they are right now). */
export default function TaskModal({ agents, initialAgent, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [agentId, setAgentId] = useState(agents.some((a) => a.id === initialAgent) ? initialAgent : DEFAULT_AGENT_ID);
  const chosen = agents.find((agent) => agent.id === agentId) || agents[0];

  const submit = () => {
    if (!title.trim()) return;
    onSubmit(title.trim(), agentId);
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      eyebrow={tr('Mission control')}
      title={tr('Give a task')}
      description={tr('Say what needs doing and pick who does it. It flies to their desk on the station.')}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              {tr('Cancel')}
            </Button>
          </DialogClose>
          <Button size="sm" disabled={!title.trim()} onClick={submit}>
            <Send size={14} aria-hidden="true" /> {chosen ? tr('Send to {0}', chosen.name.split(' ').at(-1)) : tr('Send')}
          </Button>
        </>
      }
    >
      <Field label={tr('The task')}>
        {(props) => (
          <Textarea
            {...props}
            autoFocus
            rows={4}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) submit();
            }}
            placeholder={tr('Describe what you want done…')}
          />
        )}
      </Field>
      <fieldset>
        <legend className="mb-2 font-mono text-[0.68rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Who does it')}</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={tr('Who does it')}>
          {agents.map((agent) => {
            const on = agent.id === agentId;
            return (
              <button
                key={agent.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setAgentId(agent.id)}
                className={clsx('flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-2.5 transition-colors', on ? 'border-[var(--c)] bg-ink-2' : 'border-line hover:border-line-strong')}
                style={{ '--c': agent.color }}
              >
                <Helmet agent={agent} size={34} className={clsx(statusTone(agent.status) === 'offline' && 'opacity-60')} />
                <span className="w-full truncate text-center text-[0.72rem] text-bone">{agent.name.split(' ').at(-1)}</span>
                <span className="w-full truncate text-center font-mono text-[0.58rem] text-bone-faint">{statusWord(agent.status)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      {chosen && (
        <p className="font-mono text-[0.7rem] text-bone-faint">
          {chosen.name} · {chosen.role} · {chosen.model}
        </p>
      )}
    </Dialog>
  );
}

import { useState } from 'react';
import { Check, Send } from 'lucide-react';
import { Avatar, Badge, Button, Dialog, DialogClose, Field, Select, Textarea } from '../../../shared/ui';
import { DEFAULT_AGENT_ID } from '../../core/agents';
import { tr } from '../../core/i18n/lang';

const PRIORITIES = [
  { value: 'normal', label: tr('Normal') },
  { value: 'high', label: tr('High priority') },
  { value: 'critical', label: tr('Critical') },
];

export default function TaskModal({ agents, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [agentId, setAgentId] = useState(DEFAULT_AGENT_ID);
  const [priority, setPriority] = useState('normal');
  const selectedAgent = agents.find((agent) => agent.id === agentId) || agents[0];

  const submit = () => {
    onSubmit(title.trim(), agentId);
    onClose();
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      eyebrow={tr('TASK DISPATCH / HANK62')}
      title={tr('Create a new task')}
      description={tr('Send an instruction to the AI team.')}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              {tr('Cancel')}
            </Button>
          </DialogClose>
          <Button size="sm" disabled={!title.trim()} onClick={submit}>
            <Send size={14} aria-hidden="true" /> {tr('Dispatch task')}
          </Button>
        </>
      }
    >
      <Field label={tr('Task instruction')}>
        {(props) => (
          <Textarea
            {...props}
            autoFocus
            rows={4}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={tr('Describe what you want the AI team to do...')}
          />
        )}
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={tr('Assign to')}>
          {(props) => (
            <Select {...props} value={agentId} onChange={(event) => setAgentId(event.target.value)}>
              {agents.map((agent) => (
                <option value={agent.id} key={agent.id}>
                  {agent.name} - {agent.role}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={tr('Priority')}>
          {(props) => (
            <Select {...props} value={priority} onChange={(event) => setPriority(event.target.value)}>
              {PRIORITIES.map(({ value, label }) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="flex items-center gap-3 rounded-sm border border-line bg-ink-2 p-3">
        <Avatar color={selectedAgent?.color}>{selectedAgent?.name?.slice(0, 1) || '?'}</Avatar>
        <div className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-fine font-medium">{selectedAgent?.name || tr('AI agent')} {tr('is ready')}</b>
          <small className="font-mono text-[0.72rem] text-bone-faint">
            {selectedAgent?.model || tr('Worker')} - {priority} {tr('priority')}
          </small>
        </div>
        <Badge tone="ok">
          <Check size={12} aria-hidden="true" /> {tr('READY')}
        </Badge>
      </div>
    </Dialog>
  );
}

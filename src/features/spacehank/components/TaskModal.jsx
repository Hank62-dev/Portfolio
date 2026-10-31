import { useState } from 'react';
import { Check, Send } from 'lucide-react';
import { Avatar, Badge, Button, Dialog, DialogClose, Field, Select, Textarea } from '../../../design-system';
import { DEFAULT_AGENT_ID } from '../model/agents';

const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High priority' },
  { value: 'critical', label: 'Critical' },
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
      eyebrow="TASK DISPATCH / HANK62"
      title="Create a new task"
      description="Send an instruction to the AI team."
      footer={
        <>
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button size="sm" disabled={!title.trim()} onClick={submit}>
            <Send size={14} aria-hidden="true" /> Dispatch task
          </Button>
        </>
      }
    >
      <Field label="Task instruction">
        {(props) => (
          <Textarea
            {...props}
            autoFocus
            rows={4}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Describe what you want the AI team to do..."
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Assign to">
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
        <Field label="Priority">
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
          <b className="block truncate text-fine font-medium">{selectedAgent?.name || 'AI agent'} is ready</b>
          <small className="font-mono text-[0.72rem] text-bone-faint">
            {selectedAgent?.model || 'Worker'} - {priority} priority
          </small>
        </div>
        <Badge tone="ok">
          <Check size={12} aria-hidden="true" /> READY
        </Badge>
      </div>
    </Dialog>
  );
}

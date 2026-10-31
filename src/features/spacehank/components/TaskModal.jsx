import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Check, ListTodo, Send, X } from 'lucide-react';
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
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="task-modal-backdrop" />
        <Dialog.Content className="task-modal">
          <div className="task-modal-header">
            <div className="task-modal-title">
              <span>
                <ListTodo size={18} />
              </span>
              <div>
                <span className="eyebrow">TASK DISPATCH / HANK62</span>
                <Dialog.Title className="task-modal-heading">Create a new task</Dialog.Title>
                <Dialog.Description className="task-modal-description">Send an instruction to the AI team.</Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="ghost-icon" aria-label="Close task modal">
                <X size={17} />
              </button>
            </Dialog.Close>
          </div>
          <label className="task-field">
            <span>Task instruction</span>
            <textarea
              autoFocus
              rows="4"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Describe what you want the AI team to do..."
            />
          </label>
          <div className="task-form-grid">
            <label className="task-field">
              <span>Assign to</span>
              <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
                {agents.map((agent) => (
                  <option value={agent.id} key={agent.id}>
                    {agent.name} - {agent.role}
                  </option>
                ))}
              </select>
            </label>
            <label className="task-field">
              <span>Priority</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                {PRIORITIES.map(({ value, label }) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="task-preview">
            <span className="pulse-avatar" style={{ '--agent-color': selectedAgent?.color }}>
              {selectedAgent?.name?.slice(0, 1) || '?'}
            </span>
            <div>
              <b>{selectedAgent?.name || 'AI agent'} is ready</b>
              <small>
                {selectedAgent?.model || 'Worker'} - {priority} priority
              </small>
            </div>
            <span className="task-ready">
              <Check size={13} /> READY
            </span>
          </div>
          <div className="task-modal-actions">
            <Dialog.Close asChild>
              <button className="secondary-action">Cancel</button>
            </Dialog.Close>
            <button className="primary-action" disabled={!title.trim()} onClick={submit}>
              <Send size={15} /> Dispatch task
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

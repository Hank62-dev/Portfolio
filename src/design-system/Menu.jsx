import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { clsx } from '../lib/format';

/**
 * A dropdown of single-choice or action items, with keyboard navigation and typeahead.
 *   trigger  the element that opens it (must accept a ref and props)
 *   items    [{ id, label, icon?, onSelect, selected? }]
 */
export const Menu = ({ trigger, items, align = 'start' }) => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={6}
        className="z-50 min-w-44 animate-fade-in rounded-card border border-line-strong bg-ink-1 p-1 shadow-pop"
      >
        {items.map(({ id, label, icon: Icon, onSelect, selected }) => (
          <DropdownMenu.Item
            key={id}
            onSelect={onSelect}
            className={clsx(
              'flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-2 font-mono text-fine outline-none select-none data-[highlighted]:bg-ink-3',
              selected ? 'text-bone' : 'text-bone-dim data-[highlighted]:text-bone'
            )}
          >
            {Icon && <Icon size={14} aria-hidden="true" />}
            <span className="flex-1">{label}</span>
            {selected && <Check size={14} className="text-signal" aria-hidden="true" />}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

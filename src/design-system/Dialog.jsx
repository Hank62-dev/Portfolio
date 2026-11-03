import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Eyebrow } from './Card';
import { useSheetDrag } from './useSheetDrag';

/**
 * A modal dialog. Focus is trapped and returned, Escape closes it, and the title/description are
 * announced by screen readers (both are required for that reason).
 */
export const Dialog = ({ open, onOpenChange, eyebrow, title, description, children, footer }) => {
  // on a phone it is a sheet from the bottom, and a finger can pull it down to put it away
  const drag = useSheetDrag(() => onOpenChange?.(false), { minWidth: 640 });
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-black/65 backdrop-blur-sm" />
        <RadixDialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 animate-fade-in flex-col gap-5 overflow-y-auto overscroll-contain rounded-card border border-line-strong bg-ink-1 p-6 shadow-pop max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[88dvh] max-sm:w-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:animate-sheet-up max-sm:rounded-t-[2rem] max-sm:rounded-b-none max-sm:border-x-0 max-sm:border-b-0 max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]" {...drag.bind} style={drag.style}>
          <span className="mx-auto -mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
          <div className="flex items-start justify-between gap-4">
            <div>
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              <RadixDialog.Title className="mt-1 font-display text-h3 leading-tight text-bone">{title}</RadixDialog.Title>
              <RadixDialog.Description className="mt-1 text-bone-dim">{description}</RadixDialog.Description>
            </div>
            <RadixDialog.Close
              aria-label="Close"
              className="grid size-9 shrink-0 place-items-center rounded-sm text-bone-dim transition-colors hover:text-bone"
            >
              <X size={18} aria-hidden="true" />
            </RadixDialog.Close>
          </div>
          {children}
          {footer && <div className="flex justify-end gap-2">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};

export const DialogClose = RadixDialog.Close;

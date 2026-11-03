import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { usePhoto } from './photos';

// The soft pieces the diary is made of: a cream sheet that rises from the bottom, round buttons, a photo thumbnail.

const BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 font-body text-[0.95rem] font-semibold transition-[transform,background-color,opacity] active:scale-[0.96] disabled:opacity-50';

/** A round button. `tone="fill"` is the warm main one; `tone="soft"` is quiet; `tone="glass"` sits on the sky. */
export function SoftButton({ tone = 'fill', className, children, ...rest }) {
  const look = {
    fill: 'bg-[#e8836a] text-white shadow-[0_10px_22px_-10px_rgb(200_80_60/0.8)] hover:bg-[#ee8f77]',
    soft: 'bg-[#f6e4d2] text-[#6b4a63] hover:bg-[#f2dac4]',
    glass: 'border border-white/30 bg-white/15 text-[#fff6e8] backdrop-blur hover:bg-white/25',
  }[tone];
  return (
    <button type="button" className={clsx(BUTTON, look, className)} {...rest}>
      {children}
    </button>
  );
}

/** A cream sheet over the sky. The title and description are for screen readers; the content draws its own heading. */
export function PaperSheet({ open, onClose, title, description, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[85] animate-fade-in bg-[#2a2150]/60 backdrop-blur-sm" />
        <Dialog.Content className="paper fixed inset-x-0 bottom-0 z-[86] mx-auto flex max-h-[94dvh] w-full max-w-[34rem] animate-sheet-up flex-col overflow-y-auto rounded-t-[2rem] pb-[env(safe-area-inset-bottom)] outline-none md:top-1/2 md:bottom-auto md:max-h-[90dvh] md:-translate-y-1/2 md:rounded-[2rem]">
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{description}</Dialog.Description>
          <span className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-[#e6cfb6] md:hidden" aria-hidden="true" />
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const SheetClose = ({ label = 'Đóng' }) => (
  <Dialog.Close aria-label={label} className="grid size-10 shrink-0 place-items-center rounded-full text-[#8a6f8f] transition-colors hover:bg-[#f6e4d2]">
    <X size={18} aria-hidden="true" />
  </Dialog.Close>
);

/** A stored picture, square. With `onRemove` it has a small cross to take it off the page. */
export function Thumb({ id, size = 72, onRemove, className, alt = 'Ảnh kỷ niệm' }) {
  const url = usePhoto(id);
  return (
    <span className={clsx('relative inline-block shrink-0 overflow-hidden rounded-2xl bg-[#f1dcc4]', className)} style={{ width: size, height: size }}>
      {url && <img src={url} alt={alt} className="size-full object-cover" />}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Bỏ ảnh này" className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-[#4b3454]/70 text-white">
          <X size={13} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

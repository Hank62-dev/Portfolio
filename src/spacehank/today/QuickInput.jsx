import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { clsx } from '../../shared/lib/format';
import { flyToInbox } from '../capture/fly';
import { openCapture } from '../capture/ui';
import { addToInbox } from '../inbox/file';
import { tr } from '../lang';

/**
 * One line to type into, set in the sky as a pane of frosted glass: Enter puts the words in the Inbox (and they fly there); with
 * nothing typed the plus opens the full capture sheet (a photo of a receipt, filing at once).
 */
export default function QuickInput({ onNotify }) {
  const [text, setText] = useState('');
  const form = useRef(null);
  const submit = async (event) => {
    event.preventDefault();
    const line = text.trim();
    if (!line) return openCapture('', event.nativeEvent.submitter);
    try {
      const where = form.current?.getBoundingClientRect();
      await addToInbox(line);
      flyToInbox(where, line);
      setText('');
      onNotify?.(tr('Added to your Inbox'));
    } catch {
      onNotify?.(tr('That could not be saved on this device'));
    }
    return undefined;
  };
  return (
    <form
      ref={form}
      onSubmit={submit}
      className="flex items-center gap-2 rounded-full border border-white/25 bg-black/25 py-1.5 pr-1.5 pl-5 backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-300 focus-within:border-white/60 focus-within:bg-black/35 focus-within:shadow-[0_0_0_4px_rgb(255_255_255/0.12)]"
      data-quick-capture
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={tr('Capture anything: lunch 45k, call mum tomorrow…')}
        aria-label={tr('Capture anything')}
        enterKeyHint="send"
        autoComplete="off"
        className="h-10 min-w-0 flex-1 bg-transparent text-fine text-white placeholder:text-white/60 focus:outline-none"
      />
      <button type="submit" aria-label={text.trim() ? tr('Add to Inbox') : tr('Open quick capture')} className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-black transition-transform duration-300 active:scale-90">
        <Plus size={18} strokeWidth={2.2} className={clsx('transition-transform duration-300', text.trim() && 'rotate-45')} aria-hidden="true" />
      </button>
    </form>
  );
}

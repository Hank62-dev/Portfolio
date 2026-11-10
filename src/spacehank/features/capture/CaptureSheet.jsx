import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Inbox as InboxIcon, Mic } from 'lucide-react';
import { Button, Dialog } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { readReceipt } from '../../core/api/owner';
import { addToInbox, fileItem } from '../inbox/file';
import { inbox } from '../inbox/store';
import { KINDS, categoryLabel, classify, kindLabel, newInboxItem, receiptItem } from '../inbox/model';
import { formatVnd } from '../wallet/model';
import { useStore } from '../../core/store';
import { startJob, useJob } from '../../core/jobs';
import { tr } from '../../core/i18n/lang';
import { captureUi, closeCapture } from './ui';
import { shrinkPhoto } from './receipt';
import { flyToInbox } from './fly';

/** What the guess says, in a few words: "Spending · 45.000 ₫ · Food & drink" or "Task · due 2026-11-08". */
const guessLine = (guess) => {
  const parts = [kindLabel(guess.kind)];
  if (guess.amount) parts.push(formatVnd(guess.amount));
  if (guess.category && guess.kind === 'expense') parts.push(categoryLabel(guess.category));
  if (guess.due) parts.push(tr('due {0}', guess.due));
  return parts.join(' · ');
};

/**
 * The one place to put something down in a hurry, from any screen: words, or a photo of a receipt. By default it goes to the
 * Inbox to be sorted later (one tap per item); when the guess looks right it can also be filed at once.
 */
export default function CaptureSheet({ onNotify, onTab }) {
  const { open, text: initial, from } = useStore(captureUi);
  const input = useRef(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const photo = useRef(null);
  const receipt = useJob('capture-receipt');

  useEffect(() => {
    if (open) setText(initial);
  }, [open, initial]);

  const guess = classify(text);
  const trimmed = text.trim();

  const toInbox = async () => {
    if (!trimmed) return;
    setBusy(true);
    try {
      const where = input.current?.getBoundingClientRect();
      await addToInbox(trimmed);
      flyToInbox(where, trimmed);
      onNotify?.(tr('Added to your Inbox'));
      setText('');
      closeCapture();
    } catch {
      onNotify?.(tr('That could not be saved on this device'));
    }
    setBusy(false);
  };

  const fileNow = async (kind) => {
    if (!trimmed) return;
    setBusy(true);
    try {
      await inbox.load();
      const item = await inbox.create(newInboxItem(trimmed, { guess: { ...guess, kind } }));
      const done = await fileItem(item, kind);
      onNotify?.(done.label);
      setText('');
      closeCapture();
    } catch (error) {
      onNotify?.(error.message || tr('That could not be saved on this device'));
    }
    setBusy(false);
  };

  const onPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await startJob('capture-receipt', async () => {
      const { image, mime } = await shrinkPhoto(file);
      const read = await readReceipt({ image, mime });
      await inbox.load();
      await inbox.create(receiptItem(read));
      onNotify?.(read.amount ? tr('Receipt read: {0}. It is in your Inbox.', formatVnd(read.amount)) : tr('The picture is in your Inbox, but I could not read a total. Add it by hand.'));
      closeCapture();
    });
  };

  // the guess first, then the other ways to file it (money only when there is an amount to file)
  const options = KINDS.filter((k) => (k.id === 'expense' || k.id === 'income' ? guess.amount > 0 : true));
  const ordered = [...options.filter((k) => k.id === guess.kind), ...options.filter((k) => k.id !== guess.kind)];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && closeCapture()}
      eyebrow={tr('QUICK CAPTURE')}
      title={tr('Put it down, sort it later')}
      description={tr('A thought, a task, something you spent. It goes to your Inbox.')}
      contentProps={{ 'data-capture-sheet': '', style: from ? { '--ox': `${from.x - window.innerWidth / 2}px`, '--oy': `${from.y - window.innerHeight / 2}px` } : undefined }}
    >
      <textarea
        ref={input}
        autoFocus
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void toInbox();
          }
        }}
        placeholder={tr('e.g. lunch 45k, call the landlord tomorrow, idea for the podcast…')}
        aria-label={tr('What do you want to capture?')}
        className="w-full resize-none rounded-sm border border-line bg-ink-2 px-3 py-2.5 text-body text-bone placeholder:text-bone-faint focus:border-signal focus:outline-none"
        data-capture-input
      />
      {trimmed && (
        <p className="-mt-2 font-mono text-fine text-bone-dim" data-capture-guess>
          {tr('Looks like')}: <b key={guessLine(guess)} className="animate-fade-in font-medium text-bone">{guessLine(guess)}</b>
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button onClick={toInbox} disabled={!trimmed || busy} loading={busy} data-capture-save>
          <InboxIcon size={15} aria-hidden="true" /> {tr('Add to Inbox')}
        </Button>
        {trimmed && (
          <div className="flex flex-wrap items-center gap-2" aria-label={tr('File it right now as')}>
            <span className="font-mono text-[0.72rem] tracking-[0.1em] text-bone-faint uppercase">{tr('Or file now as')}</span>
            {ordered.map((k) => {
              const guessed = k.id === guess.kind && guess.kind !== 'note';
              return (
                <button
                  key={k.id}
                  type="button"
                  disabled={busy}
                  onClick={() => fileNow(k.id)}
                  className={clsx('inline-flex h-8 items-center gap-1 rounded-full border px-3 font-mono text-[0.74rem] transition-colors active:scale-95 disabled:opacity-50', guessed ? 'border-signal text-bone' : 'border-line text-bone-dim hover:text-bone')}
                >
                  {guessed && <Check size={12} aria-hidden="true" />} {k.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <input ref={photo} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} data-capture-photo />
        <Button variant="ghost" size="sm" onClick={() => photo.current?.click()} loading={receipt.busy} data-capture-receipt>
          <Camera size={14} aria-hidden="true" /> {tr('Photo of a receipt')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            closeCapture();
            onTab?.('memos');
          }}
        >
          <Mic size={14} aria-hidden="true" /> {tr('Voice memo')}
        </Button>
      </div>
      {receipt.error && (
        <p role="alert" className="text-fine text-danger">
          {receipt.error}
        </p>
      )}
    </Dialog>
  );
}

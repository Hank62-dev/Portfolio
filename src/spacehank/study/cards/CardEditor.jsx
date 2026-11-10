import { useRef, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { Button, Dialog, Select, Textarea } from '../../../shared/ui';
import { newFlashcard } from '../model';
import { flashcards } from '../store';
import { clozeFront, hasCloze, wrapBlank } from './states';
import { tr } from '../../lang';

/**
 * Adding a card, or changing one. On a phone it is a sheet that can be pulled down. A part of the question can be turned
 * into a blank ("The {{heart}} pumps blood"), and then the answer is optional: the blank is the answer.
 */
export default function CardEditor({ card, decks, deck: initialDeck = '', onClose }) {
  const editing = Boolean(card?.id);
  const [front, setFront] = useState(card?.front ?? '');
  const [back, setBack] = useState(card?.back ?? '');
  const [deck, setDeck] = useState(card ? card.deck : initialDeck);
  const [added, setAdded] = useState(0);
  const [sure, setSure] = useState(false);
  const frontField = useRef(null);
  const cloze = hasCloze(front);
  const ready = front.trim() && (back.trim() || cloze);

  const blank = () => {
    const field = frontField.current;
    if (!field) return;
    const next = wrapBlank(front, field.selectionStart, field.selectionEnd);
    if (next !== front) setFront(next);
    field.focus();
  };

  const save = async (another) => {
    if (!ready) return;
    if (editing) {
      await flashcards.update(card.id, { front: front.trim().slice(0, 400), back: back.trim().slice(0, 1200), deck });
      onClose();
      return;
    }
    await flashcards.create(newFlashcard(front, back, deck));
    if (another) {
      setFront('');
      setBack('');
      setAdded((n) => n + 1);
      frontField.current?.focus();
    } else onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={editing ? tr('EDIT CARD') : tr('NEW CARD')} title={editing ? tr('Change this card') : tr('Add a card')} description={tr('One fact on each card works best. Turn a word into a blank to make it a fill-in card.')}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(false);
        }}
        className="flex flex-col gap-4"
        data-card-form
      >
        <div className="flex flex-col gap-2">
          <Textarea ref={frontField} aria-label={tr('Front')} rows={3} placeholder={tr('Question, term, or a sentence with a blank')} value={front} onChange={(e) => setFront(e.target.value)} autoFocus />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={blank} data-make-blank>
              {tr('Make selection a blank')}
            </Button>
            <span className="text-[0.74rem] text-bone-faint">{tr('Select a word in the front, then tap.')}</span>
          </div>
          {cloze && (
            <p className="rounded-2xl border border-line bg-shade/20 px-3.5 py-2.5 text-fine text-bone-dim" data-preview>
              <span className="mr-1.5 font-mono text-[0.62rem] tracking-[0.12em] text-bone-faint uppercase">{tr('Shows as')}</span>
              {clozeFront(front)}
            </p>
          )}
        </div>
        <Textarea aria-label={tr('Back')} rows={3} placeholder={cloze ? tr('Extra note (optional)') : tr('Answer')} value={back} onChange={(e) => setBack(e.target.value)} />
        <Select aria-label={tr('Deck')} value={deck} onChange={(e) => setDeck(e.target.value)} compact>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={!ready} className="w-full justify-center">
            <Check size={15} aria-hidden="true" /> {editing ? tr('Save') : tr('Add card')}
          </Button>
          {!editing && (
            <Button type="button" variant="ghost" disabled={!ready} onClick={() => save(true)} className="w-full justify-center" data-add-another>
              <Plus size={15} aria-hidden="true" /> {tr('Add and write another')}{added ? tr(' ({0} added)', added) : ''}
            </Button>
          )}
          {editing &&
            (sure ? (
              <Button
                type="button"
                variant="danger"
                className="w-full justify-center"
                onClick={async () => {
                  await flashcards.remove(card.id);
                  onClose();
                }}
                onBlur={() => setSure(false)}
                autoFocus
              >
                <Trash2 size={15} aria-hidden="true" /> {tr('Tap again to delete')}
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="w-full justify-center" onClick={() => setSure(true)} data-delete-card>
                <Trash2 size={15} aria-hidden="true" /> {tr('Delete card')}
              </Button>
            ))}
        </div>
      </form>
    </Dialog>
  );
}

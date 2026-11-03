import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge, Button, Dialog, Select, Textarea } from '../../../../design-system';
import { generateCards } from '../../api/owner';
import { titleOf } from '../../notes/notes';
import { newFlashcard } from '../model';
import { flashcards } from '../store';

/** Cards written by the AI from a note or pasted text. They are listed first, and only the ticked ones are kept. */
export default function MakeCards({ notes, deck, onClose, onAdded }) {
  const [source, setSource] = useState('');
  const [made, setMade] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const generate = async () => {
    setBusy(true);
    setProblem('');
    try {
      const { cards } = await generateCards({ text: source });
      setMade(cards.map((c) => ({ ...c, keep: true })));
    } catch (error) {
      setProblem(error.message);
    } finally {
      setBusy(false);
    }
  };

  const keep = async () => {
    const chosen = made.filter((c) => c.keep);
    for (const c of chosen) await flashcards.create(newFlashcard(c.front, c.back, deck));
    onAdded?.(chosen.length);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow="FROM YOUR TEXT" title="Make cards" description="Pick a note or paste what you are studying, and the AI drafts cards. You look them over before any are kept.">
      {made ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Badge tone="signal">{made.length} drafted</Badge>
            <Button size="sm" onClick={keep} disabled={!made.some((c) => c.keep)}>
              Add the ticked ones
            </Button>
          </div>
          <ul className="flex flex-col gap-2" data-made>
            {made.map((c, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border border-line bg-ink-2 p-3">
                <input type="checkbox" aria-label={`Keep: ${c.front}`} checked={c.keep} onChange={() => setMade(made.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))} className="mt-1 size-4 accent-[var(--color-signal)]" />
                <span className="leading-snug">
                  <b className="block text-fine font-medium text-bone">{c.front}</b>
                  <small className="text-fine text-bone-dim">{c.back}</small>
                </span>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" onClick={() => setMade(null)} className="self-start">
            Back to the text
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Select
            aria-label="Use a note"
            value=""
            onChange={(e) => {
              const note = notes.find((x) => x.id === e.target.value);
              if (note) setSource(note.text);
            }}
            compact
          >
            <option value="">Use a note…</option>
            {notes.map((n) => (
              <option key={n.id} value={n.id}>
                {titleOf(n.text)}
              </option>
            ))}
          </Select>
          <Textarea aria-label="Text to learn from" rows={6} placeholder="…or paste what you are studying" value={source} onChange={(e) => setSource(e.target.value)} />
          <Button loading={busy} disabled={source.trim().length < 40} onClick={generate} className="w-full justify-center">
            <Sparkles size={15} aria-hidden="true" /> Make cards
          </Button>
          {problem && (
            <p className="font-mono text-fine text-danger" role="alert">
              {problem}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}

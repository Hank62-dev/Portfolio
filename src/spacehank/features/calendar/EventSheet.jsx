import { useState } from 'react';
import { Check, ExternalLink, Repeat, Trash2 } from 'lucide-react';
import { Button, DatePicker, Dialog, Input, Select, Textarea, pushToast } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { tr } from '../../core/i18n/lang';
import { draftOf, draftReady, inputOf } from './model';
import { removeEvent, saveEvent } from './store';

const REPEATS = [
  { id: 'none', label: tr('Does not repeat') },
  { id: 'daily', label: tr('Every day') },
  { id: 'weekly', label: tr('Every week') },
  { id: 'monthly', label: tr('Every month') },
  { id: 'yearly', label: tr('Every year') },
];

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

function Switch({ checked, onChange, children }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 rounded-2xl border border-line px-3.5 py-3 text-left text-fine text-bone-dim">
      <span className={clsx('grid size-5 shrink-0 place-items-center rounded-md border', checked ? 'border-signal bg-signal text-ink-0' : 'border-line-strong')}>{checked && <Check size={13} strokeWidth={3} aria-hidden="true" />}</span>
      {children}
    </button>
  );
}

/**
 * One event of the Google Calendar: a new one on `day`, or an existing one to change or delete. An event that repeats can be
 * changed on this day alone (its time and words), or in its words for the whole series; it can be deleted the same two ways.
 */
export default function EventSheet({ event, day, calendars, onClose }) {
  const editing = Boolean(event);
  const writable = calendars.filter((c) => c.writable);
  const [draft, setDraft] = useState(() => ({ ...draftOf(event, day), calendarId: event?.calendarId ?? writable.find((c) => c.selected)?.id ?? writable[0]?.id ?? '' }));
  const [series, setSeries] = useState(false);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const repeating = Boolean(event?.recurringId);
  const locked = editing && !event.writable;
  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const run = async (work) => {
    setBusy(true);
    try {
      await work();
      onClose();
    } catch (error) {
      pushToast(error.message, { tone: 'error' });
      setBusy(false);
    }
  };

  const save = (e) => {
    e.preventDefault();
    if (!draftReady(draft) || busy || locked) return;
    return run(() => saveEvent(inputOf(draft, { zone: zone() }), editing ? { id: { id: event.id, recurringId: event.recurringId, series } } : undefined));
  };

  const remove = () => run(() => removeEvent(event, { series }));

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()} eyebrow={editing ? tr('EVENT') : tr('NEW EVENT')} title={editing ? (locked ? event.title : tr('Change this event')) : tr('Add an event')} description={locked ? tr('This one belongs to Google (a birthday, say) and cannot be changed here.') : tr('It is saved to your Google Calendar.')}>
      <form onSubmit={save} className="flex flex-col gap-4" data-event-form>
        <Input aria-label={tr('Title')} placeholder={tr('e.g. Lunch with Mai')} value={draft.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} autoFocus={!editing} disabled={locked} />

        <Switch checked={draft.allDay} onChange={(allDay) => !locked && !(series && repeating) && set({ allDay })}>
          {tr('All day')}
        </Switch>

        <div className="grid grid-cols-2 gap-3">
          <DatePicker aria-label={tr('Starts on')} value={draft.date} onChange={(date) => set({ date, endDate: draft.endDate < date ? date : draft.endDate })} compact clearable={false} className="w-full" disabled={locked || (series && repeating)} />
          <DatePicker aria-label={tr('Ends on')} value={draft.endDate} onChange={(endDate) => set({ endDate: endDate < draft.date ? draft.date : endDate })} compact clearable={false} className="w-full" disabled={locked || (series && repeating)} />
          {!draft.allDay && (
            <>
              <Input type="time" aria-label={tr('Starts at')} value={draft.startTime} onChange={(e) => set({ startTime: e.target.value })} compact disabled={locked || (series && repeating)} />
              <Input type="time" aria-label={tr('Ends at')} value={draft.endTime} onChange={(e) => set({ endTime: e.target.value })} compact disabled={locked || (series && repeating)} />
            </>
          )}
        </div>

        <Input aria-label={tr('Place')} placeholder={tr('Place (optional)')} value={draft.location} onChange={(e) => set({ location: e.target.value })} maxLength={300} disabled={locked} />
        <Textarea aria-label={tr('Notes')} placeholder={tr('Notes (optional)')} value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={3} maxLength={4000} disabled={locked} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {!editing && (
            <Select aria-label={tr('Repeat')} value={draft.repeat} onChange={(e) => set({ repeat: e.target.value })} compact>
              {REPEATS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
          <Select aria-label={tr('Calendar')} value={draft.calendarId} onChange={(e) => set({ calendarId: e.target.value })} compact disabled={editing}>
            {writable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {repeating && !locked && (
          <Switch checked={series} onChange={setSeries}>
            <span className="inline-flex items-center gap-2">
              <Repeat size={14} aria-hidden="true" /> {tr('Apply to the whole series (words only for a change)')}
            </span>
          </Switch>
        )}

        <div className="flex flex-col gap-2">
          {!locked && (
            <Button type="submit" disabled={!draftReady(draft) || busy} className="w-full justify-center" data-save-event>
              <Check size={15} aria-hidden="true" /> {editing ? tr('Save') : tr('Add')}
            </Button>
          )}
          {editing && event.link && (
            <Button type="button" variant="ghost" className="w-full justify-center" onClick={() => window.open(event.link, '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={15} aria-hidden="true" /> {tr('Open in Google Calendar')}
            </Button>
          )}
          {editing &&
            !locked &&
            (sure ? (
              <Button type="button" variant="danger" className="w-full justify-center" onClick={remove} onBlur={() => setSure(false)} disabled={busy} autoFocus>
                <Trash2 size={15} aria-hidden="true" /> {series ? tr('Tap again to delete the whole series') : tr('Tap again to delete')}
              </Button>
            ) : (
              <Button type="button" variant="ghost" className="w-full justify-center" onClick={() => setSure(true)}>
                <Trash2 size={15} aria-hidden="true" /> {tr('Delete')}
              </Button>
            ))}
        </div>
      </form>
    </Dialog>
  );
}

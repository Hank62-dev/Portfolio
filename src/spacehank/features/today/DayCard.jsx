import { useState } from 'react';
import { BookHeart, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Coins, Mic, NotebookPen, Sprout } from 'lucide-react';
import { Card, Eyebrow } from '../../../shared/ui';
import { clsx } from '../../../shared/lib/format';
import { dayLabel, shiftDay } from '../diary/model';
import { dayKey } from '../habits/model';
import { locale, tr } from '../../core/i18n/lang';
import { dayTimeline } from '../review/timeline';

const ICONS = { note: NotebookPen, diary: BookHeart, memo: Mic, spending: Coins, income: Coins, task: CheckCircle2 };

/** One day as a line of time: what was written, said, spent and finished, in order. Folded until asked for; any day can be looked at. */
export default function DayCard({ data, onTab }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(dayKey());
  const { events, habits } = dayTimeline(data, day);
  const count = events.length + (habits.length ? 1 : 0);
  const today = dayKey();

  return (
    <Card data-day-card>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 text-left">
        <span>
          <Eyebrow>{tr('TIMELINE')}</Eyebrow>
          <b className="mt-1 block font-body text-lead font-medium text-bone">{day === today ? tr('Your day so far') : dayLabel(day)}</b>
        </span>
        <span className="flex items-center gap-2 font-mono text-fine text-bone-faint">
          {count > 0 && <span>{count}</span>}
          <ChevronDown size={16} className={clsx('transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-1">
            <button type="button" aria-label={tr('Previous day')} onClick={() => setDay(shiftDay(day, -1))} className="grid size-8 place-items-center rounded-full border border-line text-bone-dim active:scale-90">
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
            <button type="button" aria-label={tr('Next day')} disabled={day >= today} onClick={() => setDay(shiftDay(day, 1))} className="grid size-8 place-items-center rounded-full border border-line text-bone-dim active:scale-90 disabled:opacity-40">
              <ChevronRight size={15} aria-hidden="true" />
            </button>
            {day !== today && (
              <button type="button" onClick={() => setDay(today)} className="ml-1 font-mono text-fine text-bone-dim underline underline-offset-4">
                {tr('Today')}
              </button>
            )}
          </div>
          {count === 0 ? (
            <p className="py-4 text-fine text-bone-faint">{day === today ? tr('Nothing yet today. What you write, say, spend and finish will line up here.') : tr('Nothing was kept on this day.')}</p>
          ) : (
            <ol className="flex flex-col">
              {events.map((event) => {
                const Icon = ICONS[event.kind] ?? NotebookPen;
                return (
                  <li key={event.id}>
                    <button type="button" onClick={() => onTab(event.tab)} className="flex w-full items-start gap-3 border-t border-line py-2.5 text-left first:border-t-0">
                      <time className="w-11 shrink-0 pt-0.5 font-mono text-[0.72rem] text-bone-faint">{new Date(event.at).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}</time>
                      <Icon size={15} className="mt-0.5 shrink-0 text-bone-faint" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-fine text-bone">{event.title}</span>
                        {event.detail && <small className="block truncate font-mono text-[0.7rem] text-bone-faint">{event.detail}</small>}
                      </span>
                    </button>
                  </li>
                );
              })}
              {habits.length > 0 && (
                <li className="flex items-start gap-3 border-t border-line py-2.5">
                  <span className="w-11 shrink-0" />
                  <Sprout size={15} className="mt-0.5 shrink-0 text-bone-faint" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-fine text-bone">{tr('Habits: {0}', habits.join(', '))}</span>
                </li>
              )}
            </ol>
          )}
        </div>
      )}
    </Card>
  );
}

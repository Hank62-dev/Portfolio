import { useEffect, useMemo } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { Card, Eyebrow } from '../../../shared/ui';
import { dateLocale } from '../../../shared/ui/words';
import { dayKey } from '../habits/model';
import { tr } from '../../core/i18n/lang';
import { modules } from '../../core/modules';
import { useStore } from '../../core/store';
import { addDays, clockOf, googleItems, parseDay, upcoming } from '../calendar/model';
import { loadEvents, useGoogle } from '../calendar/store';

/** The next events of the Google Calendar, for the next three days. It shows only once the Calendar is connected. */
export default function UpcomingCard({ onTab, className, style }) {
  const google = useGoogle();
  const hidden = useStore(modules, (s) => s.hidden).includes('calendar');
  const connected = Boolean(google.status?.connected) && !hidden;
  const today = dayKey();
  const range = useMemo(() => ({ from: parseDay(today), to: parseDay(addDays(today, 3)) }), [today]);
  useEffect(() => {
    if (connected) void loadEvents(range);
  }, [connected, range]);
  const next = useMemo(() => upcoming(googleItems(google.events), Date.now(), 4), [google.events]);
  if (!connected) return null;

  const when = (item) => {
    const clock = item.allDay ? tr('All day') : clockOf(item.startMs);
    if (item.day === today) return clock;
    if (item.day === addDays(today, 1)) return `${tr('Tomorrow')} · ${clock}`;
    return `${parseDay(item.day).toLocaleDateString(dateLocale(), { weekday: 'short' })} · ${clock}`;
  };

  return (
    <Card className={className} style={style} data-upcoming>
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{tr('COMING UP')}</Eyebrow>
        <button type="button" onClick={() => onTab('calendar')} aria-label={tr('Open the Calendar')} className="grid size-8 place-items-center rounded-full text-bone-dim transition-colors hover:text-bone active:scale-90">
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </div>
      {next.length ? (
        <ul className="mt-3 flex flex-col gap-2.5">
          {next.map((item) => (
            <li key={item.uid} className="flex items-start gap-3">
              <i className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: item.color }} aria-hidden="true" />
              <div className="min-w-0 flex-1 leading-tight">
                <b className="block truncate text-fine font-medium text-bone">{item.title || tr('Untitled')}</b>
                <small className="flex items-center gap-1 truncate font-mono text-[0.7rem] text-bone-faint">
                  <span className="tabular-nums">{when(item)}</span>
                  {item.event.location && (
                    <>
                      <MapPin size={10} aria-hidden="true" /> <span className="truncate">{item.event.location}</span>
                    </>
                  )}
                </small>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-fine text-bone-dim">{tr('Nothing on your calendar for the next three days.')}</p>
      )}
    </Card>
  );
}

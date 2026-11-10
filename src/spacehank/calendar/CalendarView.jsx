import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpenCheck, CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Inbox, ListChecks, MapPin, Plus, RefreshCw, Rows3, SquareKanban, Unplug } from 'lucide-react';
import { Button, pushToast } from '../../shared/ui';
import { dateLocale } from '../../shared/ui/words';
import { clsx } from '../../shared/lib/format';
import { Segmented, PageHead } from '../components/Page';
import { useFab } from '../fab';
import { tr } from '../lang';
import { courses } from '../study/store';
import { ItemSheet } from '../study/overview/Sheets';
import { useLifeData } from '../today/useLifeData';
import { dayKey } from '../habits/model';
import EventSheet from './EventSheet';
import { addDays, agendaGroups, byDay, clockOf, dots, googleItems, localItems, monthGrid, parseDay, rangeOf, shiftMonth, weekOf } from './model';
import { connectGoogle, disconnectGoogle, loadEvents, loadStatus, toggleCalendar, useGoogle } from './store';

const VIEW_KEY = 'hank62.calendar.view';
const VIEWS = [
  { id: 'month', label: tr('Month'), icon: CalendarDays },
  { id: 'week', label: tr('Week'), icon: Rows3 },
  { id: 'agenda', label: tr('Agenda'), icon: ListChecks },
];
const GROUP_LABEL = { overdue: tr('Overdue'), today: tr('Today'), tomorrow: tr('Tomorrow'), week: tr('This week'), later: tr('Later') };
const KIND_LABEL = { study: tr('Study'), task: tr('Task'), inbox: tr('Inbox') };

const initialView = () => {
  try {
    const saved = localStorage.getItem(VIEW_KEY);
    return VIEWS.some((v) => v.id === saved) ? saved : 'month';
  } catch {
    return 'month';
  }
};

const fmt = (key, options) => parseDay(key).toLocaleDateString(dateLocale(), options);

const titleOf = (view, anchor) => {
  if (view === 'month') return fmt(anchor, { month: 'long', year: 'numeric' });
  if (view === 'week') {
    const days = weekOf(anchor);
    return `${fmt(days[0], { day: 'numeric', month: 'short' })} – ${fmt(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return tr('Coming up');
};

const toggleDeadline = (course, id) => courses.update(course.id, { deadlines: course.deadlines.map((d) => (d.id === id ? { ...d, done: !d.done } : d)) });

/** The time of an item: "09:00 – 10:30", or "All day" for what has none. */
const timeOf = (item) => {
  if (item.allDay || item.startMs === null) return tr('All day');
  return item.endMs > item.startMs ? `${clockOf(item.startMs)} – ${clockOf(item.endMs)}` : clockOf(item.startMs);
};

/** One line of a day: an event, a deadline, a task. */
function Row({ item, onOpen, compact = false }) {
  const study = item.source === 'study' && item.kind === 'deadline';
  const detail = item.source === 'google' ? item.event.location : item.sub;
  return (
    <li className="flex items-stretch gap-2.5" data-item={item.title}>
      {study && (
        <button type="button" role="checkbox" aria-checked={item.done} aria-label={tr('Mark {0} done', item.title)} onClick={() => toggleDeadline(item.ref.course, item.ref.id)} className={clsx('mt-2.5 grid size-6 shrink-0 place-items-center self-start rounded-full border-2 transition-all active:scale-90', item.done ? 'border-ok bg-ok text-ink-0' : 'border-line-strong text-transparent hover:text-bone-faint')}>
          <Check size={13} strokeWidth={3} aria-hidden="true" />
        </button>
      )}
      <button type="button" onClick={() => onOpen(item)} className={clsx('relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-line bg-ink-1 text-left transition-colors hover:border-line-strong active:bg-ink-2', compact ? 'py-2 pr-2.5 pl-3.5' : 'py-2.5 pr-3 pl-4')} aria-label={tr('Open: {0}', item.title || tr('Untitled'))}>
        <i className="absolute inset-y-0 left-0 w-1" style={{ background: item.color }} aria-hidden="true" />
        <span className="flex items-center gap-2 font-mono text-[0.68rem] text-bone-faint">
          <span className="tabular-nums">{timeOf(item)}</span>
          {item.source !== 'google' && <span className="rounded-full bg-wash/[0.07] px-1.5">{item.kind === 'exam' ? tr('Exam') : KIND_LABEL[item.source]}</span>}
          {item.part?.count > 1 && (
            <span className="tabular-nums">
              {item.part.index + 1}/{item.part.count}
            </span>
          )}
        </span>
        <b className={clsx('mt-0.5 block text-fine leading-snug font-medium', item.done ? 'text-bone-faint line-through' : 'text-bone', compact && 'line-clamp-2')}>{item.title || tr('Untitled')}</b>
        {detail && (
          <small className="mt-0.5 flex items-center gap-1 truncate text-[0.72rem] text-bone-faint">
            {item.source === 'google' && <MapPin size={11} aria-hidden="true" />} <span className="truncate">{detail}</span>
          </small>
        )}
      </button>
    </li>
  );
}

function DayList({ items, onOpen, empty }) {
  if (!items?.length) return <p className="px-1 py-3 text-fine text-bone-faint">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <Row key={item.uid} item={item} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function MonthView({ anchor, today, selected, days, onSelect, onOpen, onAdd, canAdd }) {
  const grid = useMemo(() => monthGrid(anchor), [anchor]);
  const names = useMemo(() => weekOf(anchor).map((key) => fmt(key, { weekday: 'short' })), [anchor]);
  const list = days.get(selected) ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div key={anchor} className="animate-fade-in rounded-[1.75rem] ink-tile p-2 md:p-3" data-month>
        <div className="grid grid-cols-7 pb-1 text-center font-mono text-[0.66rem] tracking-wide text-bone-faint uppercase">
          {names.map((name) => (
            <span key={name} className="py-1">
              {name}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {grid.map(({ key, inMonth }) => {
            const items = days.get(key) ?? [];
            const isToday = key === today;
            const isSelected = key === selected;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                aria-label={fmt(key, { weekday: 'long', day: 'numeric', month: 'long' })}
                aria-pressed={isSelected}
                data-day={key}
                className={clsx('flex min-h-[3.6rem] flex-col items-center gap-1 rounded-2xl p-1 transition-colors md:min-h-24 md:items-stretch md:p-1.5', isSelected ? 'bg-wash/[0.1] ring-1 ring-signal/60' : 'hover:bg-wash/[0.05]', !inMonth && 'opacity-40')}
              >
                <span className={clsx('numeral grid size-7 place-items-center rounded-full text-[1.05rem] md:self-start', isToday && 'bg-signal text-ink-0')}>{Number(key.slice(8))}</span>
                <span className="flex gap-0.5 md:hidden" aria-hidden="true">
                  {dots(items).map((color) => (
                    <i key={color} className="size-1.5 rounded-full" style={{ background: color }} />
                  ))}
                </span>
                <span className="hidden min-w-0 flex-col gap-0.5 text-left md:flex" aria-hidden="true">
                  {items.slice(0, 2).map((item) => (
                    <span key={item.uid} className={clsx('truncate rounded-md px-1.5 py-px text-[0.68rem] leading-snug', item.done ? 'text-bone-faint line-through' : 'text-bone-dim')} style={{ background: `color-mix(in srgb, ${item.color} 18%, transparent)` }}>
                      {item.title || tr('Untitled')}
                    </span>
                  ))}
                  {items.length > 2 && <span className="px-1 font-mono text-[0.64rem] text-bone-faint">+{items.length - 2}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="min-w-0" aria-label={fmt(selected, { weekday: 'long', day: 'numeric', month: 'long' })} data-day-panel>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h2 className="font-display text-lead text-bone">{fmt(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
          {canAdd && (
            <Button variant="ghost" size="sm" onClick={() => onAdd(selected)}>
              <Plus size={14} aria-hidden="true" /> {tr('Event')}
            </Button>
          )}
        </div>
        <DayList items={list} onOpen={onOpen} empty={tr('Nothing on this day.')} />
      </section>
    </div>
  );
}

function WeekView({ anchor, today, days, onOpen, onAdd, canAdd }) {
  return (
    <div key={anchor} className="grid animate-fade-in gap-3 md:grid-cols-7" data-week>
      {weekOf(anchor).map((key) => {
        const items = days.get(key) ?? [];
        return (
          <section key={key} className={clsx('min-w-0 rounded-[1.5rem] border p-2.5', key === today ? 'border-signal/50 bg-signal/[0.05]' : 'border-line bg-ink-1')} aria-label={fmt(key, { weekday: 'long', day: 'numeric', month: 'long' })} data-week-day={key}>
            <div className="mb-2 flex items-center justify-between gap-1 px-1">
              <h3 className="font-mono text-[0.7rem] tracking-wide text-bone-faint uppercase">
                {fmt(key, { weekday: 'short' })} <b className={clsx('numeral ml-1 text-[1.05rem]', key === today ? 'text-signal' : 'text-bone')}>{Number(key.slice(8))}</b>
              </h3>
              {canAdd && (
                <button type="button" onClick={() => onAdd(key)} aria-label={tr('Add an event on {0}', fmt(key, { day: 'numeric', month: 'long' }))} className="grid size-6 place-items-center rounded-full text-bone-faint transition-colors hover:bg-wash/10 hover:text-bone">
                  <Plus size={13} aria-hidden="true" />
                </button>
              )}
            </div>
            {items.length ? (
              <ul className="flex flex-col gap-1.5">
                {items.map((item) => (
                  <Row key={item.uid} item={item} onOpen={onOpen} compact />
                ))}
              </ul>
            ) : (
              <p className="px-1 py-1 text-[0.74rem] text-bone-faint md:hidden">{tr('Nothing on this day.')}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function AgendaView({ items, today, onOpen }) {
  const groups = useMemo(() => agendaGroups(items, today), [items, today]);
  if (!groups.length) return <div className="rounded-[1.75rem] border border-dashed border-line-strong p-6 text-fine text-bone-dim">{tr('Nothing coming up. Events, deadlines and dated tasks show up here, grouped by when.')}</div>;
  return (
    <div className="flex flex-col gap-5" data-agenda>
      {groups.map((group) => (
        <section key={group.id} aria-label={GROUP_LABEL[group.id]} data-group={group.id}>
          <h3 className={clsx('mb-2 flex items-center gap-2 px-1 font-mono text-[0.68rem] tracking-[0.12em] uppercase', group.id === 'overdue' ? 'text-danger' : 'text-bone-faint')}>
            {GROUP_LABEL[group.id]} <span className="rounded-full bg-wash/[0.07] px-1.5 tabular-nums">{group.items.length}</span>
          </h3>
          <ul className="flex flex-col gap-2">
            {group.items.map((item, index) => (
              <Fragment key={item.uid}>
                {(index === 0 || group.items[index - 1].day !== item.day) && group.id !== 'today' && group.id !== 'overdue' && (
                  <li className="mt-1 px-1 font-mono text-[0.68rem] text-bone-faint first:mt-0" aria-hidden="true">
                    {fmt(item.day, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </li>
                )}
                <Row item={item} onOpen={onOpen} />
              </Fragment>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** What stands between the owner and their Google events: not set up on the server, not connected, or Google took it back. */
function ConnectCard({ state, onConnect, busy }) {
  const { status, statusError } = state;
  if (!status && !statusError) return null;
  if (statusError)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-ink-1 p-4 text-fine text-bone-dim" data-connect-error>
        <span>{statusError}</span>
        <Button variant="ghost" size="sm" onClick={loadStatus}>
          <RefreshCw size={14} aria-hidden="true" /> {tr('Try again')}
        </Button>
      </div>
    );
  if (status.connected) return null;
  if (!status.enabled)
    return (
      <div className="rounded-2xl border border-dashed border-line-strong p-4 text-fine text-bone-dim" data-connect-off>
        <b className="block text-bone">{tr('Google Calendar is not set up on the server yet')}</b>
        <p className="mt-1">
          {tr('Set')} <code className="rounded-sm bg-ink-3 px-1 py-px">GOOGLE_CLIENT_ID</code>, <code className="rounded-sm bg-ink-3 px-1 py-px">GOOGLE_CLIENT_SECRET</code>, <code className="rounded-sm bg-ink-3 px-1 py-px">GOOGLE_REDIRECT_URI</code> {tr('and')} <code className="rounded-sm bg-ink-3 px-1 py-px">CALENDAR_TOKEN_KEY</code> {tr('on the realtime service (and a database), then redeploy. SPACEHANK_SETUP.md has the steps.')}
        </p>
      </div>
    );
  return (
    <div className="ink-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" data-connect>
      <div className="min-w-0 flex-1">
        <b className="block text-fine text-bone">{status.lost ? tr('Google asked you to sign in again') : tr('Bring in your Google Calendar')}</b>
        <p className="mt-0.5 text-fine text-bone-dim">{status.lost ? tr('The permission was taken back or has expired. Connect again to see your events.') : tr('See your events next to your deadlines and tasks, and add new ones from here.')}</p>
      </div>
      <Button size="sm" onClick={onConnect} disabled={busy} data-connect-button>
        <CalendarPlus size={14} aria-hidden="true" /> {tr('Connect Google Calendar')}
      </Button>
    </div>
  );
}

/** The calendars of the account: which are shown, and a way to disconnect. */
function Calendars({ status, onDisconnect }) {
  return (
    <div className="ink-tile flex flex-col gap-3 rounded-2xl p-4" data-calendars>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate text-fine text-bone-dim">{status.email ? tr('Connected as {0}', status.email) : tr('Connected')}</span>
        <Button variant="ghost" size="sm" onClick={onDisconnect}>
          <Unplug size={14} aria-hidden="true" /> {tr('Disconnect')}
        </Button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {status.calendars.map((c) => (
          <li key={c.id}>
            <button type="button" role="checkbox" aria-checked={c.selected} onClick={() => toggleCalendar(c.id).catch((e) => pushToast(e.message, { tone: 'error' }))} className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-fine transition-colors', c.selected ? 'border-line-strong bg-wash/[0.07] text-bone' : 'border-line text-bone-faint hover:text-bone-dim')}>
              <i className={clsx('size-2.5 rounded-full', !c.selected && 'opacity-40')} style={{ background: c.color }} aria-hidden="true" /> {c.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const RETURNED = {
  connected: () => pushToast(tr('Google Calendar is connected.')),
  denied: () => pushToast(tr('Google Calendar was not connected: the permission was not given.'), { tone: 'error' }),
  failed: () => pushToast(tr('Google Calendar could not be connected. Try again.'), { tone: 'error' }),
};

/**
 * The Calendar: the owner's Google events together with the deadlines and exams of the Study Hub, tasks with a date and tasks
 * waiting in the Inbox, as a month, a week or an agenda.
 */
export default function CalendarView({ onTab }) {
  const google = useGoogle();
  const life = useLifeData();
  const [params, setParams] = useSearchParams();
  const [view, setViewState] = useState(initialView);
  const today = dayKey();
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);
  const [sheet, setSheet] = useState(null); // { type: 'event', event?, day } or { type: 'study', item }
  const [busy, setBusy] = useState(false);
  const [showCalendars, setShowCalendars] = useState(false);

  const setView = (next) => {
    setViewState(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* the choice lasts for this visit */
    }
  };

  // Google sent the owner back here: say how it went and clear it from the address
  const returned = params.get('google');
  useEffect(() => {
    if (!returned) return;
    RETURNED[returned]?.();
    if (returned === 'connected') void loadStatus();
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete('google');
        return next;
      },
      { replace: true }
    );
  }, [returned, setParams]);

  const status = google.status;
  const connected = Boolean(status?.connected);
  const range = useMemo(() => rangeOf(view, anchor, today), [view, anchor, today]);
  useEffect(() => {
    if (connected) void loadEvents(range);
  }, [connected, range]);

  const items = useMemo(() => [...googleItems(google.events), ...localItems(life)], [google.events, life]);
  const days = useMemo(() => byDay(items), [items]);
  const writable = status?.calendars?.filter((c) => c.writable) ?? [];
  const canAdd = connected && writable.length > 0;

  const addOn = (day) => setSheet({ type: 'event', day });
  useFab(canAdd ? { label: tr('Add an event'), icon: Plus, onPress: () => addOn(selected) } : null);

  const open = (item) => {
    if (item.source === 'google') setSheet({ type: 'event', event: item.event, day: item.day });
    else if (item.source === 'study') setSheet({ type: 'study', item: item.ref });
    else onTab?.(item.source === 'task' ? 'missions' : 'hank');
  };

  const go = (direction) => {
    if (view === 'month') {
      const next = shiftMonth(anchor, direction);
      setAnchor(next);
      setSelected(next.slice(0, 7) === today.slice(0, 7) ? today : next);
    } else if (view === 'week') {
      const next = addDays(anchor, 7 * direction);
      setAnchor(next);
      setSelected(next);
    }
  };
  const toToday = () => {
    setAnchor(today);
    setSelected(today);
  };

  const connect = async () => {
    setBusy(true);
    try {
      await connectGoogle();
    } catch (error) {
      pushToast(error.message, { tone: 'error' });
      setBusy(false);
    }
  };
  const disconnect = async () => {
    try {
      await disconnectGoogle();
      setShowCalendars(false);
    } catch (error) {
      pushToast(error.message, { tone: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-4" data-calendar>
      <PageHead eyebrow={tr('CALENDAR')} title={tr('Your')} accent={tr('calendar')} description={tr('Google events, deadlines and dated tasks, in one place.')}>
        {connected && (
          <Button variant="ghost" size="sm" onClick={() => setShowCalendars((v) => !v)} aria-expanded={showCalendars}>
            <SquareKanban size={14} aria-hidden="true" /> {tr('Calendars')}
          </Button>
        )}
        {canAdd && (
          <Button size="sm" onClick={() => addOn(selected)} className="max-md:hidden" data-add-event>
            <Plus size={14} aria-hidden="true" /> {tr('Event')}
          </Button>
        )}
      </PageHead>

      <ConnectCard state={google} onConnect={connect} busy={busy} />
      {connected && showCalendars && <Calendars status={status} onDisconnect={disconnect} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {view !== 'agenda' && (
            <>
              <Button variant="ghost" size="icon" aria-label={tr('Previous')} onClick={() => go(-1)}>
                <ChevronLeft size={16} aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={tr('Next')} onClick={() => go(1)}>
                <ChevronRight size={16} aria-hidden="true" />
              </Button>
            </>
          )}
          <h2 className="min-w-0 px-1 font-display text-lead text-bone first-letter:uppercase" aria-live="polite">
            {titleOf(view, anchor)}
          </h2>
          {view !== 'agenda' && (
            <Button variant="ghost" size="sm" onClick={toToday}>
              {tr('Today')}
            </Button>
          )}
        </div>
        <Segmented value={view} onChange={setView} options={VIEWS} label={tr('View')} />
      </div>

      {google.error && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-danger/40 px-4 py-3 text-fine text-danger" role="alert">
          <span>{google.error}</span>
          <Button variant="ghost" size="sm" onClick={() => loadEvents(range, { force: true })}>
            <RefreshCw size={14} aria-hidden="true" /> {tr('Try again')}
          </Button>
        </div>
      )}

      {view === 'month' && <MonthView anchor={anchor} today={today} selected={selected} days={days} onSelect={setSelected} onOpen={open} onAdd={addOn} canAdd={canAdd} />}
      {view === 'week' && <WeekView anchor={anchor} today={today} days={days} onOpen={open} onAdd={addOn} canAdd={canAdd} />}
      {view === 'agenda' && <AgendaView items={items} today={today} onOpen={open} />}

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-mono text-[0.68rem] text-bone-faint">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={12} aria-hidden="true" /> Google
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BookOpenCheck size={12} aria-hidden="true" /> {tr('Study')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <SquareKanban size={12} aria-hidden="true" /> {tr('Tasks')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Inbox size={12} aria-hidden="true" /> {tr('Inbox')}
        </span>
        {google.loading && <span aria-live="polite">{tr('Loading…')}</span>}
      </p>

      {sheet?.type === 'event' && <EventSheet key={sheet.event ? `${sheet.event.calendarId}:${sheet.event.id}` : 'new'} event={sheet.event} day={sheet.day} calendars={status?.calendars ?? []} onClose={() => setSheet(null)} />}
      {sheet?.type === 'study' && <ItemSheet key={sheet.item.id} item={sheet.item} courseList={life.courses} onClose={() => setSheet(null)} />}
    </div>
  );
}

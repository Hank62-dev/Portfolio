import { useEffect } from 'react';
import { calendarConnect, calendarDisconnect, calendarEvents, calendarSelect, calendarStatus, createEvent, deleteEvent, updateEvent } from '../api/owner';
import { createStore, useStore } from '../store';

// What the Calendar knows about Google, in memory: whether the owner is connected, which calendars are shown, and the events
// of the range on screen. Events are asked for again when the range changes, after any change, and on request.

export const calendar = createStore({
  status: null, // null until the server has answered
  statusError: '',
  events: [],
  range: '', // which range `events` are for
  loading: false,
  error: '',
});

let wanted = null; // the range the screen last asked for: { from, to }
let ticket = 0; // only the newest answer is kept

const keyOf = ({ from, to }) => `${from.toISOString()}|${to.toISOString()}`;

export const loadStatus = async () => {
  try {
    const status = await calendarStatus();
    calendar.set({ status, statusError: '' });
    return status;
  } catch (error) {
    calendar.set({ statusError: error.message });
    return null;
  }
};

/** Reads the events of a range (nothing if the owner has not connected Google). `force` asks again even for the same range. */
export const loadEvents = async (range, { force = false } = {}) => {
  wanted = range;
  const key = keyOf(range);
  const state = calendar.get();
  if (!state.status?.connected) {
    calendar.set({ events: [], range: '', loading: false, error: '' });
    return;
  }
  if (!force && state.range === key && !state.error) return;
  const mine = ++ticket;
  calendar.set({ loading: true, error: '' });
  try {
    const { events } = await calendarEvents(range.from, range.to);
    if (mine !== ticket) return;
    calendar.set({ events, range: key, loading: false, error: '' });
  } catch (error) {
    if (mine !== ticket) return;
    calendar.set({ loading: false, error: error.message });
  }
};

const reload = () => (wanted ? loadEvents(wanted, { force: true }) : Promise.resolve());

/** Sends the owner to Google to allow access. The page leaves; Google sends the owner back to the Calendar. */
export const connectGoogle = async () => {
  const { url } = await calendarConnect();
  window.location.assign(url);
};

export const disconnectGoogle = async () => {
  await calendarDisconnect();
  ticket += 1;
  calendar.set({ status: { enabled: true, connected: false, lost: false, email: '', calendars: [] }, events: [], range: '', error: '' });
};

/** Shows or hides one calendar. */
export const toggleCalendar = async (id) => {
  const status = calendar.get().status;
  const chosen = new Set(status.calendars.filter((c) => c.selected).map((c) => c.id));
  if (chosen.has(id)) chosen.delete(id);
  else chosen.add(id);
  const { calendars } = await calendarSelect([...chosen]);
  calendar.set({ status: { ...status, calendars } });
  await reload();
};

export const saveEvent = async (input, { id } = {}) => {
  if (id) await updateEvent({ ...input, id: id.id, recurringId: id.recurringId, series: id.series });
  else await createEvent(input);
  await reload();
};

export const removeEvent = async (event, { series = false } = {}) => {
  await deleteEvent({ calendarId: event.calendarId, id: event.id, recurringId: event.recurringId, series });
  await reload();
};

/** React: the Google side of the Calendar, loaded when the screen opens. */
export const useGoogle = () => {
  const state = useStore(calendar);
  useEffect(() => {
    if (!calendar.get().status) void loadStatus();
  }, []);
  return state;
};

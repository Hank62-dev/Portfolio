import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { useLang } from '../../i18n';
import { fetchSlots, vnd } from '../../services/storeService';
import { OrderButton } from './Shop';
import { StoreFrame, StoreState, doorsOf, useStorefront } from './shared';

const dayKey = (at) => new Date(at).toDateString();

/** /book: a paid (or free) call in one of the owner's free slots: a strip of days, the times of the chosen day, then who you are. */
export default function Book() {
  const { c, lang } = useLang();
  const t = c.store.book;
  const { data, error } = useStorefront();
  const [slots, setSlots] = useState(null);
  const [day, setDay] = useState('');
  const [slot, setSlot] = useState(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [note, setNote] = useState('');
  const locale = lang === 'vi' ? 'vi-VN' : 'en-GB';

  useEffect(() => {
    if (!data?.booking) return;
    fetchSlots()
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [data]);

  const days = useMemo(() => {
    const map = new Map();
    for (const s of slots ?? []) {
      const k = dayKey(s.start);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(s);
    }
    return [...map.entries()];
  }, [slots]);
  const shownDay = day || days[0]?.[0] || '';
  const times = days.find(([k]) => k === shownDay)?.[1] ?? [];
  const booking = data?.booking;

  return (
    <StoreFrame eyebrow={t.eyebrow} title={t.title} lede={booking?.blurb} meta={booking?.title || t.eyebrow} doors={doorsOf(data, c, '/book')}>
      {!data ? (
        <StoreState error={error} />
      ) : !booking ? (
        <p className="text-bone-dim">{c.store.closed}</p>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 font-mono text-fine text-bone-dim">
              <span className="store-chip" data-on="true">
                <Clock size={13} aria-hidden="true" /> {booking.minutes} {t.minutes}
              </span>
              <span className="store-chip">{booking.price ? vnd(booking.price) : t.free_}</span>
              {booking.title && <b className="font-display text-[1.25rem] font-normal text-bone">{booking.title}</b>}
            </div>
            <h2 className="mt-8 font-mono text-fine tracking-[0.14em] text-bone-faint uppercase">{t.pick}</h2>
            {slots === null ? (
              <StoreState />
            ) : days.length === 0 ? (
              <p className="mt-3 text-bone-dim">{t.none}</p>
            ) : (
              <>
                <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-2" role="listbox" aria-label={t.pick}>
                  {days.map(([k, list]) => {
                    const d = new Date(list[0].start);
                    return (
                      <li key={k}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={k === shownDay}
                          className="store-day"
                          data-on={k === shownDay}
                          onClick={() => {
                            setDay(k);
                            setSlot(null);
                          }}
                        >
                          <small>{d.toLocaleDateString(locale, { weekday: 'short' })}</small>
                          <b>{d.getDate()}</b>
                          <small>{d.toLocaleDateString(locale, { month: 'short' })}</small>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label={shownDay}>
                  {times.map((s) => (
                    <li key={s.start}>
                      <button type="button" className="store-time" data-on={slot?.start === s.start} aria-pressed={slot?.start === s.start} onClick={() => setSlot(s)}>
                        {new Date(s.start).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <form className="store-form" onSubmit={(e) => e.preventDefault()}>
            <label>
              <span>{t.name}</span>
              <input className="store-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
            </label>
            <label>
              <span>{t.contact}</span>
              <input className="store-input" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={100} />
            </label>
            <label>
              <span>{t.note}</span>
              <textarea className="store-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
            </label>
            {slot && <p className="font-display text-[1.2rem] text-bone">{new Date(slot.start).toLocaleString(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>}
            <OrderButton input={() => ({ kind: 'booking', slot, buyer: { name, contact, note } })} disabled={!slot || !name.trim() || !contact.trim()}>
              {booking.price ? `${t.pay} · ${vnd(booking.price)}` : t.free} →
            </OrderButton>
          </form>
        </div>
      )}
    </StoreFrame>
  );
}

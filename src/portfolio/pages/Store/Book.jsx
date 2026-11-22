import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Wallet } from 'lucide-react';
import { useLang } from '../../i18n';
import { fetchSlots, vnd } from '../../services/storeService';
import { OrderButton } from './Shop';
import { StoreFrame, StoreState, doorsOf, useStorefront } from './shared';

const dayKey = (at) => new Date(at).toDateString();
// morning before noon, afternoon before six, evening after (by the visitor's own clock, which is how they read the times)
const partOf = (at) => {
  const h = new Date(at).getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
};

/** A numbered step's heading. */
const Step = ({ n, children, done }) => (
  <h2 className="store-step" data-done={done || undefined}>
    <span>{n}</span>
    {children}
  </h2>
);

/**
 * /book: a paid (or free) call in one of the owner's free slots, in three steps: a day from a strip that scrolls, a time from
 * the day's morning, afternoon or evening, then who you are; a summary beside them carries the choice and the button to pay.
 */
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
  const strip = useRef(null);
  const locale = lang === 'vi' ? 'vi-VN' : 'en-GB';
  const booking = data?.booking;

  useEffect(() => {
    if (!booking) return;
    fetchSlots()
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [booking]);

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
  const parts = ['morning', 'afternoon', 'evening'].map((p) => [p, times.filter((s) => partOf(s.start) === p)]).filter(([, l]) => l.length);
  const ready = slot && name.trim() && contact.trim();
  const timeOf = (at) => new Date(at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const scroll = (by) => strip.current?.scrollBy({ left: by * strip.current.clientWidth * 0.8, behavior: 'smooth' });

  return (
    <StoreFrame eyebrow={t.eyebrow} title={t.title} lede={booking?.blurb} meta={booking?.title || t.eyebrow} doors={doorsOf(data, c, '/book')}>
      {!data ? (
        <StoreState error={error} />
      ) : !booking ? (
        <p className="text-bone-dim">{c.store.closed}</p>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-10">
            <section>
              <Step n="1" done={Boolean(shownDay)}>
                {t.stepDay}
              </Step>
              {slots === null ? (
                <StoreState />
              ) : days.length === 0 ? (
                <p className="mt-3 text-bone-dim">{t.none}</p>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <button type="button" className="store-arrow" onClick={() => scroll(-1)} aria-label="←">
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <ul ref={strip} className="no-scrollbar flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto scroll-smooth" role="listbox" aria-label={t.stepDay}>
                    {days.map(([k, list]) => {
                      const d = new Date(list[0].start);
                      return (
                        <li key={k} className="snap-start">
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
                            <i>{list.length}</i>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <button type="button" className="store-arrow" onClick={() => scroll(1)} aria-label="→">
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </section>

            {days.length > 0 && (
              <section>
                <Step n="2" done={Boolean(slot)}>
                  {t.stepTime}
                </Step>
                <div className="mt-4 flex flex-col gap-5">
                  {parts.map(([part, list]) => (
                    <div key={part}>
                      <p className="mb-2 font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint uppercase">{t[part]}</p>
                      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                        {list.map((s) => (
                          <li key={s.start}>
                            <button type="button" className="store-time" data-on={slot?.start === s.start} aria-pressed={slot?.start === s.start} onClick={() => setSlot(s)}>
                              {timeOf(s.start)}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <p className="text-[0.78rem] text-bone-faint">{t.timezone}</p>
                </div>
              </section>
            )}

            {days.length > 0 && (
              <section>
                <Step n="3" done={Boolean(name.trim() && contact.trim())}>
                  {t.stepYou}
                </Step>
                <form className="store-form mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
                  <label>
                    <span>{t.name}</span>
                    <input className="store-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
                  </label>
                  <label>
                    <span>{t.contact}</span>
                    <input className="store-input" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={100} autoComplete="email" />
                  </label>
                  <label className="sm:col-span-2">
                    <span>{t.note}</span>
                    <textarea className="store-input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
                  </label>
                </form>
              </section>
            )}
          </div>

          <aside className="store-summary">
            <p className="font-mono text-[0.68rem] tracking-[0.16em] text-signal uppercase">{t.summary}</p>
            <h3 className="mt-2 font-display text-[1.6rem] leading-tight">{booking.title || t.eyebrow}</h3>
            <dl className="mt-5 flex flex-col gap-3 text-[0.9rem]">
              <div>
                <dt>
                  <CalendarDays size={15} aria-hidden="true" /> {t.when}
                </dt>
                <dd>{slot ? new Date(slot.start).toLocaleString(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—'}</dd>
              </div>
              <div>
                <dt>
                  <Clock size={15} aria-hidden="true" /> {t.length}
                </dt>
                <dd>
                  {booking.minutes} {t.minutes}
                </dd>
              </div>
              <div>
                <dt>
                  <Wallet size={15} aria-hidden="true" /> {t.price}
                </dt>
                <dd>{booking.price ? vnd(booking.price) : t.free_}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <OrderButton input={() => ({ kind: 'booking', slot, buyer: { name, contact, note } })} disabled={!ready} className="store-buy w-full">
                {booking.price ? `${t.pay} · ${vnd(booking.price)}` : t.free} →
              </OrderButton>
              {!ready && <p className="mt-2 text-center text-[0.78rem] text-bone-faint">{t.pickFirst}</p>}
            </div>
          </aside>
        </div>
      )}
    </StoreFrame>
  );
}

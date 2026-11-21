import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarCheck, Download, PartyPopper, Printer } from 'lucide-react';
import { useLang } from '../../i18n';
import { fetchOrder, fetchStore, vnd } from '../../services/storeService';
import { PayBox, StoreFrame, StoreState, dateTime } from './shared';

const POLL_MS = 5000;
const POLL_FOR_MS = 40 * 60 * 1000;
const HOLD_MS = { booking: 30 * 60 * 1000 };
const LIFE_MS = 2 * 24 * 3600 * 1000;

/** An invoice laid out as a sheet: who it is from and to, its lines, its total and its due date; printable. */
function InvoiceSheet({ order }) {
  const { c, lang } = useLang();
  const t = c.store.pay;
  const overdue = order.status === 'pending' && order.dueAt && order.dueAt < Date.now();
  const day = (at) => new Date(at).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <article className="store-invoice">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.7rem] tracking-[0.18em] uppercase">
            {t.invoice} · {order.code}
          </p>
          <h2 className="mt-2 font-display text-[1.8rem] leading-tight">{order.title}</h2>
        </div>
        <p className="text-right text-[0.9rem]">
          {order.from && (
            <>
              <small className="block font-mono text-[0.66rem] uppercase opacity-60">{t.issuer}</small>
              {order.from}
            </>
          )}
          {order.client && (
            <>
              <small className="mt-2 block font-mono text-[0.66rem] uppercase opacity-60">{t.billed}</small>
              {order.client}
            </>
          )}
        </p>
      </header>
      <table className="mt-6 w-full text-left text-[0.92rem]">
        <thead>
          <tr className="font-mono text-[0.66rem] uppercase opacity-60">
            <th className="py-2 font-normal">{t.item}</th>
            <th className="py-2 text-right font-normal">{t.qty}</th>
            <th className="py-2 text-right font-normal">{t.price}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it, i) => (
            <tr key={i} className="border-t border-current/10">
              <td className="py-2.5 pr-3">{it.desc}</td>
              <td className="py-2.5 text-right tabular-nums">{it.qty}</td>
              <td className="py-2.5 text-right tabular-nums">{vnd(it.unit * it.qty)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-current/30">
            <td className="pt-3 font-mono text-[0.72rem] uppercase" colSpan={2}>
              {t.total}
            </td>
            <td className="pt-3 text-right font-display text-[1.5rem] tabular-nums">{vnd(order.amount)}</td>
          </tr>
        </tfoot>
      </table>
      {order.note && <p className="mt-5 text-[0.88rem] whitespace-pre-line opacity-75">{order.note}</p>}
      {order.dueAt && (
        <p className={overdue ? 'mt-5 font-mono text-[0.78rem] text-[#b3261e]' : 'mt-5 font-mono text-[0.78rem] opacity-70'}>
          {overdue ? t.overdue : t.due}: {day(order.dueAt)}
        </p>
      )}
    </article>
  );
}

/** /pay/:id: an order's page. Pending: how to pay, and it watches for the money. Paid: the download, the booking or the welcome. */
export default function Pay() {
  const { id } = useParams();
  const { c, lang } = useLang();
  const t = c.store.pay;
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [autoPay, setAutoPay] = useState(false);

  useEffect(() => {
    let live = true;
    let timer = 0;
    const started = Date.now();
    const load = async () => {
      try {
        const next = await fetchOrder(id);
        if (!live) return;
        setOrder(next);
        if (next.status === 'pending' && Date.now() - started < POLL_FOR_MS) timer = window.setTimeout(load, document.hidden ? POLL_MS * 3 : POLL_MS);
      } catch (e) {
        if (live) setError(e);
      }
    };
    void load();
    fetchStore()
      .then((s) => live && setAutoPay(Boolean(s.autoPay)))
      .catch(() => undefined);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [id]);

  const expired = order && order.status === 'pending' && order.kind !== 'invoice' && Date.now() - order.createdAt > (HOLD_MS[order.kind] ?? LIFE_MS);
  const title = order?.kind === 'invoice' ? [t.invoice, order.code] : [t.eyebrow, order ? vnd(order.amount) : ''];

  return (
    <StoreFrame eyebrow={order?.title || t.eyebrow} title={title} meta={t.eyebrow}>
      {error ? (
        <p className="text-bone-dim">{error.status === 404 ? t.missing : c.store.offline}</p>
      ) : !order ? (
        <StoreState />
      ) : (
        <div className="flex flex-col gap-10">
          {order.kind === 'invoice' && <InvoiceSheet order={order} />}

          {order.status === 'paid' ? (
            <section className="store-paid" role="status">
              <PartyPopper size={28} strokeWidth={1.5} aria-hidden="true" />
              <h2 className="mt-3 font-display text-h3">{t.paid}</h2>
              {order.kind === 'product' && order.delivery && (
                <a href={order.delivery} target="_blank" rel="noreferrer" className="store-buy mt-5 inline-flex">
                  <Download size={16} aria-hidden="true" /> {t.download}
                </a>
              )}
              {order.kind === 'booking' && order.slot && (
                <p className="mt-3 flex items-center gap-2 text-lead">
                  <CalendarCheck size={18} aria-hidden="true" /> {t.booked} {dateTime(order.slot.start, lang)}
                </p>
              )}
              {order.kind === 'membership' && (
                <p className="mt-3 text-lead">
                  {t.member} {order.expiresAt && `${t.until} ${new Date(order.expiresAt).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-GB')}.`}
                </p>
              )}
              {order.kind === 'tip' && <p className="mt-3 text-lead">{t.tipped}</p>}
            </section>
          ) : order.status === 'cancelled' ? (
            <p className="text-bone-dim">{t.cancelled}</p>
          ) : expired ? (
            <p className="text-bone-dim">{t.expired}</p>
          ) : (
            <>
              {order.kind === 'booking' && order.slot && <p className="text-lead text-bone">{dateTime(order.slot.start, lang)}</p>}
              <PayBox order={order} autoPay={autoPay} />
            </>
          )}

          <div className="flex flex-wrap gap-3">
            {order.kind === 'invoice' && (
              <button type="button" className="store-chip" onClick={() => window.print()}>
                <Printer size={14} aria-hidden="true" /> {t.print}
              </button>
            )}
            {order.kind !== 'invoice' && (
              <Link to="/shop" className="store-door">
                ← {t.back}
              </Link>
            )}
          </div>
        </div>
      )}
    </StoreFrame>
  );
}

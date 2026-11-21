import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import { useLang } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { clsx } from '../../../shared/lib/format';
import { fetchStore, qrImage, vnd } from '../../services/storeService';

/** What the shop offers (from the server), loaded once per page: { data, error }. */
export const useStorefront = () => {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let live = true;
    fetchStore()
      .then((data) => live && setState({ data, error: null }))
      .catch((error) => live && setState({ data: null, error }));
    return () => {
      live = false;
    };
  }, []);
  return state;
};

/** The frame every storefront page sits in: an eyebrow, a two-line title, a line under it, and the other doors of the shop. */
export function StoreFrame({ eyebrow, title, lede, meta, children, wide = false, doors }) {
  const { c } = useLang();
  usePageMeta({ title: `${meta ?? eyebrow} — Võ Gia Huy`, description: lede || eyebrow });
  return (
    <section className="store-page pt-[calc(var(--spacing-header)+40px)] pb-24">
      <div className={clsx('wrap', !wide && 'max-w-[1080px]')}>
        <p className="font-mono text-fine tracking-[0.18em] text-signal uppercase">{eyebrow}</p>
        <h1 className="mt-4 font-display text-[clamp(2.6rem,1.6rem+5vw,5.6rem)] leading-[0.95] tracking-tight">
          {title[0]}
          <br />
          <span className="serif-accent">{title[1]}</span>
        </h1>
        {lede && <p className="mt-5 max-w-[56ch] text-lead text-bone-dim">{lede}</p>}
        <div className="mt-12">{children}</div>
        {doors?.length > 0 && (
          <nav className="mt-20 border-t border-line pt-6" aria-label={c.store.shop.more}>
            <p className="font-mono text-fine text-bone-faint uppercase">{c.store.shop.more}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {doors.map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="store-door">
                    {label} <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}

/** The other pages of the shop that have something open. */
export const doorsOf = (data, c, except) =>
  [
    data?.products?.length && ['/shop', c.store.nav.shop],
    data?.booking && ['/book', c.store.nav.book],
    data?.tiers?.length && ['/join', c.store.nav.join],
    (data?.kit?.headline || data?.kit?.stats?.length) && ['/kit', c.store.nav.kit],
    data?.links?.length && ['/me', c.store.nav.me],
  ].filter((d) => d && d[0] !== except);

/** Loading, offline or closed: one quiet line instead of the page. */
export const StoreState = ({ error, children }) => {
  const { c } = useLang();
  if (error) return <p className="font-mono text-fine text-danger">{c.store.offline}</p>;
  return <p className="font-mono text-fine text-bone-dim" role="status">{children ?? c.store.loading}</p>;
};

export function CopyField({ label, value, mono = true }) {
  const { c } = useLang();
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
      <span className="min-w-0">
        <small className="block font-mono text-[0.66rem] tracking-[0.12em] text-bone-faint uppercase">{label}</small>
        <b className={clsx('block truncate font-medium text-bone', mono && 'font-mono tracking-wide')}>{value}</b>
      </span>
      <button
        type="button"
        className="store-chip shrink-0"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(String(value));
            setDone(true);
            window.setTimeout(() => setDone(false), 1500);
          } catch {
            /* the visitor can select it by hand */
          }
        }}
      >
        {done ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} {done ? c.store.pay.copied : c.store.pay.copy}
      </button>
    </div>
  );
}

/** How to pay an order: the QR for the banking app, and the same details to type by hand, with the code that matches it. */
export function PayBox({ order, autoPay }) {
  const { c } = useLang();
  const t = c.store.pay;
  if (!order.bank) return null;
  return (
    <div className="store-paybox grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
      <figure className="store-qr">
        <img src={qrImage(order.bank, order.amount, order.code)} alt={t.scan} width="280" height="280" />
        <figcaption>{t.scan}</figcaption>
      </figure>
      <div className="min-w-0">
        <p className="mb-2 font-mono text-[0.68rem] tracking-[0.14em] text-bone-faint uppercase">{t.manual}</p>
        <CopyField label={t.bank} value={order.bank.bin} />
        <CopyField label={t.account} value={order.bank.account} />
        <CopyField label={t.holder} value={order.bank.name} mono={false} />
        <CopyField label={t.amount} value={vnd(order.amount)} />
        <CopyField label={t.memo} value={order.code} />
        <p className="mt-4 flex items-center gap-2 text-fine text-bone-dim">
          <i className="store-pulse" aria-hidden="true" /> {t.waiting}
        </p>
        <p className="mt-1 text-[0.82rem] text-bone-faint">{autoPay ? t.auto : t.byHand}</p>
      </div>
    </div>
  );
}

export const dateTime = (at, lang) => new Date(at).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

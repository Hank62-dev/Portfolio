import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Coffee, Download, ShieldCheck } from 'lucide-react';
import { useLang } from '../../i18n';
import { placeOrder, vnd } from '../../services/storeService';
import { MoneyField, StoreFrame, StoreModal, StoreState, doorsOf, useStorefront } from './shared';

const PAGE = 9;

/** A button that places an order and goes to its payment page; it turns while it works, and says what went wrong under it. */
export function OrderButton({ input, children, className = 'store-buy', disabled }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <button
        type="button"
        className={`${className}${busy ? ' is-busy' : ''}`}
        aria-busy={busy || undefined}
        disabled={busy || disabled}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const order = await placeOrder(typeof input === 'function' ? input() : input);
            navigate(`/pay/${order.id}`);
          } catch (e) {
            setError(e.message);
            setBusy(false);
          }
        }}
      >
        {children}
      </button>
      {error && (
        <p className="mt-2 text-[0.82rem] text-danger" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/** The tip jar: a few amounts, or one of the visitor's own. */
export function TipJar({ amounts }) {
  const { c } = useLang();
  const [amount, setAmount] = useState(amounts[1] ?? amounts[0]);
  const [own, setOwn] = useState(0);
  const chosen = own || amount;
  return (
    <section className="store-tip" aria-labelledby="tip-title">
      <Coffee size={22} strokeWidth={1.5} aria-hidden="true" className="text-signal" />
      <h2 id="tip-title" className="mt-3 font-display text-h3">
        {c.store.shop.tipTitle}
      </h2>
      <p className="mt-2 max-w-[42ch] text-bone-dim">{c.store.shop.tipLede}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2" role="radiogroup" aria-label={c.store.shop.tipTitle}>
        {amounts.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={!own && amount === a}
            onClick={() => {
              setAmount(a);
              setOwn(0);
            }}
            className="store-chip"
            data-on={!own && amount === a}
          >
            {vnd(a)}
          </button>
        ))}
        <span className="w-44">
          <MoneyField value={own} onChange={setOwn} placeholder={c.store.shop.tipOther} label={c.store.shop.tipOther} />
        </span>
      </div>
      <div className="mt-5">
        <OrderButton input={{ kind: 'tip', amount: chosen }} disabled={!chosen || chosen < 10000}>
          {c.store.shop.tip} · {vnd(chosen || 0)}
        </OrderButton>
      </div>
    </section>
  );
}

/** A product's cover, or its first letter on a glow when it has none. */
const Cover = ({ product, className = 'store-product-cover' }) => <div className={className}>{product.cover ? <img src={product.cover} alt="" loading="lazy" /> : <span aria-hidden="true">{product.title.slice(0, 1)}</span>}</div>;

/** One product in full: its picture, everything said about it, what happens once it is paid, and the Buy button. */
function ProductDetails({ product, onClose }) {
  const { c } = useLang();
  const t = c.store.shop;
  return (
    <StoreModal open onClose={onClose} title={product.title} wide>
      <div className="grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Cover product={product} className="store-detail-cover" />
        <div className="flex flex-col p-6 md:p-8">
          <h2 className="font-display text-[2rem] leading-tight">{product.title}</h2>
          <b className="mt-3 font-mono text-[1.3rem] font-medium text-bone">{vnd(product.price)}</b>
          {product.blurb && <p className="mt-5 text-[0.98rem] leading-relaxed whitespace-pre-line text-bone-dim">{product.blurb}</p>}
          <ul className="mt-6 flex flex-col gap-2.5 text-[0.85rem] text-bone-dim">
            <li className="flex gap-2.5">
              <Download size={16} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" /> {t.instant}
            </li>
            <li className="flex gap-2.5">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" /> {t.secure}
            </li>
          </ul>
          <div className="mt-auto pt-8">
            <OrderButton input={{ kind: 'product', ref: product.id }} className="store-buy w-full">
              {t.buy} · {vnd(product.price)} →
            </OrderButton>
          </div>
        </div>
      </div>
    </StoreModal>
  );
}

/** /shop: the digital products as cards (a page of nine at a time), each opening its details; the tip jar under them. */
export default function Shop() {
  const { c } = useLang();
  const { data, error } = useStorefront();
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(null);
  const t = c.store.shop;
  const products = data?.products ?? [];
  const pages = Math.max(1, Math.ceil(products.length / PAGE));
  const shown = products.slice(page * PAGE, page * PAGE + PAGE);
  const current = products.find((p) => p.id === open);

  return (
    <StoreFrame eyebrow={t.eyebrow} title={t.title} lede={t.lede} doors={doorsOf(data, c, '/shop')}>
      {!data ? (
        <StoreState error={error} />
      ) : (
        <>
          {products.length === 0 ? (
            <p className="text-bone-dim">{t.empty}</p>
          ) : (
            <>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((p, i) => (
                  <li key={p.id} className="store-product" style={{ '--i': i }}>
                    <button type="button" className="store-product-open" onClick={() => setOpen(p.id)} aria-label={`${t.details}: ${p.title}`}>
                      <Cover product={p} />
                    </button>
                    <div className="flex flex-1 flex-col p-5">
                      <button type="button" onClick={() => setOpen(p.id)} className="text-left">
                        <h2 className="font-display text-[1.5rem] leading-tight hover:text-signal">{p.title}</h2>
                      </button>
                      {p.blurb && <p className="mt-2 line-clamp-3 text-[0.92rem] leading-relaxed text-bone-dim">{p.blurb}</p>}
                      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                        <b className="font-mono text-[1.1rem] text-bone">{vnd(p.price)}</b>
                        <span className="flex gap-2">
                          <button type="button" className="store-chip" onClick={() => setOpen(p.id)}>
                            {t.details}
                          </button>
                          <OrderButton input={{ kind: 'product', ref: p.id }}>{t.buy} →</OrderButton>
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-2" aria-label={t.eyebrow}>
                  <button type="button" className="store-chip" onClick={() => setPage(page - 1)} disabled={page === 0} aria-label={t.prev}>
                    <ChevronLeft size={15} aria-hidden="true" />
                  </button>
                  {Array.from({ length: pages }, (_, i) => (
                    <button key={i} type="button" className="store-chip" data-on={i === page} aria-current={i === page ? 'page' : undefined} onClick={() => setPage(i)}>
                      {i + 1}
                    </button>
                  ))}
                  <button type="button" className="store-chip" onClick={() => setPage(page + 1)} disabled={page >= pages - 1} aria-label={t.next}>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </nav>
              )}
            </>
          )}
          {data.tips && (
            <div className="mt-14">
              <TipJar amounts={data.tips.amounts} />
            </div>
          )}
          {current && <ProductDetails product={current} onClose={() => setOpen(null)} />}
        </>
      )}
    </StoreFrame>
  );
}

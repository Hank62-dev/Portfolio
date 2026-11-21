import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import { useLang } from '../../i18n';
import { placeOrder, vnd } from '../../services/storeService';
import { StoreFrame, StoreState, doorsOf, useStorefront } from './shared';

/** A button that places an order and goes to its payment page; says what went wrong under it. */
export function OrderButton({ input, children, className = 'store-buy', disabled }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <button
        type="button"
        className={className}
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
  const [own, setOwn] = useState('');
  const chosen = own ? Number(own.replace(/\D/g, '')) : amount;
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
              setOwn('');
            }}
            className="store-chip"
            data-on={!own && amount === a}
          >
            {vnd(a)}
          </button>
        ))}
        <input className="store-input w-40" inputMode="numeric" placeholder={c.store.shop.tipOther} value={own} onChange={(e) => setOwn(e.target.value.replace(/[^\d.]/g, ''))} aria-label={c.store.shop.tipOther} />
      </div>
      <div className="mt-5">
        <OrderButton input={{ kind: 'tip', amount: chosen }} disabled={!chosen || chosen < 10000}>
          {c.store.shop.tip} · {vnd(chosen || 0)}
        </OrderButton>
      </div>
    </section>
  );
}

/** /shop: the digital products, each a card with its cover, its price and a Buy button; the tip jar under them. */
export default function Shop() {
  const { c } = useLang();
  const { data, error } = useStorefront();
  const t = c.store.shop;
  return (
    <StoreFrame eyebrow={t.eyebrow} title={t.title} lede={t.lede} doors={doorsOf(data, c, '/shop')}>
      {!data ? (
        <StoreState error={error} />
      ) : (
        <>
          {data.products.length === 0 ? (
            <p className="text-bone-dim">{t.empty}</p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.products.map((p, i) => (
                <li key={p.id} className="store-product" style={{ '--i': i }}>
                  <div className="store-product-cover">
                    {p.cover ? <img src={p.cover} alt="" loading="lazy" /> : <span aria-hidden="true">{p.title.slice(0, 1)}</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-display text-[1.5rem] leading-tight">{p.title}</h2>
                    {p.blurb && <p className="mt-2 line-clamp-4 text-[0.92rem] leading-relaxed text-bone-dim">{p.blurb}</p>}
                    <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                      <b className="font-mono text-[1.1rem] text-bone">{vnd(p.price)}</b>
                      <div>
                        <OrderButton input={{ kind: 'product', ref: p.id }}>{t.buy} →</OrderButton>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data.tips && (
            <div className="mt-14">
              <TipJar amounts={data.tips.amounts} />
            </div>
          )}
        </>
      )}
    </StoreFrame>
  );
}

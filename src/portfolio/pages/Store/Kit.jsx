import { useState } from 'react';
import { useLang } from '../../i18n';
import { sendLead, vnd } from '../../services/storeService';
import { StoreFrame, StoreState, doorsOf, useStorefront } from './shared';

const compact = (n, lang) => new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/** /kit: the media kit for brands: reach by platform, the audience, the rates, who it has worked with, and a form that lands in Deals. */
export default function Kit() {
  const { c, lang } = useLang();
  const t = c.store.kit;
  const { data, error } = useStorefront();
  const [form, setForm] = useState({ name: '', contact: '', company: '', budget: '', message: '', rate: '' });
  const [state, setState] = useState({ busy: false, sent: false, error: '' });
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const kit = data?.kit;
  const reach = (kit?.stats ?? []).reduce((n, s) => n + s.followers, 0);

  const submit = async (e) => {
    e.preventDefault();
    setState({ busy: true, sent: false, error: '' });
    try {
      await sendLead({ ...form, budget: Number(form.budget.replace(/\D/g, '')) || 0 });
      setState({ busy: false, sent: true, error: '' });
    } catch (err) {
      setState({ busy: false, sent: false, error: err.message });
    }
  };

  return (
    <StoreFrame eyebrow={t.eyebrow} title={t.title} lede={kit?.headline} meta={t.eyebrow} doors={doorsOf(data, c, '/kit')}>
      {!data ? (
        <StoreState error={error} />
      ) : (
        <div className="flex flex-col gap-16">
          {kit.stats.length > 0 && (
            <section aria-label={t.reach}>
              <p className="font-mono text-fine tracking-[0.14em] text-bone-faint uppercase">{t.reach}</p>
              <p className="mt-2 font-display text-[clamp(3rem,2rem+5vw,6rem)] leading-none tabular-nums">{compact(reach, lang)}</p>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kit.stats.map((s) => (
                  <li key={`${s.platform}${s.handle}`} className="store-stat">
                    <small>{s.platform}</small>
                    {s.handle && <span className="font-mono text-[0.8rem] text-bone-faint">{s.handle}</span>}
                    <b>{compact(s.followers, lang)}</b>
                    <span>{t.followers}</span>
                    {s.avgViews > 0 && (
                      <span className="mt-2 font-mono text-[0.8rem] text-bone-dim">
                        {compact(s.avgViews, lang)} {t.avgViews}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(kit.about || kit.audience) && (
            <section className="grid gap-8 md:grid-cols-2">
              {kit.about && <p className="text-lead whitespace-pre-line text-bone-dim">{kit.about}</p>}
              {kit.audience && (
                <div>
                  <p className="font-mono text-fine tracking-[0.14em] text-bone-faint uppercase">{t.audience}</p>
                  <p className="mt-3 whitespace-pre-line text-bone">{kit.audience}</p>
                </div>
              )}
            </section>
          )}

          {kit.rates.length > 0 && (
            <section aria-labelledby="rates">
              <h2 id="rates" className="font-mono text-fine tracking-[0.14em] text-bone-faint uppercase">
                {t.rates}
              </h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {kit.rates.map((r) => (
                  <li key={r.title} className="grid items-baseline gap-2 py-5 md:grid-cols-[minmax(0,1fr)_auto]">
                    <span>
                      <b className="font-display text-[1.5rem] font-normal">{r.title}</b>
                      {r.detail && <span className="mt-1 block text-[0.92rem] text-bone-dim">{r.detail}</span>}
                    </span>
                    {r.price > 0 && (
                      <span className="font-mono text-bone">
                        <small className="text-bone-faint">{t.from} </small>
                        {vnd(r.price)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {kit.brands && (
                <p className="mt-6 text-bone-dim">
                  <span className="font-mono text-fine text-bone-faint uppercase">{t.brands}: </span>
                  {kit.brands}
                </p>
              )}
            </section>
          )}

          <section aria-labelledby="enquiry" className="store-tip">
            <h2 id="enquiry" className="font-display text-h3">
              {t.form}
            </h2>
            {state.sent ? (
              <p className="mt-4 text-lead text-ok" role="status">
                {t.sent}
              </p>
            ) : (
              <form onSubmit={submit} className="store-form mt-6 grid gap-4 md:grid-cols-2">
                <label>
                  <span>{t.name}</span>
                  <input className="store-input" value={form.name} onChange={set('name')} maxLength={60} required />
                </label>
                <label>
                  <span>{t.contact}</span>
                  <input className="store-input" value={form.contact} onChange={set('contact')} maxLength={100} required />
                </label>
                <label>
                  <span>{t.company}</span>
                  <input className="store-input" value={form.company} onChange={set('company')} maxLength={80} />
                </label>
                <label>
                  <span>{t.budget}</span>
                  <input className="store-input" inputMode="numeric" value={form.budget} onChange={set('budget')} maxLength={14} />
                </label>
                {kit.rates.length > 0 && (
                  <label className="md:col-span-2">
                    <span>{t.rates}</span>
                    <select className="store-input" value={form.rate} onChange={set('rate')}>
                      <option value="">—</option>
                      {kit.rates.map((r) => (
                        <option key={r.title} value={r.title}>
                          {r.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="md:col-span-2">
                  <span>{t.message}</span>
                  <textarea className="store-input" rows={5} value={form.message} onChange={set('message')} maxLength={1500} required minLength={10} />
                </label>
                <div className="md:col-span-2">
                  <button type="submit" className={`store-buy${state.busy ? ' is-busy' : ''}`} aria-busy={state.busy || undefined} disabled={state.busy}>
                    {t.send} →
                  </button>
                  {state.error && (
                    <p className="mt-2 text-[0.82rem] text-danger" role="alert">
                      {state.error}
                    </p>
                  )}
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </StoreFrame>
  );
}

import { useMemo } from 'react';
import { tr } from '../../core/i18n/lang';
import { vndShort } from './model';
import { funnel } from './studio';
import { STAGE_HUE } from './ui';

const OPEN = ['lead', 'contacted', 'negotiating'];
// a deal's ball grows with its worth, within reason
const sizeOf = (value, top) => 14 + Math.round(16 * Math.sqrt(top ? value / top : 0));

/**
 * The deals as a real funnel: three tiers narrowing (lead, contacted, negotiating), every open deal a ball that drops into its
 * tier, larger when it is worth more; under the spout the won ones are coins, the lost ones lie aside. A ball opens its deal.
 */
export default function Funnel({ deals, onOpen }) {
  const stages = useMemo(() => funnel(deals), [deals]);
  const top = Math.max(1, ...deals.map((d) => d.value || 0));
  const won = deals.filter((d) => d.stage === 'won');
  const lost = deals.filter((d) => d.stage === 'lost');

  return (
    <section className="cl-surface cl-rise relative overflow-hidden rounded-[1.75rem] border border-line p-4 md:p-6" aria-label={tr('The funnel')} data-funnel>
      <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="cl-funnel">
          {OPEN.map((id, tier) => {
            const stage = stages.find((s) => s.id === id);
            const here = deals.filter((d) => d.stage === id).slice(0, 14);
            return (
              <div key={id} className="cl-funnel-tier" style={{ '--tier': tier, '--hue': STAGE_HUE[id] ?? 220 }}>
                <span className="cl-funnel-label">
                  {stage.label} <b>{stage.count}</b>
                  {stage.value > 0 && <em>{vndShort(stage.value)}</em>}
                </span>
                <span className="cl-funnel-balls">
                  {here.map((d, i) => (
                    <button key={d.id} type="button" className="cl-ball" style={{ '--s': `${sizeOf(d.value, top)}px`, '--d': `${i * 70 + tier * 120}ms` }} onClick={() => onOpen(d)} aria-label={`${d.name}${d.value ? ` · ${vndShort(d.value)}` : ''}`} title={d.name} />
                  ))}
                </span>
              </div>
            );
          })}
          <i className="cl-funnel-spout" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="font-mono text-[0.68rem] tracking-[0.14em] text-ok uppercase">
              {tr('Won')} · {won.length}
            </p>
            <div className="cl-coins mt-2">
              {won.length === 0 ? (
                <span className="text-[0.8rem] text-bone-faint">{tr('The first won deal lands here as a coin.')}</span>
              ) : (
                won.slice(0, 18).map((d, i) => (
                  <button key={d.id} type="button" className="cl-coin" style={{ '--d': `${400 + i * 90}ms` }} onClick={() => onOpen(d)} title={d.name} aria-label={`${d.name}${d.value ? ` · ${vndShort(d.value)}` : ''}`}>
                    ₫
                  </button>
                ))
              )}
            </div>
            {stages.find((s) => s.id === 'won').value > 0 && <b className="mt-2 block font-display text-[1.6rem] text-ok tabular-nums">{vndShort(stages.find((s) => s.id === 'won').value)}</b>}
          </div>
          {lost.length > 0 && (
            <p className="text-[0.78rem] text-bone-faint">
              {tr('Lost')} · {lost.length}: {lost.slice(0, 4).map((d) => d.name).join(', ')}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

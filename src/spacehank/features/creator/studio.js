import { tr } from '../../core/i18n/lang';
import { DEAL_STAGES, dueFollowUps, dueToPost, monthKeyOf, newIncome, sourceLabel } from './model';

// The Creator Lab's newer half as plain functions: the storefront's orders turned into income, the one move most likely to bring
// money in today, the deals as a funnel, the posting streak and its calendar, and the week looked back on. No network here.

const DAY = 86400000;

// ---------------------------------------------------------------- the storefront's orders

/** Which income source a paid order of each kind counts as. */
export const ORDER_SOURCE = { product: 'product', booking: 'calls', membership: 'membership', tip: 'membership', invoice: 'freelance' };

/** The address a visitor pays an order at (and a client opens an invoice at). */
export const payLink = (origin, order) => `${origin}/pay/${order.id}`;

/** Where an order stands: paid, done, cancelled, overdue (an invoice past its date), expired (a hold that lapsed), new (an enquiry) or pending. Pure. */
export const orderState = (order, now = Date.now()) => {
  if (order.kind === 'lead') return order.status === 'done' ? 'done' : 'new';
  if (order.status === 'paid' || order.status === 'cancelled' || order.status === 'done') return order.status;
  if (order.kind === 'invoice') return order.dueAt && order.dueAt < now ? 'overdue' : 'pending';
  const life = order.kind === 'booking' ? 30 * 60 * 1000 : 2 * DAY;
  return now - order.createdAt > life ? 'expired' : 'pending';
};

/** The paid orders that have no income entry yet, as new entries: the Money tab fills in by itself. Pure. */
export const incomeFromOrders = (orders, entries) => {
  const logged = new Set(entries.map((e) => e.orderId).filter(Boolean));
  return orders
    .filter((o) => o.status === 'paid' && o.kind !== 'lead' && (o.received ?? o.amount) > 0 && !logged.has(o.id))
    .map((o) => newIncome({ amount: o.received ?? o.amount, source: ORDER_SOURCE[o.kind] ?? 'other', at: o.paidAt ?? o.createdAt, note: `${o.title} · ${o.code}`, orderId: o.id }));
};

/** The storefront at a glance: sold today and this month, what waits to be paid, overdue invoices and unread enquiries. Pure. */
export const salesSummary = (orders, now = Date.now()) => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const month = monthKeyOf(now);
  const paid = orders.filter((o) => o.status === 'paid' && o.kind !== 'lead');
  const pending = orders.filter((o) => orderState(o, now) === 'pending' || orderState(o, now) === 'overdue');
  return {
    today: paid.filter((o) => (o.paidAt ?? 0) >= start.getTime()).reduce((n, o) => n + (o.received ?? o.amount), 0),
    month: paid.filter((o) => monthKeyOf(o.paidAt ?? o.createdAt) === month).reduce((n, o) => n + (o.received ?? o.amount), 0),
    sales: paid.filter((o) => monthKeyOf(o.paidAt ?? o.createdAt) === month).length,
    waiting: pending.reduce((n, o) => n + o.amount, 0),
    overdue: orders.filter((o) => orderState(o, now) === 'overdue'),
    leads: orders.filter((o) => orderState(o, now) === 'new'),
  };
};

/** Taps on a short link per day for the last `days` days, oldest first: [{ day: 'YYYY-MM-DD', n }]. Pure. */
export const clicksSeries = (count, days = 14, now = Date.now()) =>
  Array.from({ length: days }, (_, i) => {
    const day = new Date(now - (days - 1 - i) * DAY).toISOString().slice(0, 10);
    return { day, n: count?.days?.[day] ?? 0 };
  });

/** A deal made from an enquiry that came in through the media kit. */
export const dealFromLead = (lead) => ({
  name: lead.buyer?.company || lead.buyer?.name || lead.title,
  kind: 'sponsor',
  channel: /@/.test(lead.buyer?.contact ?? '') ? 'Email' : 'Other',
  value: lead.amount || 0,
  note: [lead.ref && `${tr('Rate')}: ${lead.ref}`, lead.buyer?.name && `${lead.buyer.name} · ${lead.buyer.contact}`, lead.buyer?.note].filter(Boolean).join('\n').slice(0, 600),
});

// ---------------------------------------------------------------- the one move today

/**
 * The single thing most likely to bring money in today, in this order: an overdue invoice, an unanswered enquiry, a follow-up
 * that is due (the biggest first), something to post today, a deal with no next step, then whatever gets the shop going.
 * Returns { kind, title, detail, value, section, id }. Pure.
 */
export const moneyMove = ({ orders = [], deals = [], pieces = [], hasShop = false, now = Date.now() }) => {
  const overdue = orders.filter((o) => orderState(o, now) === 'overdue').sort((a, b) => b.amount - a.amount)[0];
  if (overdue) return { kind: 'invoice', title: tr('Chase the invoice for {0}', overdue.buyer?.name || overdue.title), detail: now - overdue.dueAt < 2 * DAY ? tr('A day overdue') : tr('{0} days overdue', Math.floor((now - overdue.dueAt) / DAY)), value: overdue.amount, section: 'store', id: overdue.id };
  const lead = orders.filter((o) => orderState(o, now) === 'new').sort((a, b) => a.createdAt - b.createdAt)[0];
  if (lead) return { kind: 'lead', title: tr('Answer {0}', lead.title), detail: tr('A brand wrote from the media kit'), value: lead.amount, section: 'kit', id: lead.id };
  const follow = dueFollowUps(deals, now).sort((a, b) => b.value - a.value)[0];
  if (follow) return { kind: 'deal', title: tr('Follow up with {0}', follow.name), detail: follow.followUpAt < now - 2 * DAY ? tr('{0} days late', Math.floor((now - follow.followUpAt) / DAY)) : follow.followUpAt < now - DAY ? tr('A day late') : tr('Due today'), value: follow.value, section: 'deals', id: follow.id };
  const post = dueToPost(pieces, now)[0];
  if (post) return { kind: 'post', title: tr('Post “{0}”', post.title), detail: tr('It is due today'), value: 0, section: 'pipeline', id: post.id };
  const stuck = deals.filter((d) => !['won', 'lost'].includes(d.stage) && !d.followUpAt).sort((a, b) => b.value - a.value)[0];
  if (stuck) return { kind: 'deal', title: tr('Give {0} a next step', stuck.name), detail: tr('No follow-up date: it will be forgotten'), value: stuck.value, section: 'deals', id: stuck.id };
  if (!hasShop) return { kind: 'shop', title: tr('Put one thing on sale'), detail: tr('A template, a starter kit or a paid call: the shop takes payments by QR'), value: 0, section: 'store', id: '' };
  return { kind: 'idea', title: tr('Make something today'), detail: tr('Nothing is waiting: catch an idea while it is quiet'), value: 0, section: 'ideas', id: '' };
};

// ---------------------------------------------------------------- the deals as a funnel

/** How many deals and how much money stand at each stage, for drawing the funnel. Pure. */
export const funnel = (deals) =>
  DEAL_STAGES.map((stage) => {
    const here = deals.filter((d) => d.stage === stage.id);
    return { ...stage, count: here.length, value: here.reduce((n, d) => n + d.value, 0) };
  });

// ---------------------------------------------------------------- posting: streak, heatmap, month

const dayKey = (at) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const startOfDay = (at) => {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** How many pieces were posted on each day: { 'YYYY-MM-DD': n }. */
export const postsByDay = (pieces) => {
  const out = {};
  for (const p of pieces) if (p.stage === 'posted' && p.postedAt) out[dayKey(p.postedAt)] = (out[dayKey(p.postedAt)] ?? 0) + 1;
  return out;
};

/**
 * The run of days in a row with something posted: `current` counts back from today (or from yesterday, when today has nothing
 * yet, so the streak is not lost before the day is over), `best` is the longest ever. Pure.
 */
export const streakOf = (pieces, now = Date.now()) => {
  const days = postsByDay(pieces);
  let current = 0;
  let at = startOfDay(now);
  if (!days[dayKey(at)]) at -= DAY;
  while (days[dayKey(at)]) {
    current += 1;
    at -= DAY;
  }
  let best = 0;
  let run = 0;
  let previous = null;
  for (const key of Object.keys(days).sort()) {
    const t = new Date(`${key}T12:00:00`).getTime();
    run = previous !== null && Math.round((t - previous) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = t;
  }
  return { current, best: Math.max(best, current), today: Boolean(days[dayKey(now)]) };
};

export const BADGES = [
  { days: 3, label: tr('Warmed up') },
  { days: 7, label: tr('A week straight') },
  { days: 14, label: tr('Two weeks') },
  { days: 30, label: tr('A month of posts') },
  { days: 60, label: tr('Unstoppable') },
  { days: 100, label: tr('Hundred days') },
];

/** The last `weeks` weeks as columns of seven days (Monday first), each with how many pieces were posted: [[{ key, n, future }]]. Pure. */
export const heatmap = (pieces, now = Date.now(), weeks = 26) => {
  const days = postsByDay(pieces);
  const today = startOfDay(now);
  const monday = today - ((new Date(today).getDay() + 6) % 7) * DAY;
  const first = monday - (weeks - 1) * 7 * DAY;
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      // noon, so a change of clocks never moves a day
      const at = first + (w * 7 + d) * DAY + 12 * 3600 * 1000;
      return { key: dayKey(at), n: days[dayKey(at)] ?? 0, future: at > today + DAY };
    })
  );
};

/** A month as weeks of days (Monday first, with the days of the months either side), each with its pieces: scheduled or posted that day. Pure. */
export const monthGrid = (year, month, pieces) => {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);
  const byDay = {};
  for (const p of pieces) {
    const at = p.stage === 'posted' ? p.postedAt ?? p.scheduledAt : p.scheduledAt;
    if (!at) continue;
    (byDay[dayKey(at)] ??= []).push(p);
  }
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ key: dayKey(d), date: d.getDate(), inMonth: d.getMonth() === month, pieces: byDay[dayKey(d)] ?? [] });
  }
  // a sixth row only when the month needs it
  return (cells.slice(35).some((c) => c.inMonth) ? cells : cells.slice(0, 35)).reduce((weeks, c, i) => {
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(c);
    return weeks;
  }, []);
};

// ---------------------------------------------------------------- the week looked back on

/** Sunday from six in the evening: when the week's report is offered. */
export const isReportTime = (now = Date.now()) => {
  const d = new Date(now);
  return d.getDay() === 0 && d.getHours() >= 18;
};

/** The Monday that starts the week `now` is in, as a key ('YYYY-MM-DD'): a report is shown once per week. */
export const weekKey = (now = Date.now()) => {
  const today = startOfDay(now);
  return dayKey(today - ((new Date(today).getDay() + 6) % 7) * DAY);
};

/**
 * The week in review (Monday to now): what came in and from where against the week before, what was posted and which piece
 * did best, deals won, sales, enquiries, and what is lined up for the next seven days. Pure.
 */
export const weekReport = ({ entries = [], pieces = [], deals = [], orders = [], now = Date.now() }) => {
  const from = new Date(`${weekKey(now)}T00:00:00`).getTime();
  const before = from - 7 * DAY;
  const inWeek = (at) => at >= from && at <= now;
  const earned = entries.filter((e) => inWeek(e.at)).reduce((n, e) => n + e.amount, 0);
  const previous = entries.filter((e) => e.at >= before && e.at < from).reduce((n, e) => n + e.amount, 0);
  const sources = {};
  for (const e of entries.filter((x) => inWeek(x.at))) sources[e.source] = (sources[e.source] ?? 0) + e.amount;
  const posted = pieces.filter((p) => p.stage === 'posted' && p.postedAt && inWeek(p.postedAt));
  const best = [...posted].sort((a, b) => (b.results?.revenue ?? 0) - (a.results?.revenue ?? 0) || (b.results?.views ?? 0) - (a.results?.views ?? 0))[0] ?? null;
  const next = pieces.filter((p) => p.stage !== 'posted' && p.scheduledAt && p.scheduledAt > now && p.scheduledAt < now + 7 * DAY).sort((a, b) => a.scheduledAt - b.scheduledAt);
  return {
    from,
    to: now,
    earned,
    previous,
    change: previous ? Math.round(((earned - previous) / previous) * 100) : null,
    sources: Object.entries(sources)
      .map(([id, amount]) => ({ id, label: sourceLabel(id), amount }))
      .sort((a, b) => b.amount - a.amount),
    posted: posted.length,
    best,
    won: deals.filter((d) => d.stage === 'won' && inWeek(d.updatedAt ?? 0)),
    sales: orders.filter((o) => o.status === 'paid' && o.kind !== 'lead' && inWeek(o.paidAt ?? 0)).length,
    leads: orders.filter((o) => o.kind === 'lead' && inWeek(o.createdAt)).length,
    next,
    streak: streakOf(pieces, now),
  };
};

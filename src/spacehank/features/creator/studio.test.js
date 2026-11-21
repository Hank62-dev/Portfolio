import { describe, expect, it } from 'vitest';
import { clicksSeries, dealFromLead, funnel, heatmap, incomeFromOrders, isReportTime, monthGrid, moneyMove, orderState, salesSummary, streakOf, weekKey, weekReport } from './studio';

const DAY = 86400000;
// Saturday 21 November 2026, 10:00 local
const now = new Date(2026, 10, 21, 10, 0).getTime();
const order = (extra) => ({ id: 'o1', code: 'HKAAAAAA', kind: 'product', title: 'Kit', amount: 100000, status: 'pending', createdAt: now - 1000, ...extra });
const posted = (daysAgo, extra = {}) => ({ id: `p${daysAgo}`, title: `Post ${daysAgo}`, stage: 'posted', postedAt: now - daysAgo * DAY, results: { views: 0, revenue: 0 }, ...extra });

describe('orders', () => {
  it('knows where each one stands', () => {
    expect(orderState(order())).toBe('pending');
    expect(orderState(order({ createdAt: now - 3 * DAY }), now)).toBe('expired');
    expect(orderState(order({ kind: 'booking', createdAt: now - 40 * 60 * 1000 }), now)).toBe('expired');
    expect(orderState(order({ kind: 'invoice', dueAt: now - DAY, createdAt: now - 9 * DAY }), now)).toBe('overdue');
    expect(orderState(order({ kind: 'lead', status: 'new' }), now)).toBe('new');
    expect(orderState(order({ status: 'paid' }), now)).toBe('paid');
  });

  it('turns paid orders into income once, under the right source', () => {
    const orders = [order({ status: 'paid', paidAt: now, received: 120000 }), order({ id: 'o2', kind: 'booking', status: 'paid', paidAt: now }), order({ id: 'o3' }), order({ id: 'o4', kind: 'booking', status: 'paid', received: 0 })];
    const made = incomeFromOrders(orders, []);
    expect(made.map((e) => [e.orderId, e.amount, e.source])).toEqual([
      ['o1', 120000, 'product'],
      ['o2', 100000, 'calls'],
    ]);
    expect(incomeFromOrders(orders, [{ orderId: 'o1' }, { orderId: 'o2' }])).toEqual([]);
  });

  it('sums the shop for the day and the month', () => {
    const s = salesSummary([order({ status: 'paid', paidAt: now }), order({ id: 'b', amount: 50000 }), order({ id: 'c', kind: 'lead', status: 'new' })], now);
    expect(s).toMatchObject({ today: 100000, month: 100000, sales: 1, waiting: 50000 });
    expect(s.leads).toHaveLength(1);
  });

  it('counts the taps on a link day by day', () => {
    const today = new Date(now).toISOString().slice(0, 10);
    const series = clicksSeries({ total: 3, days: { [today]: 3 } }, 7, now);
    expect(series).toHaveLength(7);
    expect(series.at(-1)).toEqual({ day: today, n: 3 });
  });

  it('makes a deal of an enquiry', () => {
    expect(dealFromLead({ title: 'Acme', amount: 3000000, ref: 'Sponsored video', buyer: { name: 'Lan', contact: 'lan@acme.vn', company: 'Acme', note: 'December launch' } })).toMatchObject({ name: 'Acme', channel: 'Email', value: 3000000 });
  });
});

describe('the one move today', () => {
  it('chases an overdue invoice before anything else', () => {
    const move = moneyMove({ orders: [order({ kind: 'invoice', dueAt: now - 3 * DAY, amount: 5000000, buyer: { name: 'Acme' } })], deals: [{ id: 'd', name: 'X', stage: 'lead', value: 9e6, followUpAt: now - DAY }], now });
    expect(move).toMatchObject({ kind: 'invoice', value: 5000000, section: 'store' });
  });

  it('then the biggest follow-up that is due, then what to post', () => {
    const deals = [
      { id: 'a', name: 'Small', stage: 'contacted', value: 1e6, followUpAt: now - 1000 },
      { id: 'b', name: 'Big', stage: 'contacted', value: 8e6, followUpAt: now - 1000 },
    ];
    expect(moneyMove({ deals, now }).id).toBe('b');
    expect(moneyMove({ pieces: [{ id: 'p', title: 'Video', stage: 'edited', scheduledAt: now }], hasShop: true, now }).kind).toBe('post');
    expect(moneyMove({ now }).kind).toBe('shop');
    expect(moneyMove({ hasShop: true, now }).kind).toBe('idea');
  });
});

describe('deals as a funnel', () => {
  it('counts and sums each stage', () => {
    const f = funnel([
      { stage: 'lead', value: 1 },
      { stage: 'lead', value: 2 },
      { stage: 'won', value: 5 },
    ]);
    expect(f.find((s) => s.id === 'lead')).toMatchObject({ count: 2, value: 3 });
    expect(f.find((s) => s.id === 'won')).toMatchObject({ count: 1, value: 5 });
  });
});

describe('posting', () => {
  it('keeps the streak alive until the day is over, and remembers the best one', () => {
    expect(streakOf([posted(1), posted(2), posted(3)], now)).toEqual({ current: 3, best: 3, today: false });
    expect(streakOf([posted(0), posted(1)], now).current).toBe(2);
    expect(streakOf([posted(2), posted(3)], now).current).toBe(0);
    expect(streakOf([posted(10), posted(11), posted(12), posted(13)], now).best).toBe(4);
  });

  it('draws the weeks as columns, Monday first, today in the last one', () => {
    const weeks = heatmap([posted(0), posted(0, { id: 'x' })], now, 4);
    expect(weeks).toHaveLength(4);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // Saturday is the sixth day of the week
    expect(weeks[3][5].n).toBe(2);
    expect(weeks[3][6].future).toBe(true);
  });

  it('lays a month out in weeks with its pieces on their days', () => {
    const weeks = monthGrid(2026, 10, [{ id: 'a', stage: 'edited', scheduledAt: new Date(2026, 10, 25, 9).getTime() }]);
    // November 2026 starts on a Sunday: six rows
    expect(weeks).toHaveLength(6);
    expect(weeks[0][6]).toMatchObject({ date: 1, inMonth: true });
    expect(weeks.flat().find((c) => c.key === '2026-11-25').pieces).toHaveLength(1);
  });
});

describe('the week in review', () => {
  it('is offered on Sunday evening, once a week', () => {
    expect(isReportTime(new Date(2026, 10, 22, 19).getTime())).toBe(true);
    expect(isReportTime(new Date(2026, 10, 22, 9).getTime())).toBe(false);
    expect(weekKey(now)).toBe('2026-11-16');
  });

  it('adds up the week against the one before', () => {
    const entries = [
      { at: now - DAY, amount: 300000, source: 'product' },
      { at: now - 2 * DAY, amount: 100000, source: 'sponsor' },
      { at: now - 8 * DAY, amount: 200000, source: 'product' },
    ];
    const r = weekReport({ entries, pieces: [posted(1, { results: { views: 900, revenue: 0 } }), posted(2, { results: { views: 50, revenue: 10000 } })], now });
    expect(r.earned).toBe(400000);
    expect(r.change).toBe(100);
    expect(r.sources[0]).toMatchObject({ id: 'product', amount: 300000 });
    expect(r.posted).toBe(2);
    expect(r.best.id).toBe('p2');
  });
});

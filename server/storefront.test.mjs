import { describe, expect, it, vi } from 'vitest';
import { cleanConfig, codesIn, createStorefront, freeSlots, makeCode, publicView, zoneOffset } from './services/storefront.mjs';

const HOUR = 3600 * 1000;
// a counter that stands in for crypto's random bytes, so ids and codes are known
const counter = () => {
  let n = 0;
  return (size) => Buffer.from(Array.from({ length: size }, () => (n += 7) % 256));
};
const SETUP = {
  bank: { bin: 'MB', account: '0123456789', name: 'Vo Gia Huy' },
  products: [{ title: 'React starter kit', price: 199000, file: 'https://drive.example/kit.zip' }],
  links: [
    { title: 'My TikTok', url: 'https://tiktok.com/@me' },
    { title: 'Keyboard I use', url: 'https://shopee.vn/x', kind: 'affiliate' },
  ],
  booking: { active: true, title: '1:1 code review', minutes: 30, price: 150000, days: [0, 1, 2, 3, 4, 5, 6], from: '19:00', to: '21:00', leadHours: 0, horizonDays: 2 },
  tiers: [{ title: 'Insider', price: 49000, perks: ['Private channel'], roleId: '123456789012345678' }],
  tips: { active: true, amounts: [20000] },
};
// 2026-11-21 10:00 in Saigon (03:00 UTC)
const NOW = Date.UTC(2026, 10, 21, 3, 0);

const make = (extra = {}) => {
  let t = NOW;
  const clock = { now: () => t, advance: (ms) => (t += ms) };
  const store = createStorefront({ now: clock.now, random: counter(), sepayKey: 'secret-key', ...extra });
  return { store, clock };
};

describe('the storefront settings', () => {
  it('cleans what the owner sends and makes ids from titles', () => {
    const c = cleanConfig({ ...SETUP, products: [...SETUP.products, { title: 'Free?', price: 0 }, { title: 'Bad link', price: 5, file: 'javascript:alert(1)' }] });
    expect(c.products.map((p) => p.id)).toEqual(['react-starter-kit', 'bad-link']);
    expect(c.products[1].file).toBe('');
    expect(c.bank).toEqual({ bin: 'MB', account: '0123456789', name: 'VO GIA HUY' });
    expect(c.links[1].kind).toBe('affiliate');
  });

  it('shows visitors no delivery links, link addresses or role ids', () => {
    const shown = JSON.stringify(publicView(cleanConfig(SETUP)));
    expect(shown).not.toContain('drive.example');
    expect(shown).not.toContain('tiktok.com');
    expect(shown).not.toContain('123456789012345678');
    expect(shown).toContain('React starter kit');
  });
});

describe('booking slots', () => {
  it('knows Saigon is seven hours ahead', () => {
    expect(zoneOffset('Asia/Ho_Chi_Minh', NOW)).toBe(420);
  });

  it('offers the evening in the owner’s zone, and leaves out busy times', () => {
    const booking = cleanConfig(SETUP).booking;
    const slots = freeSlots(booking, { now: NOW, zone: 'Asia/Ho_Chi_Minh' });
    // 19:00 Saigon is 12:00 UTC; four half hours an evening, three evenings
    expect(new Date(slots[0].start).toISOString()).toBe('2026-11-21T12:00:00.000Z');
    expect(slots).toHaveLength(12);
    const busy = [{ start: slots[0].start, end: slots[1].end }];
    expect(freeSlots(booking, { now: NOW, zone: 'Asia/Ho_Chi_Minh', busy })[0].start).toBe(slots[2].start);
  });
});

describe('codes and transfers', () => {
  it('makes codes that read clearly and finds them in a bank description', () => {
    expect(makeCode(counter())).toMatch(/^HK[A-HJ-NP-Z2-9]{6}$/);
    expect(codesIn('MBVCB.123.hk7f3a2q chuyen tien')).toEqual(['HK7F3A2Q']);
    expect(codesIn('nothing here')).toEqual([]);
  });
});

describe('ordering and paying', () => {
  it('refuses orders until the bank account is set', async () => {
    const { store } = make();
    await expect(store.order('a', { kind: 'product', ref: 'react-starter-kit' })).rejects.toMatchObject({ status: 503 });
  });

  it('sells a product: pending, then paid by the SePay webhook, then the download appears', async () => {
    const announce = vi.fn();
    const { store } = make({ announce });
    await store.setConfig(SETUP);
    const order = await store.order('a', { kind: 'product', ref: 'react-starter-kit' });
    expect(order).toMatchObject({ status: 'pending', amount: 199000, delivery: null });
    await expect(store.sepay('Apikey wrong-key!', {})).rejects.toMatchObject({ status: 401 });
    // too little: left alone
    expect((await store.sepay('Apikey secret-key', { transferType: 'in', transferAmount: 1000, content: order.code })).matched).toBe(0);
    expect((await store.sepay('Apikey secret-key', { transferType: 'in', transferAmount: 199000, content: `chuyen khoan ${order.code.toLowerCase()}` })).matched).toBe(1);
    const paid = await store.view(order.id);
    expect(paid.status).toBe('paid');
    expect(paid.delivery).toBe('https://drive.example/kit.zip');
    expect(announce).toHaveBeenCalledOnce();
    // the same transfer told twice changes nothing
    expect((await store.sepay('Apikey secret-key', { transferType: 'in', transferAmount: 199000, content: order.code })).matched).toBe(0);
  });

  it('holds a booked slot, and lets it go if the transfer never comes', async () => {
    const { store, clock } = make();
    await store.setConfig(SETUP);
    const [first] = await store.slots();
    await store.order('a', { kind: 'booking', slot: first, buyer: { name: 'An', contact: 'an@example.com' } });
    expect((await store.slots())[0].start).not.toBe(first.start);
    await expect(store.order('b', { kind: 'booking', slot: first, buyer: { name: 'Binh', contact: 'b@example.com' } })).rejects.toMatchObject({ status: 409 });
    clock.advance(31 * 60 * 1000);
    expect((await store.slots()).some((s) => s.start === first.start)).toBe(true);
  });

  it('gives a member the Discord role when paid, and takes it back when the month is over', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    const { store, clock } = make({ discordBot: { token: 't', guildId: '999999999999999999' }, fetchImpl });
    await store.setConfig(SETUP);
    await expect(store.order('a', { kind: 'membership', ref: 'insider' })).rejects.toMatchObject({ status: 400 });
    const order = await store.order('a', { kind: 'membership', ref: 'insider', buyer: { discordId: '111111111111111111' } });
    await store.mark({ id: order.id, status: 'paid' });
    expect(fetchImpl.mock.calls[0][0]).toContain('/members/111111111111111111/roles/123456789012345678');
    expect(fetchImpl.mock.calls[0][1].method).toBe('PUT');
    clock.advance(31 * 24 * HOUR);
    expect((await store.sweep()).revoked).toBe(1);
    expect(fetchImpl.mock.calls[1][1].method).toBe('DELETE');
  });

  it('counts the clicks on a short link and gives back its address', async () => {
    const { store } = make();
    await store.setConfig(SETUP);
    expect(await store.follow('my-tiktok')).toEqual({ url: 'https://tiktok.com/@me' });
    await store.follow('my-tiktok');
    expect((await store.admin()).clicks['my-tiktok'].total).toBe(2);
    await expect(store.follow('nope')).rejects.toMatchObject({ status: 404 });
  });

  it('writes an invoice with its total, and a tip has a floor', async () => {
    const { store } = make();
    await store.setConfig(SETUP);
    const inv = await store.invoice({
      client: 'Acme',
      items: [
        { desc: 'Landing page', qty: 1, unit: 5000000 },
        { desc: 'Hosting', qty: 2, unit: 250000 },
      ],
      discountPct: 10,
    });
    expect(inv.amount).toBe(4950000);
    expect((await store.view(inv.id)).client).toBe('Acme');
    await expect(store.order('a', { kind: 'tip', amount: 500 })).rejects.toMatchObject({ status: 400 });
  });

  it('keeps an enquiry from the media kit, a few per visitor', async () => {
    const { store } = make();
    const body = { name: 'Brand', contact: 'b@example.com', message: 'A sponsored video in December?' };
    for (let i = 0; i < 3; i += 1) await store.lead('x', body);
    await expect(store.lead('x', body)).rejects.toMatchObject({ status: 429 });
    expect((await store.admin()).orders.filter((o) => o.kind === 'lead')).toHaveLength(3);
  });
});

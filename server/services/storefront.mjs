import { randomBytes } from 'node:crypto';
import { HttpError } from '../http/http.mjs';
import { createLimiter } from '../http/limits.mjs';

// The owner's storefront: what visitors to the portfolio can pay for or reach, and what comes back. Digital products, a paid
// call booked into a free slot, a membership of the Discord community, a tip, an invoice sent to a client, the links of a
// link-in-bio page (each counted when followed) and a media kit with a form for brands. Payment is a bank transfer through a
// VietQR code that carries the order's code; SePay's webhook (when set up) reads the bank's incoming transfers and marks the
// order paid, otherwise the owner marks it by hand. Stored in Postgres when there is one, in memory otherwise.

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
export const PENDING_HOLD_MS = 30 * 60 * 1000; // a booked slot is held this long for its transfer
export const PENDING_LIFE_MS = 2 * DAY; // an unpaid order (not an invoice) is forgotten after this
export const MEMBERSHIP_DAYS = 30;
const MAX_ORDERS = 2000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I: read aloud or typed into a bank app
export const ORDER_KINDS = ['product', 'booking', 'membership', 'tip', 'invoice', 'lead'];

const SCHEMA = `CREATE TABLE IF NOT EXISTS storefront (
  key         TEXT    PRIMARY KEY,
  value       TEXT    NOT NULL,
  updated_at  BIGINT  NOT NULL
)`;

// ---------------------------------------------------------------- cleaning what comes in

const text = (value, max) => String(value ?? '').replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const longText = (value, max) => String(value ?? '').replace(/[\p{Cf}]/gu, '').replace(/\r/g, '').trim().slice(0, max);
const money = (value, max = 1_000_000_000) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
};
const httpsUrl = (value) => {
  const raw = text(value, 600);
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
};
const slugOf = (value) => text(value, 40).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
const idOf = (value) => (/^[a-z0-9-]{1,40}$/.test(String(value ?? '')) ? String(value) : '');
const hhmm = (value, fallback) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value ?? '')) ? String(value) : fallback);
const list = (value, max) => (Array.isArray(value) ? value.slice(0, max) : []);

export const DEFAULT_CONFIG = {
  profile: { name: '', bio: '', avatar: '' },
  bank: { bin: '', account: '', name: '' },
  products: [],
  links: [],
  booking: { active: false, title: '', blurb: '', minutes: 30, price: 0, days: [1, 2, 3, 4, 5], from: '19:00', to: '22:00', leadHours: 12, horizonDays: 14 },
  tiers: [],
  tips: { active: false, amounts: [20000, 50000, 100000] },
  kit: { headline: '', about: '', audience: '', stats: [], rates: [], brands: '' },
};

/** The owner's settings for the storefront, cleaned: anything unknown is dropped, every field has its limit. Pure. */
export const cleanConfig = (raw = {}) => {
  const r = raw && typeof raw === 'object' ? raw : {};
  const seen = new Set();
  const unique = (id) => {
    if (!id || seen.has(id)) return '';
    seen.add(id);
    return id;
  };
  const booking = r.booking ?? {};
  return {
    profile: { name: text(r.profile?.name, 60), bio: text(r.profile?.bio, 200), avatar: httpsUrl(r.profile?.avatar) },
    bank: { bin: text(r.bank?.bin, 20).toUpperCase().replace(/[^A-Z0-9]/g, ''), account: text(r.bank?.account, 30).replace(/[^0-9A-Za-z]/g, ''), name: text(r.bank?.name, 60).toUpperCase() },
    products: list(r.products, 40)
      .map((p) => ({ id: unique(idOf(p?.id) || slugOf(p?.title)), title: text(p?.title, 80), blurb: longText(p?.blurb, 600), price: money(p?.price), cover: httpsUrl(p?.cover), file: httpsUrl(p?.file), active: p?.active !== false }))
      .filter((p) => p.id && p.title && p.price),
    links: list(r.links, 60)
      .map((l) => ({ id: unique(idOf(l?.id) || slugOf(l?.title)), title: text(l?.title, 70), url: httpsUrl(l?.url), kind: l?.kind === 'affiliate' ? 'affiliate' : 'link', note: text(l?.note, 80), active: l?.active !== false }))
      .filter((l) => l.id && l.title && l.url),
    booking: {
      active: Boolean(booking.active),
      title: text(booking.title, 80),
      blurb: longText(booking.blurb, 500),
      minutes: [15, 20, 30, 45, 60, 90].includes(Number(booking.minutes)) ? Number(booking.minutes) : 30,
      price: money(booking.price),
      days: [...new Set(list(booking.days, 7).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(),
      from: hhmm(booking.from, '19:00'),
      to: hhmm(booking.to, '22:00'),
      leadHours: Math.min(168, Math.max(0, Math.round(Number(booking.leadHours) || 0))),
      horizonDays: Math.min(60, Math.max(1, Math.round(Number(booking.horizonDays) || 14))),
    },
    tiers: list(r.tiers, 6)
      .map((t) => ({ id: unique(idOf(t?.id) || slugOf(t?.title)), title: text(t?.title, 60), price: money(t?.price), perks: list(t?.perks, 8).map((p) => text(p, 120)).filter(Boolean), roleId: /^\d{15,25}$/.test(String(t?.roleId ?? '')) ? String(t.roleId) : '', active: t?.active !== false }))
      .filter((t) => t.id && t.title && t.price),
    tips: { active: Boolean(r.tips?.active), amounts: list(r.tips?.amounts, 4).map((a) => money(a, 50_000_000)).filter(Boolean) },
    kit: {
      headline: text(r.kit?.headline, 120),
      about: longText(r.kit?.about, 800),
      audience: longText(r.kit?.audience, 400),
      stats: list(r.kit?.stats, 8)
        .map((s) => ({ platform: text(s?.platform, 30), handle: text(s?.handle, 60), followers: Math.max(0, Math.round(Number(s?.followers) || 0)), avgViews: Math.max(0, Math.round(Number(s?.avgViews) || 0)) }))
        .filter((s) => s.platform),
      rates: list(r.kit?.rates, 8)
        .map((x) => ({ title: text(x?.title, 70), price: money(x?.price), detail: text(x?.detail, 200) }))
        .filter((x) => x.title),
      brands: text(r.kit?.brands, 200),
    },
  };
};

/** What a visitor may see of the settings: no delivery links, no addresses behind the short links, no Discord role ids. Pure. */
export const publicView = (config, { autoPay = false } = {}) => ({
  profile: config.profile,
  bank: config.bank.account ? config.bank : null,
  autoPay,
  products: config.products.filter((p) => p.active).map((p) => ({ id: p.id, title: p.title, blurb: p.blurb, price: p.price, cover: p.cover })),
  links: config.links.filter((l) => l.active).map((l) => ({ id: l.id, title: l.title, kind: l.kind })),
  booking: config.booking.active && config.booking.days.length ? { title: config.booking.title, blurb: config.booking.blurb, minutes: config.booking.minutes, price: config.booking.price, days: config.booking.days, from: config.booking.from, to: config.booking.to } : null,
  tiers: config.tiers.filter((t) => t.active).map((t) => ({ id: t.id, title: t.title, price: t.price, perks: t.perks })),
  tips: config.tips.active && config.tips.amounts.length ? { amounts: config.tips.amounts } : null,
  kit: config.kit,
});

// ---------------------------------------------------------------- time, in the owner's zone

/** Minutes the zone is ahead of UTC at a moment. */
export const zoneOffset = (zone, at) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(at)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  return Math.round((asUtc - Math.floor(at / 60000) * 60000) / 60000);
};

/**
 * The bookable slots: on the chosen weekdays, between `from` and `to` in the owner's zone, `minutes` long, from `leadHours`
 * ahead up to `horizonDays` out, leaving out any that overlap `busy` ([{ start, end }] in ms). Pure.
 */
export const freeSlots = (booking, { now, zone = 'Asia/Ho_Chi_Minh', busy = [] }) => {
  if (!booking?.active || !booking.days?.length) return [];
  const length = booking.minutes * 60000;
  const earliest = now + booking.leadHours * HOUR;
  const [fh, fm] = booking.from.split(':').map(Number);
  const [th, tm] = booking.to.split(':').map(Number);
  const slots = [];
  for (let d = 0; d <= booking.horizonDays; d += 1) {
    const offset = zoneOffset(zone, now + d * DAY);
    const local = new Date(now + d * DAY + offset * 60000); // its UTC fields are the zone's wall clock
    if (!booking.days.includes(local.getUTCDay())) continue;
    const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset * 60000;
    const open = midnight + (fh * 60 + fm) * 60000;
    const close = midnight + (th * 60 + tm) * 60000;
    for (let start = open; start + length <= close; start += length) {
      const end = start + length;
      if (start < earliest) continue;
      if (busy.some((b) => b.start < end && b.end > start)) continue;
      slots.push({ start, end });
    }
  }
  return slots.slice(0, 200);
};

// ---------------------------------------------------------------- payments

/** A transfer code for an order: "HK" and six characters that read clearly. */
export const makeCode = (random = randomBytes) => `HK${[...random(6)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')}`;

/** The order codes a bank transfer's description carries (banks drop spaces and change case, so both are ignored). Pure. */
export const codesIn = (description) => [...new Set((String(description ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ' ').match(/HK[A-Z2-9]{6}/g) ?? []))];

/** The invoice lines and their total. Pure. */
export const invoiceTotal = (items) => items.reduce((sum, it) => sum + it.qty * it.unit, 0);

/** What a visitor sees of an order: what it is, what to pay, and once paid what they bought. Pure. */
export const orderView = (order, config) => {
  const product = order.kind === 'product' ? config.products.find((p) => p.id === order.ref) : null;
  return {
    id: order.id,
    code: order.code,
    kind: order.kind,
    title: order.title,
    amount: order.amount,
    status: order.status,
    createdAt: order.createdAt,
    paidAt: order.paidAt ?? null,
    slot: order.slot ?? null,
    expiresAt: order.expiresAt ?? null,
    dueAt: order.dueAt ?? null,
    items: order.items ?? null,
    note: order.kind === 'invoice' ? order.note ?? '' : '',
    client: order.kind === 'invoice' ? order.buyer?.name ?? '' : '',
    from: config.profile.name,
    delivery: order.status === 'paid' && product?.file ? product.file : null,
    bank: config.bank.account ? config.bank : null,
  };
};

/**
 * The storefront. `db` (optional) keeps it; `calendar` (optional) marks the owner's busy times; `discordBot` (optional:
 * { token, guildId }) hands out and takes back membership roles; `announce` (optional) tells the owner's devices of a payment.
 */
export const createStorefront = ({ db = null, calendar = null, zone = 'Asia/Ho_Chi_Minh', sepayKey = '', discordBot = null, announce = null, fetchImpl = fetch, now = Date.now, random = randomBytes } = {}) => {
  const memory = new Map();
  const orderLimiter = createLimiter({ max: 8, windowMs: HOUR, now });
  const leadLimiter = createLimiter({ max: 3, windowMs: HOUR, now });
  let ready = null;
  const schema = () => (ready ??= db.query(SCHEMA).catch((error) => {
    ready = null;
    throw error;
  }));

  const get = async (key) => {
    if (!db) return memory.has(key) ? structuredClone(memory.get(key)) : null;
    await schema();
    const { rows } = await db.query('SELECT value FROM storefront WHERE key = $1', [key]);
    return rows[0] ? JSON.parse(rows[0].value) : null;
  };
  const put = async (key, value) => {
    if (!db) return void memory.set(key, structuredClone(value));
    await schema();
    await db.query('INSERT INTO storefront (key, value, updated_at) VALUES ($1, $2, $3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at', [key, JSON.stringify(value), now()]);
  };
  const drop = async (key) => {
    if (!db) return void memory.delete(key);
    await schema();
    await db.query('DELETE FROM storefront WHERE key = $1', [key]);
  };
  const prefixed = async (prefix) => {
    if (!db) return [...memory.entries()].filter(([k]) => k.startsWith(prefix)).map(([, v]) => structuredClone(v));
    await schema();
    const { rows } = await db.query("SELECT value FROM storefront WHERE key LIKE $1 || '%' ORDER BY updated_at DESC LIMIT $2", [prefix, MAX_ORDERS]);
    return rows.map((r) => JSON.parse(r.value));
  };

  const config = async () => ({ ...DEFAULT_CONFIG, ...cleanConfig((await get('config')) ?? DEFAULT_CONFIG) });
  const orders = async () => (await prefixed('order:')).sort((a, b) => b.createdAt - a.createdAt);
  const saveOrder = (order) => put(`order:${order.id}`, order);
  const findOrder = async (id) => (/^[a-z0-9]{20,40}$/.test(String(id ?? '')) ? get(`order:${id}`) : null);

  /** A pending order that still holds what it asked for (a slot), or that can still be paid. */
  const alive = (o, at = now()) => o.status === 'paid' || (o.status === 'pending' && (o.kind === 'invoice' || at - o.createdAt < (o.kind === 'booking' ? PENDING_HOLD_MS : PENDING_LIFE_MS)));

  const busyTimes = async (from, to) => {
    const taken = (await orders()).filter((o) => o.kind === 'booking' && o.slot && alive(o)).map((o) => o.slot);
    if (!calendar?.configured) return taken;
    const events = [];
    // the calendar answers three days at a time
    for (let at = from; at < to; at += 3 * DAY) {
      try {
        const { events: some = [] } = await calendar.between(new Date(at), new Date(Math.min(to, at + 3 * DAY)));
        events.push(...some.map((e) => ({ start: Date.parse(e.start), end: Date.parse(e.end) })).filter((e) => Number.isFinite(e.start) && Number.isFinite(e.end)));
      } catch {
        /* the calendar is down: only the booked slots count */
      }
    }
    return [...taken, ...events];
  };

  const slots = async () => {
    const { booking } = await config();
    if (!booking.active) return [];
    const from = now();
    return freeSlots(booking, { now: from, zone, busy: await busyTimes(from, from + (booking.horizonDays + 1) * DAY) });
  };

  // ---------------------------------------------------------------- Discord roles for members

  const role = async (method, userId, roleId) => {
    if (!discordBot?.token || !discordBot.guildId || !userId || !roleId) return false;
    try {
      const response = await fetchImpl(`https://discord.com/api/v10/guilds/${discordBot.guildId}/members/${userId}/roles/${roleId}`, {
        method,
        headers: { Authorization: `Bot ${discordBot.token}`, 'X-Audit-Log-Reason': 'Hank62 membership' },
        signal: AbortSignal.timeout(10000),
      });
      return response.ok || response.status === 204;
    } catch {
      return false;
    }
  };

  // ---------------------------------------------------------------- paying

  const markPaid = async (order, { by = 'owner', amount = order.amount } = {}) => {
    if (order.status === 'paid') return order;
    const at = now();
    const paid = { ...order, status: 'paid', paidAt: at, paidBy: by, received: amount };
    if (order.kind === 'membership') {
      paid.expiresAt = at + MEMBERSHIP_DAYS * DAY;
      const tier = (await config()).tiers.find((t) => t.id === order.ref);
      paid.roleGranted = await role('PUT', order.buyer?.discordId, tier?.roleId);
    }
    await saveOrder(paid);
    try {
      await announce?.({ title: `+${amount.toLocaleString('vi-VN')} ₫`, body: `${paid.title} · ${paid.code}`, tab: 'creator', kind: 'money', tone: 'success', key: `paid:${paid.id}` });
    } catch {
      /* a payment stands even if the phone could not be told */
    }
    return paid;
  };

  /** Takes back the role of every membership that has run out. Safe to call often. */
  const sweep = async () => {
    const at = now();
    let revoked = 0;
    const cfg = await config();
    for (const o of await orders()) {
      if (o.kind !== 'membership' || o.status !== 'paid' || !o.roleGranted || !o.expiresAt || o.expiresAt > at) continue;
      // a newer paid membership of the same person keeps the role
      const renewed = (await orders()).some((n) => n.id !== o.id && n.kind === 'membership' && n.status === 'paid' && n.buyer?.discordId === o.buyer?.discordId && (n.expiresAt ?? 0) > at);
      const tier = cfg.tiers.find((t) => t.id === o.ref);
      if (!renewed) await role('DELETE', o.buyer?.discordId, tier?.roleId);
      await saveOrder({ ...o, roleGranted: false });
      revoked += 1;
    }
    return { revoked };
  };

  // ---------------------------------------------------------------- what visitors do

  const buyerOf = (b = {}) => ({
    name: text(b.name, 60),
    contact: text(b.contact, 100),
    discordId: /^\d{15,25}$/.test(String(b.discordId ?? '').trim()) ? String(b.discordId).trim() : '',
    note: text(b.note, 300),
  });

  const newOrder = (fields) => ({ id: random(15).toString('hex'), code: makeCode(random), status: 'pending', createdAt: now(), ...fields });

  /** A visitor asks to pay for something: returns the order to pay (with its transfer code). */
  const order = async (who, body = {}) => {
    const kind = String(body.kind ?? '');
    if (!['product', 'booking', 'membership', 'tip'].includes(kind)) throw new HttpError(400, 'What would you like?');
    const cfg = await config();
    if (!cfg.bank.account) throw new HttpError(503, 'Payments are not open yet.');
    if (!orderLimiter.hit(who).ok) throw new HttpError(429, 'That is a lot of orders. Try again in a while.');
    const buyer = buyerOf(body.buyer);
    let fields;
    if (kind === 'product') {
      const product = cfg.products.find((p) => p.id === body.ref && p.active);
      if (!product) throw new HttpError(404, 'That product is not on sale.');
      fields = { kind, ref: product.id, title: product.title, amount: product.price, buyer };
    } else if (kind === 'membership') {
      const tier = cfg.tiers.find((t) => t.id === body.ref && t.active);
      if (!tier) throw new HttpError(404, 'That membership is not open.');
      if (tier.roleId && !buyer.discordId) throw new HttpError(400, 'Your Discord user ID is needed to give you the role.');
      fields = { kind, ref: tier.id, title: tier.title, amount: tier.price, buyer };
    } else if (kind === 'tip') {
      if (!cfg.tips.active) throw new HttpError(404, 'Tips are not open.');
      const amount = money(body.amount, 50_000_000);
      if (amount < 10000) throw new HttpError(400, 'A tip starts at 10.000 ₫.');
      fields = { kind, ref: 'tip', title: 'Tip', amount, buyer };
    } else {
      if (!cfg.booking.active) throw new HttpError(404, 'Calls are not open for booking.');
      if (!buyer.name || !buyer.contact) throw new HttpError(400, 'Your name and a way to reach you, please.');
      const start = Number(body.slot?.start);
      const slot = (await slots()).find((s) => s.start === start);
      if (!slot) throw new HttpError(409, 'That time was just taken. Choose another.');
      fields = { kind, ref: 'call', title: cfg.booking.title || 'Call', amount: cfg.booking.price, slot, buyer };
      if (!fields.amount) {
        // a free call is booked as it is
        const booked = { ...newOrder(fields), status: 'paid', paidAt: now(), paidBy: 'free', received: 0 };
        await saveOrder(booked);
        return orderView(booked, cfg);
      }
    }
    const made = newOrder(fields);
    await saveOrder(made);
    await trim();
    return orderView(made, cfg);
  };

  const view = async (id) => {
    const found = await findOrder(id);
    if (!found || found.kind === 'lead') throw new HttpError(404, 'No such order.');
    return orderView(found, await config());
  };

  /** A brand or client writes from the media kit. */
  const lead = async (who, body = {}) => {
    if (!leadLimiter.hit(who).ok) throw new HttpError(429, 'Your message is already on its way. Try again in a while.');
    const buyer = { name: text(body.name, 60), contact: text(body.contact, 100), company: text(body.company, 80), budget: money(body.budget), note: longText(body.message, 1500) };
    if (!buyer.name || !buyer.contact || buyer.note.length < 10) throw new HttpError(400, 'Your name, a way to reach you and a few words about the idea, please.');
    const made = { ...newOrder({ kind: 'lead', ref: text(body.rate, 70), title: buyer.company || buyer.name, amount: buyer.budget, buyer }), status: 'new', code: '' };
    await saveOrder(made);
    await trim();
    try {
      await announce?.({ title: 'New enquiry', body: `${made.title}: ${buyer.note.slice(0, 80)}`, tab: 'creator', kind: 'money', key: `lead:${made.id}` });
    } catch {
      /* the enquiry is kept either way */
    }
    return { ok: true };
  };

  /** A short link is followed: counted per day, and its address given back. */
  const follow = async (slug) => {
    const cfg = await config();
    const link = cfg.links.find((l) => l.id === slug && l.active);
    if (!link) throw new HttpError(404, 'No such link.');
    const day = new Date(now()).toISOString().slice(0, 10);
    const count = (await get(`clicks:${link.id}`)) ?? { total: 0, days: {} };
    count.total += 1;
    count.days[day] = (count.days[day] ?? 0) + 1;
    // sixty days of daily counts are plenty
    for (const d of Object.keys(count.days).sort().slice(0, -60)) delete count.days[d];
    await put(`clicks:${link.id}`, count);
    return { url: link.url };
  };

  /** SePay calls this for every incoming transfer: the order its description names is paid, when the amount is enough. */
  const sepay = async (authorization, body = {}) => {
    if (!sepayKey) throw new HttpError(503, 'Not set up.');
    const given = String(authorization ?? '').replace(/^Apikey\s+/i, '').trim();
    if (given.length !== sepayKey.length || !timingSafe(given, sepayKey)) throw new HttpError(401, 'Unauthorized');
    if (body.transferType && body.transferType !== 'in') return { success: true, matched: 0 };
    const amount = money(body.transferAmount);
    const codes = codesIn(`${body.code ?? ''} ${body.content ?? ''} ${body.description ?? ''}`);
    let matched = 0;
    if (!codes.length || !amount) return { success: true, matched };
    for (const o of await orders()) {
      if (!codes.includes(o.code) || o.status === 'paid' || o.status === 'cancelled') continue;
      if (amount < o.amount) continue; // short: left for the owner to look at
      await markPaid(o, { by: 'sepay', amount });
      matched += 1;
    }
    return { success: true, matched };
  };

  // ---------------------------------------------------------------- what the owner does

  const admin = async () => {
    const cfg = await config();
    const clicks = {};
    for (const l of cfg.links) clicks[l.id] = (await get(`clicks:${l.id}`)) ?? { total: 0, days: {} };
    return { config: cfg, orders: await orders(), clicks, autoPay: Boolean(sepayKey), discordBot: Boolean(discordBot?.token && discordBot.guildId) };
  };

  const setConfig = async (raw) => {
    const clean = cleanConfig(raw);
    await put('config', clean);
    return clean;
  };

  /** An invoice for a client: lines, a due date, a public page to pay it. */
  const invoice = async (body = {}) => {
    const items = list(body.items, 30)
      .map((it) => ({ desc: text(it?.desc, 120), qty: Math.max(1, Math.min(1000, Math.round(Number(it?.qty) || 1))), unit: money(it?.unit) }))
      .filter((it) => it.desc && it.unit);
    if (!items.length) throw new HttpError(400, 'Add at least one line with a price.');
    const discount = Math.min(100, Math.max(0, Number(body.discountPct) || 0));
    const vat = Math.min(30, Math.max(0, Number(body.vatPct) || 0));
    const subtotal = invoiceTotal(items);
    const amount = Math.round(subtotal * (1 - discount / 100) * (1 + vat / 100));
    const dueAt = Number(body.dueAt) > 0 ? Number(body.dueAt) : now() + 7 * DAY;
    const made = newOrder({ kind: 'invoice', ref: text(body.dealId, 40), title: text(body.title, 100) || 'Invoice', amount, items, discountPct: discount, vatPct: vat, dueAt, note: longText(body.note, 600), buyer: { name: text(body.client, 80), contact: text(body.contact, 100) } });
    await saveOrder(made);
    return made;
  };

  const mark = async (body = {}) => {
    const found = await findOrder(body.id);
    if (!found) throw new HttpError(404, 'No such order.');
    if (body.status === 'paid') return markPaid(found);
    if (body.status === 'cancelled' || body.status === 'done') {
      const next = { ...found, status: body.status };
      await saveOrder(next);
      return next;
    }
    throw new HttpError(400, 'Paid, done or cancelled?');
  };

  const remove = async (body = {}) => {
    const found = await findOrder(body.id);
    if (found) await drop(`order:${found.id}`);
    return { ok: true };
  };

  // only so many are kept: the oldest closed ones go first
  const trim = async () => {
    const all = await orders();
    if (all.length <= MAX_ORDERS) return;
    for (const o of all.filter((x) => !alive(x) && x.kind !== 'lead').slice(-(all.length - MAX_ORDERS))) await drop(`order:${o.id}`);
  };

  let timer = null;
  const start = () => {
    if (timer || !discordBot?.token) return;
    timer = setInterval(() => void sweep().catch(() => undefined), HOUR);
    timer.unref?.();
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };

  return { config, publicConfig: async () => publicView(await config(), { autoPay: Boolean(sepayKey) }), slots, order, view, lead, follow, sepay, admin, setConfig, invoice, mark, remove, sweep, start, stop };
};

const timingSafe = (a, b) => {
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

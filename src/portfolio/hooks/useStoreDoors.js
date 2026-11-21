import { useEffect, useState } from 'react';
import { fetchStore, vnd } from '../services/storeService';

// What the shop has open, asked for once per visit and shared by every place that shows a way in (the home page, the bar, the
// menu, the footer). The server unreachable: no doors, and those places show nothing.
let asked = null;
const ask = () => (asked ??= fetchStore().catch(() => null));

/**
 * The storefront's doors: [{ id, to, label, note, soon }], in the order they are shown. `c` is the copy of the language. Only the
 * open ones, unless `all`: then every door, the closed ones marked `soon` (the home page shows what is coming).
 */
export const doorsFrom = (data, c, { all = false } = {}) => {
  if (!data) return [];
  const t = c.store.studio;
  const cheapest = (list) => Math.min(...list.map((x) => x.price));
  const open = [
    data.products?.length > 0 && { id: 'shop', to: '/shop', label: c.store.nav.shop, note: t.shopNote(data.products.length, vnd(cheapest(data.products))) },
    data.booking && { id: 'book', to: '/book', label: data.booking.title || c.store.nav.book, note: t.bookNote(data.booking.minutes, data.booking.price ? vnd(data.booking.price) : c.store.book.free_) },
    data.tiers?.length > 0 && { id: 'join', to: '/join', label: c.store.nav.join, note: t.joinNote(vnd(cheapest(data.tiers))) },
    (data.kit?.headline || data.kit?.stats?.length > 0) && { id: 'kit', to: '/kit', label: c.store.nav.kit, note: t.kitNote },
    data.tips && { id: 'tip', to: '/shop#tip-title', label: c.store.me.tip, note: t.tipNote },
    data.links?.length > 0 && { id: 'me', to: '/me', label: c.store.nav.me, note: t.meNote },
  ].filter(Boolean);
  if (!all) return open;
  const closed = [
    { id: 'shop', to: '/shop', label: c.store.nav.shop },
    { id: 'book', to: '/book', label: c.store.nav.book },
    { id: 'join', to: '/join', label: c.store.nav.join },
    { id: 'kit', to: '/kit', label: c.store.nav.kit },
  ]
    .filter((d) => !open.some((o) => o.id === d.id))
    .map((d) => ({ ...d, note: t.soon, soon: true }));
  return [...open, ...closed];
};

/** The storefront as it is now (null until it answers, or when it cannot be reached). */
export const useStoreData = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    ask().then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, []);
  return data;
};

import { createStore } from '../../core/store';
import { createInvoice, markOrder, removeOrder, saveStoreConfig, storeAdmin } from '../../core/api/owner';
import { tr } from '../../core/i18n/lang';
import { income } from './store';
import { incomeFromOrders } from './studio';

// The storefront as the owner sees it: its settings, every order and enquiry, and the taps on each short link. It lives on the
// server (visitors pay there), so this is a copy fetched when the Creator Lab opens and after every change. Paid orders are
// written into the income log here, once each, so the Money tab fills in by itself.

export const shop = createStore({ loaded: false, busy: false, error: '', config: null, orders: [], clicks: {}, autoPay: false, discordBot: false });

/** The public address of the site (where /shop, /pay/… and /me live). */
export const siteOrigin = () => (typeof window === 'undefined' ? '' : window.location.origin);

let loading = null;

const logPaid = async (orders) => {
  await income.load();
  for (const entry of incomeFromOrders(orders, income.store.get().items)) await income.create(entry);
};

/** Fetches the storefront (again). Quietly keeps the old copy when the server cannot be reached. */
export const loadShop = (force = false) => {
  if (loading && !force) return loading;
  loading = (async () => {
    shop.set({ busy: true });
    try {
      const data = await storeAdmin();
      shop.set({ loaded: true, busy: false, error: '', ...data });
      await logPaid(data.orders ?? []);
    } catch (error) {
      shop.set({ loaded: true, busy: false, error: error.message || tr('The shop could not be reached.') });
    } finally {
      loading = null;
    }
  })();
  return loading;
};

/** Saves the settings (the server cleans them and sends back what it kept). */
export const saveShop = async (config) => {
  const { config: kept } = await saveStoreConfig(config);
  shop.set({ config: kept });
  return kept;
};

/** Changes part of the settings and saves them. */
export const patchShop = (patch) => saveShop({ ...shop.get().config, ...patch });

export const setOrder = async (id, status) => {
  const { order } = await markOrder(id, status);
  shop.set((s) => ({ orders: s.orders.map((o) => (o.id === id ? order : o)) }));
  if (status === 'paid') await logPaid([order]);
  return order;
};

export const dropOrder = async (id) => {
  await removeOrder(id);
  shop.set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
};

export const sendInvoice = async (input) => {
  const { order } = await createInvoice(input);
  shop.set((s) => ({ orders: [order, ...s.orders] }));
  return order;
};

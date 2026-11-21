// The storefront lives on the same small server as the SpaceHank workspace (server/routes/store.routes.mjs).
const API = (import.meta.env.VITE_SPACEHANK_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

const request = async (path, init = {}) => {
  let res;
  try {
    // a plain GET needs no content type (and so no preflight); a POST carries JSON
    res = await fetch(`${API}${path}`, init.body ? { ...init, headers: { 'Content-Type': 'application/json' } } : init);
  } catch {
    const error = new Error('offline');
    error.status = 0;
    throw error;
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(body.error || `HTTP ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return body;
};

export const fetchStore = () => request('/api/store/public');
export const fetchSlots = async () => (await request('/api/store/slots')).slots ?? [];
export const placeOrder = async (input) => (await request('/api/store/order', { method: 'POST', body: JSON.stringify(input) })).order;
export const fetchOrder = async (id) => (await request(`/api/store/order?id=${encodeURIComponent(id)}`)).order;
export const followLink = (slug) => request(`/api/store/go?slug=${encodeURIComponent(slug)}`);
export const sendLead = (input) => request('/api/store/lead', { method: 'POST', body: JSON.stringify(input) });

/** A VietQR picture for a transfer: the bank, the account, the amount and the note already filled in for the banking app. */
export const qrImage = (bank, amount, code) =>
  `https://img.vietqr.io/image/${encodeURIComponent(bank.bin)}-${encodeURIComponent(bank.account)}-compact2.png?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(bank.name)}`;

export const vnd = (n) => `${Math.round(n).toLocaleString('vi-VN')} ₫`;

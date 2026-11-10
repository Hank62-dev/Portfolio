import { createCollection } from '../../core/collections';
import { storage } from '../../core/storage';
import { createStore } from '../../core/store';
import { onSynced } from '../../core/sync/events';

// The Creator Lab keeps everything on this device: the content pipeline, income entries, deals, and a few settings.
export const content = createCollection('content', { order: (a, b) => b.createdAt - a.createdAt });
export const income = createCollection('income', { order: (a, b) => b.at - a.at });
export const deals = createCollection('deals', { order: (a, b) => (a.followUpAt ?? Infinity) - (b.followUpAt ?? Infinity) || b.createdAt - a.createdAt });

const KEY = 'hank62.creator.settings';
const DEFAULTS = {
  language: 'vi', // what the content engine writes in
  niche: '',
  audience: '',
  goal: 0, // this month's income goal, in VND
  hourly: 300000, // your hourly target for client work, in VND
  cpm: 50000, // what a thousand views is worth to a brand, in VND: YOUR assumption
  community: '', // the name of your Discord community
  business: '', // your name or business, for quotes
};

const read = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
};

export const creatorSettings = createStore(read());

const remember = (next) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: the setting lasts for this visit */
  }
};

/** Changes a setting. It is kept on this device at once, and as a record that the sync carries to the other devices. */
export const setSetting = (patch) => {
  const next = { ...creatorSettings.get(), ...patch };
  creatorSettings.set(patch);
  remember(next);
  void storage.settings.put({ id: 'creator', ...next, updatedAt: Date.now() }).catch(() => {});
};

/** Reads the settings kept in the database copy (the other devices'), newest wins. */
export const loadSettings = async () => {
  try {
    const record = await storage.settings.get('creator');
    if (!record) return;
    const { id, updatedAt, ...fields } = record; // eslint-disable-line no-unused-vars -- these two are bookkeeping, not settings
    creatorSettings.set(fields);
    remember({ ...creatorSettings.get() });
  } catch {
    /* the settings kept on this device stay */
  }
};

onSynced((stores) => {
  if (stores.includes('settings')) void loadSettings();
});

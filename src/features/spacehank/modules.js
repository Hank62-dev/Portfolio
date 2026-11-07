import { useMemo } from 'react';
import { createStore, useStore } from './store';
import { storage } from './storage';
import { onSynced } from './sync/events';
import { NAVIGATION, NAV_SECTIONS } from './navigation';

// Which places of the workspace the person wants to see. Everything is on by default; the places that are switched off
// disappear from the menus, the home screen and the search (the data in them stays). A few places are the heart of the
// workspace and cannot be switched off. The choice is kept on this device and, as a settings record, on the others.

export const CORE = ['hank', 'rag', 'notes', 'music'];

export const modules = createStore({ hidden: [] });
/** Whether the sheet that chooses the places is open (any screen can open it). */
export const modulesUi = createStore({ open: false });
export const openModules = () => modulesUi.set({ open: true });
const KEY = 'hank62.modules';

const clean = (list) => [...new Set((Array.isArray(list) ? list : []).filter((id) => NAVIGATION.some((item) => item.id === id) && !CORE.includes(id)))];

const remember = (hidden) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(hidden));
  } catch {
    /* private mode: the choice lasts for this visit */
  }
};

/** Reads what this device remembered (at once, so the first screen is already right). */
export const loadModules = () => {
  try {
    modules.set({ hidden: clean(JSON.parse(localStorage.getItem(KEY) ?? '[]')) });
  } catch {
    /* nothing remembered */
  }
};

/** Reads the choice kept in the database copy (the other devices'). */
export const loadSharedModules = async () => {
  try {
    const record = await storage.settings.get('modules');
    if (!record) return;
    const hidden = clean(record.hidden);
    modules.set({ hidden });
    remember(hidden);
  } catch {
    /* the choice kept on this device stays */
  }
};

/** Switches a place on or off. */
export const setVisible = (id, visible) => {
  if (CORE.includes(id)) return;
  const current = new Set(modules.get().hidden);
  if (visible) current.delete(id);
  else current.add(id);
  const hidden = clean([...current]);
  modules.set({ hidden });
  remember(hidden);
  void storage.settings.put({ id: 'modules', hidden, updatedAt: Date.now() }).catch(() => {});
};

onSynced((stores) => {
  if (stores.includes('settings')) void loadSharedModules();
});

/** The places that are switched on. */
export const visibleNav = (hidden) => NAVIGATION.filter((item) => !hidden.includes(item.id));

/** React: the visible places. */
export const useNav = () => {
  const hidden = useStore(modules, (s) => s.hidden);
  return useMemo(() => visibleNav(hidden), [hidden]);
};

/** The visible places by section, in the order of the sections: [{ section, items }]. */
export const bySection = (items) => NAV_SECTIONS.map((section) => ({ section, items: items.filter((i) => i.section === section) })).filter((g) => g.items.length);

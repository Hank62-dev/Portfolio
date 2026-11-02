import { useEffect, useRef } from 'react';
import { createStore } from './store';

// The one big round button a phone screen offers for what you most want to do there (the "FAB" of Material, the
// compose button of Notes or Mail). A screen says what it is with useFab; the workspace draws it above the tab bar.
export const fabStore = createStore({ fab: null });

/** Registers this screen's main action while it is on show. Pass null to show none. */
export function useFab(fab) {
  const press = useRef(null);
  press.current = fab?.onPress;
  const label = fab?.label;
  const icon = fab?.icon;
  useEffect(() => {
    fabStore.set({ fab: label ? { label, icon, onPress: () => press.current?.() } : null });
    return () => fabStore.set({ fab: null });
  }, [label, icon]);
}

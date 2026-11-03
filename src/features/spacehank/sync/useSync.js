import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { onSynced } from './events';
import { syncStatus } from './index';

/** The sync state, for a status display. */
export const useSyncStatus = () => useStore(syncStatus);

/**
 * Runs `refresh` when a sync wrote changes to one of `stores` on this device (another device changed them), so a screen that
 * keeps its own copy of the data can read it again.
 */
export function useSynced(stores, refresh) {
  const latest = useRef(refresh);
  latest.current = refresh;
  const key = stores.join(',');
  useEffect(() => {
    const wanted = key.split(',');
    return onSynced((stores) => {
      if (stores.some((s) => wanted.includes(s))) latest.current();
    });
  }, [key]);
}

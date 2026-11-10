import { useMemo } from 'react';
import { notesStore } from '../notes/library';
import { useStore } from '../../core/store';
import { diaryLock, hideLocked } from './lock';

/** Whether the diary is hidden right now. */
export const useDiaryLocked = () => useStore(diaryLock, (s) => s.enabled && !s.unlocked);

/** The notes that may be shown: all of them, or without the diary's pages while the diary is locked. */
export function useReadableNotes() {
  const { notes } = useStore(notesStore);
  const locked = useDiaryLocked();
  return useMemo(() => hideLocked(notes, locked), [notes, locked]);
}

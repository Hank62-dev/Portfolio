import { useEffect, useMemo, useState } from 'react';
import { focusLog } from '../focus/log';
import { loadNotes, notesStore } from '../notes/library';
import { useStore } from '../../core/store';
import { derivePet } from './model';

/** Niú as it is right now: re-worked when the diary or the focus log changes, and every few minutes as the day moves on. */
export function usePet() {
  const { notes } = useStore(notesStore);
  const { log } = useStore(focusLog);
  const [minute, setMinute] = useState(() => Math.floor(Date.now() / 300000));

  useEffect(() => {
    void loadNotes();
    const timer = window.setInterval(() => setMinute(Math.floor(Date.now() / 300000)), 60000);
    return () => window.clearInterval(timer);
  }, []);

  // `minute` is only there to make the memo run again as time passes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => derivePet({ notes, log, now: new Date() }), [notes, log, minute]);
}

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, CloudOff } from 'lucide-react';
import { Ring } from '../../shared/ui';
import { clsx } from '../../shared/lib/format';
import { syncNow } from '../sync';
import { useSyncStatus } from '../sync/useSync';
import { tr } from '../lang';

const ago = (at, now) => {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return tr('{0} s ago', s);
  const m = Math.round(s / 60);
  return m < 60 ? tr('{0} min ago', m) : tr('{0} h ago', Math.round(m / 60));
};

const mb = (bytes) => tr('{0} MB', (bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1));

/**
 * Whether this device's data is in step with the owner's database. Tap it to sync now. Shown to the owner only: a guest has
 * nothing to sync.
 */
export default function SyncStatus({ compact = false, className }) {
  const s = useSyncStatus();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(t);
  }, []);

  if (s.state === 'off' && !s.enabled) {
    return (
      <p className={clsx('flex items-start gap-2 text-[0.74rem] leading-snug text-bone-faint', className)} data-sync="off" title={tr('Add DATABASE_URL (a Postgres address) to the realtime service on Render to keep your data in step across devices.')}>
        <CloudOff size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {compact ? tr('Sync is off') : tr('Sync is off: your data stays on this device. Add DATABASE_URL on Render to share it across devices.')}
      </p>
    );
  }

  const busy = s.state === 'syncing';
  const bad = s.state === 'error' || s.state === 'signedout';
  const offline = s.state === 'offline';
  const label = busy ? 'Syncing…' : offline ? tr('Offline: will sync when back') : bad ? tr('Sync problem') : s.last ? tr('Synced {0}', ago(s.last, now)) : tr('Waiting to sync');
  const detail = bad ? s.error : s.pending ? tr('{0} change{1} waiting', s.pending, s.pending > 1 ? tr('s') : '') : s.skipped ? tr('{0} large file{1} stay on this device', s.skipped, s.skipped > 1 ? tr('s') : '') : s.usage ? tr('{0} of {1} used', mb(s.usage.usedBytes), mb(s.usage.quotaBytes)) : '';

  return (
    <button type="button" onClick={() => syncNow()} className={clsx('flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left text-[0.76rem] leading-snug transition-colors hover:bg-wash/[0.05]', bad ? 'text-danger' : 'text-bone-dim', className)} data-sync={s.state} aria-label={tr('{0}. Tap to sync now.', label)}>
      {busy ? <Ring size={14} thickness={2} className="mt-0.5" /> : bad ? <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> : offline ? <CloudOff size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Check size={14} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />}
      <span className="min-w-0">
        <b className="block font-medium">{label}</b>
        {!compact && detail && <small className="block truncate text-bone-faint">{detail}</small>}
      </span>
    </button>
  );
}

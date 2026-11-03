import { useEffect, useState } from 'react';
import { AlertTriangle, Check, CloudOff, RefreshCw } from 'lucide-react';
import { clsx } from '../../../lib/format';
import { syncNow } from '../sync';
import { useSyncStatus } from '../sync/useSync';

const ago = (at, now) => {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
};

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`;

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
      <p className={clsx('flex items-start gap-2 text-[0.74rem] leading-snug text-bone-faint', className)} data-sync="off" title="Add DATABASE_URL (a Postgres address) to the realtime service on Render to keep your data in step across devices.">
        <CloudOff size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        {compact ? 'Sync is off' : 'Sync is off: your data stays on this device. Add DATABASE_URL on Render to share it across devices.'}
      </p>
    );
  }

  const busy = s.state === 'syncing';
  const bad = s.state === 'error' || s.state === 'signedout';
  const offline = s.state === 'offline';
  const label = busy ? 'Syncing…' : offline ? 'Offline: will sync when back' : bad ? 'Sync problem' : s.last ? `Synced ${ago(s.last, now)}` : 'Waiting to sync';
  const detail = bad ? s.error : s.pending ? `${s.pending} change${s.pending > 1 ? 's' : ''} waiting` : s.skipped ? `${s.skipped} large file${s.skipped > 1 ? 's' : ''} stay on this device` : s.usage ? `${mb(s.usage.usedBytes)} of ${mb(s.usage.quotaBytes)} used` : '';

  return (
    <button type="button" onClick={() => syncNow()} className={clsx('flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left text-[0.76rem] leading-snug transition-colors hover:bg-white/[0.05]', bad ? 'text-danger' : 'text-bone-dim', className)} data-sync={s.state} aria-label={`${label}. Tap to sync now.`}>
      {busy ? <RefreshCw size={14} className="mt-0.5 shrink-0 animate-spin" aria-hidden="true" /> : bad ? <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> : offline ? <CloudOff size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Check size={14} className="mt-0.5 shrink-0 text-ok" aria-hidden="true" />}
      <span className="min-w-0">
        <b className="block font-medium">{label}</b>
        {!compact && detail && <small className="block truncate text-bone-faint">{detail}</small>}
      </span>
    </button>
  );
}

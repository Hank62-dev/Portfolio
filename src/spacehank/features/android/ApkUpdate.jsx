import { useState } from 'react';
import { Download, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { isNativeApp } from '../../../shared/lib/platform';
import { tr } from '../../core/i18n/lang';
import { useStore } from '../../core/store';
import { allowInstall, reopenInstaller, startUpdate, updater } from './updater';
import { apkUpdate } from './useAndroid';

const HOLDER = 'fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-1/2 z-[89] w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 animate-fade-in';
const PILL = 'relative flex items-center gap-2.5 overflow-hidden rounded-full border border-line-strong bg-ink-1/90 py-1.5 pr-1.5 pl-4 shadow-[0_18px_40px_-14px_rgb(0_0_0/0.9)] backdrop-blur-2xl';
const BUTTON = 'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-bone px-3.5 font-mono text-[0.78rem] font-medium text-ink-0 transition-transform active:scale-95 disabled:opacity-60';

/**
 * Inside the Android app, when a newer APK is out: a pill like the web's own update pill. "Update" downloads it in the
 * background with its progress shown in the pill, then Android's installer asks once; data and sign-in stay.
 */
export default function ApkUpdate() {
  const { latest } = useStore(apkUpdate);
  const { phase, progress, version } = useStore(updater);
  const [hidden, setHidden] = useState(false);
  if (!isNativeApp() || !latest || hidden) return null;

  const percent = Math.round(progress * 100);
  const label = {
    idle: tr('A new version of the app is ready'),
    checking: tr('Looking for the new version…'),
    permission: tr('Allow Hank62 to install its update'),
    returning: tr('Allow Hank62 to install its update'),
    downloading: progress > 0 ? tr('Downloading… {0}%', percent) : tr('Downloading…'),
    installing: tr('Tap Install in Android’s window'),
    wait: tr('The new version is still being built. Try again in a few minutes.'),
    error: tr('The download failed. Check the connection and try again.'),
  }[phase] ?? tr('A new version of the app is ready');

  const action =
    phase === 'permission' || phase === 'returning'
      ? { text: tr('Allow'), icon: ShieldCheck, run: allowInstall }
      : phase === 'installing'
        ? { text: tr('Open again'), icon: Download, run: reopenInstaller }
        : phase === 'wait' || phase === 'error'
          ? { text: tr('Try again'), icon: RefreshCw, run: startUpdate }
          : { text: tr('Update'), icon: Download, run: startUpdate };
  const working = phase === 'checking' || phase === 'downloading';
  const Icon = action.icon;

  return (
    <div role="status" aria-live="polite" className={HOLDER} data-apk-update>
      <div className={PILL}>
        {phase === 'downloading' && <i className="absolute inset-y-0 left-0 bg-signal/18 transition-[width] duration-200 ease-out" style={{ width: `${percent}%` }} aria-hidden="true" />}
        <span className="relative grid size-2.5 shrink-0 place-items-center" aria-hidden="true">
          <i className="absolute size-2.5 animate-ping rounded-full bg-signal/60 [animation-duration:2s]" />
          <i className="size-2 rounded-full bg-signal" />
        </span>
        <span className="relative min-w-0 flex-1 truncate font-mono text-fine text-bone" title={label}>
          {label}
          {phase === 'idle' && version && <span className="text-bone-dim"> · v{version}</span>}
        </span>
        {!working && (
          <button type="button" onClick={() => void action.run()} className={`relative ${BUTTON}`}>
            <Icon size={13} aria-hidden="true" /> {action.text}
          </button>
        )}
        {working && (
          <span className="relative grid size-9 shrink-0 place-items-center" aria-hidden="true">
            <RefreshCw size={15} className="animate-spin text-bone-dim" />
          </span>
        )}
        {!working && phase !== 'installing' && (
          <button type="button" onClick={() => setHidden(true)} aria-label={tr('Later')} className="relative grid size-9 shrink-0 place-items-center rounded-full text-bone-dim hover:text-bone active:scale-90">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

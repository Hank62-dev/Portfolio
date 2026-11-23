import { createStore } from '../../core/store';
import { Hank62 } from './bridge';
import { apkUpdate } from './useAndroid';

// Updating the Android app from inside it: find the newest APK on the repository's releases, download it in the
// background (Hank62Plugin.downloadUpdate, with progress), and hand it to Android's installer, which asks once. An APK
// from before this existed cannot download by itself, so it gets the releases page instead.
//
// phase: idle → checking → (permission → returning →) downloading → installing; or wait (the newest build is still on its
// way), error (with `error`).

export const updater = createStore({ phase: 'idle', progress: 0, error: '', version: '' });

const RELEASE_API = 'https://api.github.com/repos/Hank62-dev/Portfolio/releases/latest';

/** The APK of a GitHub release: { url, size, version }, or null when it has none. */
export const apkOf = (release) => {
  const asset = (release?.assets ?? []).find((item) => /\.apk$/i.test(item?.name ?? '') && /^https:\/\//.test(item?.browser_download_url ?? ''));
  if (!asset) return null;
  return { url: asset.browser_download_url, size: asset.size ?? 0, version: asset.name.match(/(\d+\.\d+\.\d+)/)?.[1] ?? '' };
};

/** How far a download is, from 0 to 1 (0 while the size is not known). */
export const fraction = (received, total) => (total > 0 ? Math.min(1, Math.max(0, received / total)) : 0);

const openReleases = () => {
  const url = apkUpdate.get().latest?.url || 'https://github.com/Hank62-dev/Portfolio/releases/latest';
  window.open(url, '_blank', 'noopener');
};

let busy = false;

/** Downloads the newest APK and opens the installer. Safe to call again after a refusal or an error. */
export const startUpdate = async () => {
  if (busy) return;
  busy = true;
  updater.set({ phase: 'checking', progress: 0, error: '' });
  let progress = null;
  try {
    const { allowed } = await Hank62.canInstall();
    const response = await fetch(RELEASE_API, { headers: { Accept: 'application/vnd.github+json' } });
    const apk = response.ok ? apkOf(await response.json()) : null;
    if (!apk) {
      updater.set({ phase: 'wait' });
      return;
    }
    updater.set({ version: apk.version });
    if (!allowed) {
      updater.set({ phase: 'permission' });
      return;
    }
    updater.set({ phase: 'downloading', progress: 0 });
    progress = await Hank62.addListener('updateProgress', ({ received, total }) => updater.set({ progress: fraction(received, total || apk.size) }));
    await Hank62.downloadUpdate({ url: apk.url });
    updater.set({ phase: 'installing', progress: 1 });
    await Hank62.installUpdate();
  } catch (error) {
    if (error?.code === 'UNIMPLEMENTED') {
      // an older APK: it can only be updated by hand, from the releases page
      updater.set({ phase: 'idle' });
      openReleases();
    } else if (error?.code === 'NOT_NEWER') updater.set({ phase: 'wait' });
    else updater.set({ phase: 'error', error: error?.message ?? '' });
  } finally {
    busy = false;
    void progress?.remove();
  }
};

/** Opens Android's "Install unknown apps" switch; the update carries on when the person comes back. */
export const allowInstall = async () => {
  try {
    await Hank62.askInstall();
    updater.set({ phase: 'returning' });
    const back = () => {
      if (document.visibilityState !== 'visible') return;
      document.removeEventListener('visibilitychange', back);
      if (updater.get().phase === 'returning') void startUpdate();
    };
    document.addEventListener('visibilitychange', back);
  } catch {
    openReleases();
  }
};

/** The installer was closed without installing: open it again (the file is still there). */
export const reopenInstaller = async () => {
  try {
    await Hank62.installUpdate();
  } catch {
    void startUpdate();
  }
};

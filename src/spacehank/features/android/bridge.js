import { registerPlugin } from '@capacitor/core';
import { isNativeApp } from '../../../shared/lib/platform';
import { createStore } from '../../core/store';

// The app's own native plugin (android/app/src/main/java/dev/hank62/app/Hank62Plugin.java). An APK from before it existed
// answers every call with an error, which is read as "shell 1": that is how the page knows to offer the newer APK.
export const Hank62 = registerPlugin('Hank62');

/** About this install: { checked, shell, version, build, firebase, battery }. */
export const appInfo = createStore({ checked: false, shell: 0, version: '', build: 0, firebase: false, battery: true });

export const refreshInfo = async () => {
  if (!isNativeApp()) return appInfo.get();
  try {
    appInfo.set({ checked: true, ...(await Hank62.info()) });
  } catch {
    appInfo.set({ checked: true, shell: 1, firebase: true }); // the first shell: no plugin yet, but built with Firebase
  }
  return appInfo.get();
};

/** Opens Android's "let it run in the background" dialog; the answer is read again when the app comes back. */
export const askBattery = async () => {
  try {
    await Hank62.askBattery();
  } catch {
    /* no such setting on this phone */
  }
};

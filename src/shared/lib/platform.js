import { Capacitor } from '@capacitor/core';

// Where the page is running: in a browser, or inside the Android app (a Capacitor WebView that loads the live site, see
// capacitor.config.json). The app's bridge is injected into the page, so the same build answers both ways.

/** True inside the Android app. */
export const isNativeApp = () => Capacitor.isNativePlatform();

/** 'android', 'ios' or 'web'. */
export const platformName = () => Capacitor.getPlatform();

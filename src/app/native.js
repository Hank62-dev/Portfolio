import { installMediaBridge } from '../spacehank/features/android/media';

// Inside the Android app, navigator.mediaSession is stood in for before any player module runs (the music player claims
// the media keys as soon as it loads), so this is imported first in main.jsx. In a browser it does nothing.
installMediaBridge();

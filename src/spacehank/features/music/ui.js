import { createStore } from '../../core/store';

// Whether the full-screen player is open (phones only: the mini player opens it, like Spotify's "Now playing").
export const musicUi = createStore({ full: false });
export const openPlayer = () => musicUi.set({ full: true });
export const closePlayer = () => musicUi.set({ full: false });

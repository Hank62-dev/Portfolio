import { createStore } from '../../core/store';

// Whether the full-screen player is open (phones only: the mini player opens it, like Spotify's "Now playing"), and whether the
// player at the foot of a computer's screen is folded into a small turning record in the corner (`mini`, kept on this device).
const MINI = 'hank62.player.mini';
const readMini = () => {
  try {
    return localStorage.getItem(MINI) === '1';
  } catch {
    return false;
  }
};
export const musicUi = createStore({ full: false, mini: readMini() });
export const setMini = (mini) => {
  musicUi.set({ mini });
  try {
    localStorage.setItem(MINI, mini ? '1' : '0');
  } catch {
    /* for this visit */
  }
};
export const openPlayer = () => musicUi.set({ full: true });
export const closePlayer = () => musicUi.set({ full: false });

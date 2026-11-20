import { createStore } from '../../core/store';
import { NONE, sceneOf } from './scenes';

// Which live wallpaper is behind the workspace (none by default), kept on this device.

const KEY = 'hank62.wallpaper';
const read = () => {
  try {
    const saved = localStorage.getItem(KEY);
    return sceneOf(saved) ? saved : NONE;
  } catch {
    return NONE;
  }
};

export const wallpaperState = createStore({ id: read() });

export const setWallpaper = (id) => {
  const next = sceneOf(id) ? id : NONE;
  wallpaperState.set({ id: next });
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* for this visit */
  }
};

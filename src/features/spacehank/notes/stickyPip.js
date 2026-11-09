import { createStore } from '../store';

// A sticky note popped out of the app into a small window of its own that stays on top of every other app on the
// computer (the browser's Document Picture-in-Picture). It lasts while the Hank62 tab is open, in the background or
// minimised too; closing the tab closes it. Chrome and Edge on a computer have it; elsewhere the button does not show.
// The browser allows one such window per tab, so popping out another sticky moves that one into it.

/** Whether this browser can float a window over other apps. */
export const canPopOut = () => typeof window !== 'undefined' && 'documentPictureInPicture' in window && window.self === window.top;

/** `win`: the floating window, `id`: the sticky in it. */
export const pip = createStore({ win: null, id: null });

/** The floating window gets the app's styles and theme, so the sticky looks the same in it. */
const dress = (win) => {
  const doc = win.document;
  for (const node of document.head.querySelectorAll('style, link[rel="stylesheet"], link[rel="preconnect"]')) doc.head.append(node.cloneNode(true));
  for (const { name, value } of document.documentElement.attributes) doc.documentElement.setAttribute(name, value);
  doc.title = 'Hank62';
  doc.body.style.margin = '0';
  doc.body.style.overflow = 'hidden';
  // styles the app adds later (the dev server adds them as modules load) follow it there too
  const watch = new MutationObserver((changes) => {
    for (const change of changes) for (const node of change.addedNodes) if (node.nodeName === 'STYLE' || (node.nodeName === 'LINK' && node.rel === 'stylesheet')) doc.head.append(node.cloneNode(true));
  });
  watch.observe(document.head, { childList: true });
  win.addEventListener('pagehide', () => watch.disconnect());
};

/**
 * Floats the sticky `id` over every app. Must run from a click (the browser asks for one). `size` is the sticky's own,
 * so the window opens at the size it had on the page. Returns whether it worked.
 */
export const popOut = async (id, size = { w: 300, h: 260 }) => {
  if (!canPopOut()) return false;
  const open = pip.get().win;
  if (open && !open.closed) {
    pip.set({ id });
    open.focus?.();
    return true;
  }
  try {
    const win = await window.documentPictureInPicture.requestWindow({ width: Math.round(size.w), height: Math.round(size.h) });
    dress(win);
    win.addEventListener('pagehide', () => {
      if (pip.get().win === win) pip.set({ win: null, id: null });
    });
    pip.set({ win, id });
    return true;
  } catch {
    return false;
  }
};

/** Brings the floating sticky back into the app. */
export const popIn = () => {
  const { win } = pip.get();
  pip.set({ win: null, id: null });
  if (win && !win.closed) win.close();
};

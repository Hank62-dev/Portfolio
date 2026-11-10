import { createStore } from '../../core/store';

// The quick-capture sheet is one thing for the whole workspace: any screen, the search or a keyboard shortcut can open it
// (with some words already typed), and the workspace draws it once. `from` is where it opened from, as the middle of the
// button that was pressed ({ x, y } in the window), so the sheet can grow out of that button.
export const captureUi = createStore({ open: false, text: '', from: null });

const centreOf = (source) => {
  const el = source?.currentTarget ?? source;
  if (!el?.getBoundingClientRect) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Opens the sheet. `source` (optional) is the button or the click event it came from. */
export const openCapture = (text = '', source) => captureUi.set({ open: true, text: String(text), from: centreOf(source) });
export const closeCapture = () => captureUi.set({ open: false, text: '' });

import { createStore } from '../store';

// The quick-capture sheet is one thing for the whole workspace: any screen, the search or a keyboard shortcut can open it
// (with some words already typed), and the workspace draws it once.
export const captureUi = createStore({ open: false, text: '' });

export const openCapture = (text = '') => captureUi.set({ open: true, text: String(text) });
export const closeCapture = () => captureUi.set({ open: false, text: '' });

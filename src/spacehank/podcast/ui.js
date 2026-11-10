import { createStore } from '../store';

// Where the Podcast tab was left (which list, which show), so coming back to the tab finds it as it was; and whether the
// big player on the tab is on screen, so the bar at the bottom only shows when it is not.
export const podcastUi = createStore({
  tab: 'library', // 'library' | 'find'
  open: null, // the show being looked at: { feedUrl, title, author, image }
  term: '', // the last search
  cardVisible: false,
});

export const openShow = (show) => podcastUi.set({ open: show ? { feedUrl: show.feedUrl, title: show.title, author: show.author, image: show.image } : null });

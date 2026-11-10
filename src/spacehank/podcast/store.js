import { createCollection } from '../collections';

// show: { id, feedUrl, title, author, image, createdAt }, a podcast that is followed
export const shows = createCollection('shows', { order: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) });

// listen: { id, show, guid, title, showTitle, image, audio, duration, position (s), done, at }, where an episode was left
export const listens = createCollection('listens', { order: (a, b) => b.at - a.at });

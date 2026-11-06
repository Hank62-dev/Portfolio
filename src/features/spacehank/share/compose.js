import { tr } from '../lang';
// What another app hands over when someone taps Share and picks Hank62: a title, some text and/or a link, and maybe pictures.
// Phones are not consistent about it (Chrome on Android usually puts the link inside the text and leaves `url` empty), so
// this sorts it out and builds the note that will be saved. Plain functions, no browser needed.

const LINK = /https?:\/\/[^\s<>"')\]]+/gi;
const TRAILING = /[.,;:!?]+$/;

/** The first link in a piece of text, or ''. */
export const firstLink = (text) => (String(text ?? '').match(LINK)?.[0] ?? '').replace(TRAILING, '');

/** "example.com" for a link, or '' when it is not one. */
export const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

/** { title, text, url } with the link found wherever it was and taken out of the text it came with. */
export const tidyShare = ({ title = '', text = '', url = '' } = {}) => {
  const clean = (value) => String(value ?? '').replace(/\r\n/g, '\n').trim();
  let body = clean(text);
  let link = clean(url);
  if (!link) {
    link = firstLink(body);
    if (link) body = body.replace(link, '').replace(/[ \t]+\n/g, '\n').trim();
  }
  const heading = clean(title);
  // a page title and a text that only repeats it are one thing, not two
  if (body === heading) body = '';
  return { title: heading, text: body, url: link };
};

/** The text of the note to save: a heading, what was written, and the link on its own line with where it points. */
export const noteFromShare = (share) => {
  const { title, text, url } = tidyShare(share);
  const lines = [];
  if (title) lines.push(`# ${title}`);
  if (text) lines.push(text);
  if (url) lines.push(url);
  return lines.join('\n\n');
};

/** Whether there is anything to save: words, a link or a picture. */
export const hasContent = (share, files = 0) => Boolean(noteFromShare(share) || files > 0);

/** A short line for the sheet: what arrived. */
export const describeShare = (share, files = 0) => {
  const { title, text, url } = tidyShare(share);
  const parts = [];
  if (url) parts.push(hostOf(url) || 'a link');
  else if (title || text) parts.push('some text');
  if (files > 0) parts.push(files === 1 ? 'a picture' : tr('{0} pictures', files));
  return parts.join(' and ') || 'nothing';
};

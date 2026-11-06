import { tr } from '../lang';
import { textToHtml } from './notes';

// Turning the text of a file into a note. Every format ends up as the same thing the editor keeps: HTML made only of what
// the editor understands (headings, lists, task lists, quotes, code, tables, links, bold and italic) plus the plain text of
// it for search. Pure functions, no browser: the reading of the files themselves (docx, xlsx) is in readers.js.
//
// Everything written into the HTML is escaped here, so a file can never smuggle markup into a note; the editor then
// only keeps what its own schema allows.

const escapeHtml = (text) => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A note is one record that is synced as a whole (the server takes 256 KB of it), so an import is cut well before that. */
export const MAX_HTML = 100_000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_COLUMNS = 40;

/** A text file's first character may be a byte-order mark (Excel and Notepad add one): it is not part of the text. */
export const stripBom = (text) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);

// ---- markdown

const safeHref = (href) => (/^(https?:|mailto:)/i.test(String(href ?? '').trim()) ? escapeHtml(String(href).trim()) : '');

const inline = (tokens = []) =>
  tokens
    .map((token) => {
      switch (token.type) {
        case 'strong':
          return `<strong>${inline(token.tokens)}</strong>`;
        case 'em':
          return `<em>${inline(token.tokens)}</em>`;
        case 'del':
          return `<s>${inline(token.tokens)}</s>`;
        case 'codespan':
          return `<code>${escapeHtml(token.text)}</code>`;
        case 'br':
          return '<br>';
        case 'link': {
          const href = safeHref(token.href);
          return href ? `<a href="${href}">${inline(token.tokens)}</a>` : inline(token.tokens);
        }
        case 'image':
          return token.text ? escapeHtml(token.text) : '';
        case 'html':
          return escapeHtml(token.text); // markup in a markdown file is shown as the text it is, never run
        default:
          return token.tokens ? inline(token.tokens) : escapeHtml(token.text ?? token.raw ?? '');
      }
    })
    .join('');

/** A table from rows of ready-made cell HTML. The first row is the header. */
const tableOf = (rows) => {
  const body = rows
    .map((row, r) => `<tr>${row.slice(0, MAX_COLUMNS).map((cell) => `<${r === 0 ? 'th' : 'td'}><p>${cell}</p></${r === 0 ? 'th' : 'td'}>`).join('')}</tr>`)
    .join('');
  return `<table><tbody>${body}</tbody></table>`;
};

const item = (entry, task) => {
  const content = entry.tokens
    .filter((token) => token.type !== 'checkbox')
    .map((token) => (token.type === 'text' ? `<p>${inline(token.tokens ?? [token])}</p>` : block(token)))
    .join('');
  return task ? `<li data-type="taskItem" data-checked="${Boolean(entry.checked)}">${content || '<p></p>'}</li>` : `<li>${content || '<p></p>'}</li>`;
};

const block = (token) => {
  switch (token.type) {
    case 'heading':
      return `<h${Math.min(token.depth, 3)}>${inline(token.tokens)}</h${Math.min(token.depth, 3)}>`;
    case 'paragraph':
      return `<p>${inline(token.tokens)}</p>`;
    case 'text':
      return `<p>${inline(token.tokens ?? [token])}</p>`;
    case 'list': {
      const tasks = token.items.some((entry) => entry.task);
      if (tasks) return `<ul data-type="taskList">${token.items.map((entry) => item(entry, true)).join('')}</ul>`;
      const tag = token.ordered ? 'ol' : 'ul';
      return `<${tag}>${token.items.map((entry) => item(entry, false)).join('')}</${tag}>`;
    }
    case 'code':
      return `<pre><code>${escapeHtml(token.text)}</code></pre>`;
    case 'blockquote':
      return `<blockquote>${blocks(token.tokens)}</blockquote>`;
    case 'hr':
      return '<hr>';
    case 'table':
      return tableOf([token.header, ...token.rows].map((row) => row.map((cell) => inline(cell.tokens))));
    case 'html':
      return /^\s*<!--/.test(token.text) || !token.text.trim() ? '' : `<p>${escapeHtml(token.text.trim())}</p>`;
    default:
      return '';
  }
};

const blocks = (tokens = []) => tokens.map(block).join('');

/** Markdown the lexer of `marked` has already split into tokens, as the editor's HTML. */
export const markdownTokensToHtml = (tokens) => blocks(tokens);

// ---- tables from a spreadsheet or a csv

/** A cell value as text. Dates come out as a day, not as a machine timestamp. */
export const cellText = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const iso = value.toISOString();
    return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso.slice(0, 16).replace('T', ' ');
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
};

/** Rows of values as a table; trailing empty rows and columns are dropped. */
export const rowsToHtml = (rows) => {
  const cleaned = rows.map((row) => row.map(cellText));
  while (cleaned.length && cleaned[cleaned.length - 1].every((cell) => !cell.trim())) cleaned.pop();
  const width = Math.min(MAX_COLUMNS, Math.max(0, ...cleaned.map((row) => row.reduce((last, cell, i) => (cell.trim() ? i + 1 : last), 0))));
  if (!cleaned.length || !width) return '';
  return tableOf(cleaned.map((row) => Array.from({ length: width }, (_, i) => escapeHtml(row[i] ?? '').replace(/\n/g, '<br>'))));
};

/** Comma-, semicolon- or tab-separated text, respecting "quoted, fields" and "" inside them. */
export const parseDelimited = (text, delimiter) => {
  const source = stripBom(String(text ?? ''));
  const first = source.split('\n')[0];
  const sep = delimiter ?? [',', ';', '\t'].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0]; // the one that splits the first line most
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === sep) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

// ---- plain text and HTML

/** A text file: the same light touch the editor gives older notes ("# " headings, "- " lists, "- [ ] " tasks). */
export const plainTextToHtml = (text) => textToHtml(stripBom(String(text ?? '')).replace(/\r\n?/g, '\n'));

const decode = (text) =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    .replace(/&amp;/g, '&');

/** The words of some HTML, one block per line, for search and for the note's title. */
export const htmlToText = (html) =>
  decode(
    String(html ?? '')
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<\/p>\s*(?=<\/t[dh]>)/gi, '') // a cell's own paragraph is not a line of its own
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|h[1-6]|li|tr|pre|blockquote|div|table)>/gi, '\n')
      .replace(/<\/t[dh]>/gi, '\t')
      .replace(/<[^>]*>/g, '')
  )
    .split('\n')
    .map((line) => line.replace(/\t+/g, ' · ').replace(/(?: · )+$/, '').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Only the part of a web page that is the page: no head, scripts, styles or comments. */
export const bodyOf = (html) => {
  const text = String(html ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|head|noscript|template)\b[\s\S]*?<\/\1>/gi, '');
  const body = /<body\b[^>]*>([\s\S]*?)(?:<\/body>|$)/i.exec(text);
  return (body ? body[1] : text).trim();
};

const VOID = new Set(['br', 'hr', 'img', 'input', 'col', 'meta', 'link', 'wbr']);

/** The top-level pieces of some HTML: each paragraph, list, table... as its own string. Loose text becomes a paragraph. */
export const splitTopLevel = (html) => {
  const out = [];
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let depth = 0;
  let start = 0;
  let match;
  const loose = (to) => {
    const text = html.slice(start, to).trim();
    if (text) out.push(`<p>${text}</p>`);
  };
  while ((match = tag.exec(html))) {
    const [whole, closing, name, selfClosing] = match;
    const lower = name.toLowerCase();
    if (depth === 0 && !closing) {
      loose(match.index);
      start = match.index;
    }
    if (closing) depth = Math.max(0, depth - 1);
    else if (!VOID.has(lower) && !selfClosing) depth += 1;
    if (depth === 0) {
      out.push(html.slice(start, match.index + whole.length));
      start = match.index + whole.length;
    }
  }
  loose(html.length);
  return out;
};

const cutText = (inner, room) => {
  if (inner.length <= room) return inner;
  const cut = inner.slice(0, Math.max(0, room)).replace(/&[^;\s]*$/, '');
  const space = cut.lastIndexOf(' ');
  return (space > room / 2 ? cut.slice(0, space) : cut).trimEnd();
};

/** The HTML cut at a block boundary to fit `limit` characters. A table is cut at a row, a long paragraph at a word. */
export const fitHtml = (html, limit = MAX_HTML) => {
  const kept = [];
  let used = 0;
  for (const piece of splitTopLevel(html)) {
    if (used + piece.length <= limit) {
      kept.push(piece);
      used += piece.length;
      continue;
    }
    const room = limit - used;
    if (/^<table/i.test(piece)) {
      const rows = piece.split(/(?<=<\/tr>)/i);
      const closing = /<tbody/i.test(piece) ? '</tbody></table>' : '</table>';
      let part = '';
      for (const row of rows.slice(0, -1)) {
        if (part.length + row.length + closing.length > room) break;
        part += row;
      }
      if (/<tr/i.test(part)) kept.push(part + closing);
    } else if (/^<p>/i.test(piece) && room > 200) {
      kept.push(`<p>${cutText(piece.slice(3, -4), room - 20)}…</p>`);
    }
    return { html: kept.join(''), truncated: true };
  }
  return { html: kept.join(''), truncated: false };
};

/** A file's name without its extension: the title a note gets when the file has none of its own. */
export const fileTitle = (name) => String(name ?? '').replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '').trim() || 'Untitled';

/** What every file ends as: the note's html and plain text, its title, and whether the file had to be cut. */
export const noteFromHtml = (name, html) => {
  const title = fileTitle(name);
  const fitted = fitHtml(html);
  let result = fitted.html;
  if (!/^\s*<h[1-3][\s>]/i.test(result)) result = `<h1>${escapeHtml(title)}</h1>${result}`;
  if (fitted.truncated) result += `<p><em>${escapeHtml(tr('The rest of this file was too long to keep in a note, and was left out.'))}</em></p>`;
  return { html: result, text: htmlToText(result), title, truncated: fitted.truncated };
};

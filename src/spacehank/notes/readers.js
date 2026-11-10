import { MAX_FILE_BYTES, bodyOf, fileTitle, htmlToText, markdownTokensToHtml, noteFromHtml, parseDelimited, plainTextToHtml, rowsToHtml, stripBom } from './convert';
import { tr } from '../lang';

// Reading a file into a note. What each format needs (a Word reader, a spreadsheet reader, a markdown parser) is loaded
// only when such a file is chosen, so the notes page itself does not carry them.

const KINDS = {
  json: ['json'],
  markdown: ['md', 'markdown', 'mdown'],
  text: ['txt', 'text', 'log'],
  csv: ['csv', 'tsv'],
  html: ['html', 'htm'],
  docx: ['docx'],
  xlsx: ['xlsx'],
};

/** What the file picker offers. */
export const IMPORT_ACCEPT = Object.values(KINDS).flat().map((ext) => `.${ext}`).join(',');

const extensionOf = (name) => String(name ?? '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? '';

/** 'markdown', 'docx'... for a file name, or '' when it is not something that can be a note. */
export const kindOf = (name) => Object.entries(KINDS).find(([, list]) => list.includes(extensionOf(name)))?.[0] ?? '';

const fail = (message) => {
  throw new Error(message);
};

const reasonFor = (name) => {
  const ext = extensionOf(name);
  if (ext === 'doc') return tr('Old .doc files cannot be read: save it as .docx in Word first.');
  if (ext === 'xls') return tr('Old .xls files cannot be read: save it as .xlsx in Excel first.');
  if (ext === 'pdf') return tr('PDF files cannot be turned into a note. Put them in Documents instead.');
  return tr('This kind of file cannot be imported.');
};

/** A file as a note: { html, text, title, truncated }. Throws an Error with a sentence the person can read. */
export const readNoteFile = async (file) => {
  const kind = kindOf(file.name);
  if (!kind || kind === 'json') fail(reasonFor(file.name));
  if (file.size > MAX_FILE_BYTES) fail(tr('That file is bigger than 10 MB.'));

  let html;
  try {
    if (kind === 'markdown') {
      const { marked } = await import('marked');
      html = markdownTokensToHtml(marked.lexer(stripBom(await file.text())));
    } else if (kind === 'text') {
      html = plainTextToHtml(await file.text());
    } else if (kind === 'csv') {
      html = rowsToHtml(parseDelimited(await file.text(), extensionOf(file.name) === 'tsv' ? '\t' : undefined));
    } else if (kind === 'html') {
      html = bodyOf(await file.text());
    } else if (kind === 'docx') {
      const mammoth = (await import('mammoth/mammoth.browser.js')).default;
      // pictures are left out: a note keeps words, and a picture would be megabytes in a record that syncs
      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, { convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })) });
      html = result.value.replace(/<img\b[^>]*>/gi, '');
    } else if (kind === 'xlsx') {
      const { default: readExcelFile } = await import('read-excel-file/universal');
      const sheets = await readExcelFile(file);
      const safe = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
      // the file's name is the title; each sheet is a section under it
      html = `<h1>${safe(fileTitle(file.name))}</h1>${sheets.map(({ sheet, data }) => `<h2>${safe(sheet)}</h2>${rowsToHtml(data) || `<p>${tr('(empty sheet)')}</p>`}`).join('')}`;
    }
  } catch (error) {
    fail(tr('"{0}" could not be read: it may be damaged or protected.', file.name) + (error?.message ? ` (${String(error.message).slice(0, 80)})` : ''));
  }
  if (!htmlToText(html)) fail(tr('"{0}" has nothing in it to import.', file.name));
  return noteFromHtml(file.name, html);
};

import { marked } from 'marked';
import { describe, expect, it } from 'vitest';
import { MAX_HTML, bodyOf, cellText, fileTitle, fitHtml, htmlToText, markdownTokensToHtml, noteFromHtml, parseDelimited, plainTextToHtml, rowsToHtml, splitTopLevel } from './convert';

const md = (text) => markdownTokensToHtml(marked.lexer(text));

describe('markdown', () => {
  it('keeps headings, emphasis, code, quotes and rules', () => {
    expect(md('# Title\n\nSome **bold**, *italic*, ~~gone~~ and `code`.\n\n> quoted\n\n---')).toBe(
      '<h1>Title</h1><p>Some <strong>bold</strong>, <em>italic</em>, <s>gone</s> and <code>code</code>.</p><blockquote><p>quoted</p></blockquote><hr>'
    );
  });

  it('turns task lists into the editor’s task items, and keeps nesting', () => {
    expect(md('- [x] done\n- [ ] todo\n  - nested')).toBe(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>done</p></li><li data-type="taskItem" data-checked="false"><p>todo</p><ul><li><p>nested</p></li></ul></li></ul>'
    );
    expect(md('1. one\n2. two')).toBe('<ol><li><p>one</p></li><li><p>two</p></li></ol>');
  });

  it('makes a table with a header row', () => {
    expect(md('| a | b |\n|---|---|\n| 1 & 2 | **3** |')).toBe('<table><tbody><tr><th><p>a</p></th><th><p>b</p></th></tr><tr><td><p>1 &amp; 2</p></td><td><p><strong>3</strong></p></td></tr></tbody></table>');
  });

  it('never lets markup or a script address through', () => {
    const html = md('Hi <script>alert(1)</script> [bad](javascript:alert(1)) [ok](https://example.com) ![pic](x.png)\n\n<div onclick="x()">raw</div>\n\n```\n<b>code</b>\n```');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<div');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<a href="https://example.com">ok</a>');
    expect(html).toContain('<pre><code>&lt;b&gt;code&lt;/b&gt;</code></pre>');
  });

  it('caps headings at the levels the editor offers', () => {
    expect(md('###### small')).toBe('<h3>small</h3>');
  });
});

describe('tables from a sheet or a csv', () => {
  it('writes dates as days and drops empty trailing rows and columns', () => {
    expect(cellText(new Date(Date.UTC(2026, 10, 6)))).toBe('2026-11-06');
    expect(cellText(new Date(Date.UTC(2026, 10, 6, 14, 30)))).toBe('2026-11-06 14:30');
    expect(cellText(null)).toBe('');
    expect(cellText(true)).toBe('TRUE');
    const html = rowsToHtml([['Name', 'Score', null], ['An & Binh', 9.5, null], [null, null, null]]);
    expect(html).toBe('<table><tbody><tr><th><p>Name</p></th><th><p>Score</p></th></tr><tr><td><p>An &amp; Binh</p></td><td><p>9.5</p></td></tr></tbody></table>');
    expect(rowsToHtml([[null, null]])).toBe('');
  });

  it('reads quoted csv fields, escaped quotes and line breaks inside them', () => {
    expect(parseDelimited('name,note\n"Lan, Hai","said ""hi"""\nMinh,"two\nlines"\n')).toEqual([
      ['name', 'note'],
      ['Lan, Hai', 'said "hi"'],
      ['Minh', 'two\nlines'],
    ]);
  });

  it('finds the separator by itself, and knows tabs', () => {
    expect(parseDelimited('a;b;c\n1;2;3')[1]).toEqual(['1', '2', '3']);
    expect(parseDelimited('a\tb\n1\t2', '\t')[1]).toEqual(['1', '2']);
    expect(parseDelimited('\uFEFFx,y\r\n1,2\r\n')).toEqual([['x', 'y'], ['1', '2']]);
  });
});

describe('plain text and html', () => {
  it('gives a text file the light formatting the editor already knows', () => {
    expect(plainTextToHtml('# Plan\r\n- one\r\n- [x] two\r\nplain <b>')).toBe('<h1>Plan</h1><ul><li><p>one</p></li></ul><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>two</p></li></ul><p>plain &lt;b&gt;</p>');
  });

  it('reads the text out of html, a block to a line', () => {
    expect(htmlToText('<h1>T &amp; U</h1><p>one<br>two</p><ul><li>a</li><li>b</li></ul><table><tr><td>x</td><td>y</td></tr></table><script>no()</script>')).toBe('T & U\none\ntwo\na\nb\nx · y');
  });

  it('takes only the body of a web page', () => {
    expect(bodyOf('<html><head><title>t</title><style>p{}</style></head><body><!-- c --><p>hi</p><script>x()</script></body></html>')).toBe('<p>hi</p>');
  });
});

describe('fitting a file into a note', () => {
  it('splits html into its top-level blocks, keeping lists and tables whole', () => {
    expect(splitTopLevel('<h1>a</h1><ul><li><p>x</p></li></ul><hr>loose<p>b<br>c</p>')).toEqual(['<h1>a</h1>', '<ul><li><p>x</p></li></ul>', '<hr>', '<p>loose</p>', '<p>b<br>c</p>']);
  });

  it('keeps all of a short file', () => {
    expect(fitHtml('<p>a</p><p>b</p>')).toEqual({ html: '<p>a</p><p>b</p>', truncated: false });
  });

  it('cuts at a block, a table row or a word, never inside a tag', () => {
    const paragraphs = Array.from({ length: 50 }, (_, i) => `<p>${'word '.repeat(10)}${i}</p>`).join('');
    const cut = fitHtml(paragraphs, 500);
    expect(cut.truncated).toBe(true);
    expect(cut.html.length).toBeLessThanOrEqual(500);
    expect(cut.html.endsWith('</p>')).toBe(true);

    const rows = Array.from({ length: 100 }, (_, i) => `<tr><td><p>row ${i}</p></td></tr>`).join('');
    const table = fitHtml(`<table><tbody>${rows}</tbody></table>`, 400);
    expect(table.truncated).toBe(true);
    expect(table.html.endsWith('</tr></tbody></table>')).toBe(true);
    expect(table.html.length).toBeLessThanOrEqual(400);

    const long = fitHtml(`<p>${'lorem &amp; ipsum '.repeat(2000)}</p>`, 1000);
    expect(long.truncated).toBe(true);
    expect(long.html).toMatch(/^<p>.*…<\/p>$/);
    expect(long.html).not.toMatch(/&[a-z]*…/);
  });

  it('gives a note its file name as a title unless the file has its own heading', () => {
    expect(noteFromHtml('C:\\docs\\Meeting notes.docx', '<p>hello</p>')).toMatchObject({ html: '<h1>Meeting notes</h1><p>hello</p>', text: 'Meeting notes\nhello', title: 'Meeting notes', truncated: false });
    expect(noteFromHtml('x.md', '<h2>Own title</h2><p>hello</p>').html).toBe('<h2>Own title</h2><p>hello</p>');
    expect(fileTitle('a/b/Budget 2026.final.xlsx')).toBe('Budget 2026.final');
    expect(fileTitle('')).toBe('Untitled');
  });

  it('stays under what a synced record can hold, and says it was cut', () => {
    const huge = Array.from({ length: 5000 }, (_, i) => `<p>${'a line of the file '.repeat(5)}${i}</p>`).join('');
    const note = noteFromHtml('big.txt', huge);
    expect(note.truncated).toBe(true);
    expect(note.html.length).toBeLessThan(MAX_HTML + 400);
    expect(JSON.stringify({ text: note.text, html: note.html }).length).toBeLessThan(250 * 1024);
    expect(note.text).toContain('too long');
  });
});

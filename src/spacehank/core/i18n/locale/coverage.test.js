import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import { describe, expect, it } from 'vitest';
import { en } from './en.js';
import { vi } from './vi.js';

// Every text the code passes to tr() must have a translation, in the table of the *other* language: English text needs a
// Vietnamese entry, and text first written in Vietnamese needs an English one. A new tr('…') without its entry fails here
// instead of showing up half-translated on screen.

// the whole of SpaceHank (this file is in src/spacehank/core/i18n/locale)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const VIET = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;

const files = [];
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) {
      if (name !== 'locale') walk(file);
    } else if (/\.(js|jsx)$/.test(name) && !/\.test\./.test(name)) files.push(file);
  }
};
walk(ROOT);

const used = new Map(); // text -> file
for (const file of files) {
  const ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'tr' && node.arguments[0]?.type === 'StringLiteral') {
      used.set(node.arguments[0].value, path.relative(ROOT, file));
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child.type === 'string') visit(child);
    }
  };
  visit(ast.program);
}

describe('translations', () => {
  it('finds the text the code translates', () => {
    expect(used.size).toBeGreaterThan(1000);
  });

  // Which language a text was written in is told by its marks (Vietnamese has diacritics), unless an entry says otherwise:
  // a short Vietnamese word without marks ("trang", "Bao") has its English entry, and an English sentence holding a
  // Vietnamese name ("the Tết dice game") has its Vietnamese one.
  const writtenIn = (text) => (text in en && !(text in vi) ? 'vi' : text in vi && !(text in en) ? 'en' : VIET.test(text) ? 'vi' : 'en');

  it('has a Vietnamese entry for every English text', () => {
    const missing = [...used].filter(([text]) => writtenIn(text) === 'en' && !(text in vi) && /[A-Za-z]{2}/.test(text)).map(([text, file]) => `${file}: ${text}`);
    expect(missing).toEqual([]);
  });

  it('has an English entry for every Vietnamese text', () => {
    const missing = [...used].filter(([text]) => writtenIn(text) === 'vi' && !(text in en)).map(([text, file]) => `${file}: ${text}`);
    expect(missing).toEqual([]);
  });

  // the two ways a text is taken for the wrong language, and so is never translated for the other one
  const words = (text) => text.toLowerCase().match(/[\p{L}\d]+/gu) ?? [];
  it('has no English text filed as Vietnamese (its "English" is the same words)', () => {
    const wrong = Object.entries(en).filter(([text, said]) => {
      const mine = words(text);
      const theirs = new Set(words(said));
      return said !== text && mine.length >= 3 && mine.filter((w) => theirs.has(w)).length / mine.length >= 0.8 && !(text in vi);
    });
    expect(wrong.map(([text]) => text)).toEqual([]);
  });

  // Vietnamese words that, without their marks, read as English; a Vietnamese table entry giving them back as they are is a misfire
  const UNMARKED_VIETNAMESE = ['trang', 'bao', 'xu', 'vui', 'cn', 'anh', 'em', 'con', 'cho', 'ban', 'ngay', 'nam', 'thang', 'tuan', 'gio'];
  it('does not give a Vietnamese word back unchanged as its own Vietnamese', () => {
    const wrong = Object.entries(vi).filter(([text, said]) => text === said && words(text).some((w) => UNMARKED_VIETNAMESE.includes(w)) && !(text in en));
    expect(wrong.map(([text]) => text)).toEqual([]);
  });

  it('never invents a {0} placeholder the text does not have', () => {
    // a language may leave one out (Vietnamese has no plural ending), but not add one
    const holes = (text) => text.match(/\{\d+\}/g) ?? [];
    const wrong = [];
    for (const table of [vi, en]) for (const [text, said] of Object.entries(table)) if (holes(said).some((hole) => !holes(text).includes(hole))) wrong.push(`${text} -> ${said}`);
    expect(wrong).toEqual([]);
  });
});

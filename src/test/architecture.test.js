import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The shape of the code, checked: who may import whom (see ARCHITECTURE.md). It reads every import in src/ and server/
// (relative ones and the "@/" alias for src/) and fails on an import that goes round in a circle, on one that points at a
// file that is not there, and on one that crosses a layer the wrong way.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CODE = /\.(jsx?|mjs)$/;
const EXTENSIONS = ['', '.js', '.jsx', '.mjs', '/index.js', '/index.jsx'];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : CODE.test(name) ? [full] : [];
  });

const relative = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'server'))].map(relative);
const known = new Set(files);

const IMPORT = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g;

/** Where an import points, as a path from the repository root; null for a package (react, three…). */
const target = (from, spec) => {
  let base;
  if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith('.')) base = path.posix.join(path.posix.dirname(from), spec);
  else return null;
  if (!CODE.test(base) && /\.[a-z0-9]+$/i.test(base) && !/\.(js|jsx|mjs)$/.test(base)) return { asset: base };
  for (const ext of EXTENSIONS) if (known.has(base + ext)) return { file: base + ext };
  return { missing: base };
};

const graph = Object.fromEntries(
  files.map((file) => {
    const text = readFileSync(path.join(ROOT, file), 'utf8');
    return [file, [...text.matchAll(IMPORT)].map((m) => target(file, m[1] || m[2] || m[3])).filter(Boolean)];
  })
);

/** Groups of files that import each other round in a circle (Tarjan's strongly connected components). */
const cycles = () => {
  let next = 0;
  const index = {};
  const low = {};
  const stack = [];
  const onStack = new Set();
  const found = [];
  const visit = (v) => {
    index[v] = low[v] = next++;
    stack.push(v);
    onStack.add(v);
    for (const { file: w } of graph[v]) {
      if (!w) continue;
      if (!(w in index)) {
        visit(w);
        low[v] = Math.min(low[v], low[w]);
      } else if (onStack.has(w)) low[v] = Math.min(low[v], index[w]);
    }
    if (low[v] === index[v]) {
      const group = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        group.push(w);
      } while (w !== v);
      if (group.length > 1) found.push(group.sort());
    }
  };
  for (const v of files) if (!(v in index)) visit(v);
  return found;
};

/**
 * The layers. `area` names a part of the tree by its path; `mayNotImport` lists the areas it must not reach into. An import
 * inside the same area is always fine. Tests are left out: a test may reach whatever it checks.
 */
const RULES = [];

const areaOf = (file) => RULES.find((rule) => file.startsWith(rule.area))?.area ?? null;
const isTest = (file) => /\.test\.(m?jsx?)$/.test(file) || file.startsWith('src/test/');

describe('the shape of the code', () => {
  it('has no imports that go round in a circle', () => {
    expect(cycles()).toEqual([]);
  });

  it('has no import that points at a missing file', () => {
    const missing = Object.entries(graph).flatMap(([file, targets]) => targets.filter((t) => t.missing).map((t) => `${file} -> ${t.missing}`));
    expect(missing).toEqual([]);
  });

  it('has every asset it imports', () => {
    const gone = Object.entries(graph).flatMap(([file, targets]) => targets.filter((t) => t.asset && !existsSync(path.join(ROOT, t.asset))).map((t) => `${file} -> ${t.asset}`));
    expect(gone).toEqual([]);
  });

  it('crosses no layer the wrong way', () => {
    const wrong = [];
    for (const [file, targets] of Object.entries(graph)) {
      if (isTest(file)) continue;
      const rule = RULES.find((r) => file.startsWith(r.area));
      if (!rule) continue;
      for (const { file: to } of targets) {
        if (!to || areaOf(to) === rule.area) continue;
        if (rule.mayNotImport.some((area) => to.startsWith(area))) wrong.push(`${file} -> ${to}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

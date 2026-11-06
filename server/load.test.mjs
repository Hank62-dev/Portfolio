import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The server shares a few files with the app (the battleship rules, the reminder rules, the translations). Vite is happy with
// an import written without its ".js", plain Node is not, and the tests run under Vite: so the only way to learn that the
// server still starts on Render is to load it the way Render does.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('the server under plain Node', () => {
  it.each(['app', 'push', 'battle'])('loads %s.mjs with every import resolved', (name) => {
    const url = new URL(`./${name}.mjs`, `file://${ROOT.replace(/\\/g, '/')}/server/`).href;
    expect(() => execFileSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(url)})`], { cwd: ROOT, stdio: 'pipe' })).not.toThrow();
  });
});

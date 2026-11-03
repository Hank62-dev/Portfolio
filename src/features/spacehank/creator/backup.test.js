import { describe, expect, it } from 'vitest';
import { buildBackup, parseBackup } from './backup';

describe('a Creator Lab backup', () => {
  const data = { content: [{ id: 'a', title: 'x' }], income: [{ id: 'i', amount: 5, at: 1 }], deals: [{ id: 'd', name: 'n' }], settings: { goal: 100 } };

  it('can be written and read back', () => {
    const back = parseBackup(buildBackup(data, 7));
    expect(back).toEqual(data);
  });
  it('refuses a file that is not one, or is from a newer version', () => {
    expect(parseBackup('nope').error).toMatch(/not valid JSON/);
    expect(parseBackup('{"app":"other"}').error).toMatch(/not a Creator Lab backup/);
    expect(parseBackup('{"app":"hank62-creator","version":99}').error).toMatch(/newer/);
  });
  it('drops records that cannot be right and tolerates missing parts', () => {
    const back = parseBackup(JSON.stringify({ app: 'hank62-creator', version: 1, income: [{ id: 'ok', amount: 5, at: 1 }, { id: 'bad', amount: 'x' }, { amount: 3, at: 1 }, null], content: 'no' }));
    expect(back.income.map((e) => e.id)).toEqual(['ok']);
    expect(back.content).toEqual([]);
    expect(back.deals).toEqual([]);
    expect(back.settings).toEqual({});
  });
});

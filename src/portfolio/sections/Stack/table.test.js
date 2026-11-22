import { describe, expect, it } from 'vitest';
import { elements, fitGrid, symbolsFor } from './table';

describe('the symbols', () => {
  it('writes each tool like an element, a capital and a small letter', () => {
    const s = symbolsFor(['React', 'TypeScript', 'Redis']);
    expect(s.get('React')).toBe('Re');
    expect(s.get('TypeScript')).toBe('Ts');
    expect(s.get('Redis')).not.toBe('Re');
    for (const v of s.values()) expect(v).toMatch(/^[A-Z][a-z0-9]$/);
  });

  it('never gives two tools the same symbol, odd names included', () => {
    const names = ['.NET', 'Node.js', 'NestJS', 'Next', 'N', 'C', 'C#', 'C++', 'Claude API', 'CSS'];
    const s = symbolsFor(names);
    expect(new Set(s.values()).size).toBe(names.length);
  });
});

describe('the elements', () => {
  const stack = {
    interface: [
      { tech: 'HTML', slugs: ['a'] },
      { tech: 'React', slugs: ['a', 'b', 'c'] },
    ],
    service: [{ tech: 'Node.js', slugs: ['a', 'b'] }],
  };

  it('lays them out family by family, the most used first, numbered by their projects', () => {
    const list = elements(stack, ['interface', 'service']);
    expect(list.map((e) => e.tech)).toEqual(['React', 'HTML', 'Node.js']);
    expect(list[0]).toMatchObject({ family: 0, number: 3, symbol: 'Re' });
    expect(list[2].family).toBe(1);
  });
});

describe('the grid', () => {
  it('picks the columns that make the tiles biggest in the room, each family on rows of its own', () => {
    const counts = [20, 18, 8, 5];
    const wide = fitGrid(counts, 1000, 300);
    const tall = fitGrid(counts, 300, 1000);
    expect(wide.cols).toBeGreaterThan(tall.cols);
    for (const g of [wide, tall]) {
      expect(g.rows).toBe(counts.reduce((n, c) => n + Math.ceil(c / g.cols), 0));
      expect(g.cols * g.size).toBeLessThanOrEqual(1000);
      expect(g.size).toBeGreaterThan(0);
    }
  });
});

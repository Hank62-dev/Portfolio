import { describe, expect, it } from 'vitest';
import { buildGraph, linksIn, radiusOf, sampleNotes, stepLayout } from './graph';

const note = (id, text) => ({ id, text, createdAt: 1, updatedAt: 1 });

describe('linksIn', () => {
  it('finds [[titles]], lowercased', () => {
    expect(linksIn('See [[Design Tokens]] and [[ Launch ]] but not [single] or [[]]')).toEqual(['design tokens', 'launch']);
  });
});

describe('buildGraph', () => {
  const notes = [note('a', 'Alpha\n#tagx #tagy'), note('b', 'Beta\n#tagx #tagy'), note('c', 'Gamma\n#tagz'), note('d', 'Delta\nsee [[Gamma]]')];
  const { nodes, edges } = buildGraph(notes);

  it('makes a node per note with a title, tags and a start position', () => {
    expect(nodes.map((n) => n.title)).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    expect(nodes[0].tags).toEqual(['tagx', 'tagy']);
    expect(nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });
  it('weights an edge by the tags two notes share, and a link as 2', () => {
    expect(edges.find((e) => [e.a, e.b].sort().join() === 'a,b').weight).toBe(2);
    expect(edges.find((e) => [e.a, e.b].sort().join() === 'c,d').weight).toBe(2);
    expect(edges).toHaveLength(2);
  });
  it('counts how many lines meet at a star, and draws well-connected ones bigger', () => {
    expect(nodes.find((n) => n.id === 'a').degree).toBe(1);
    const lone = { words: 5, degree: 0 };
    expect(radiusOf({ words: 5, degree: 4 })).toBeGreaterThan(radiusOf(lone));
  });
  it('copes with no notes', () => {
    expect(buildGraph([])).toEqual({ nodes: [], edges: [] });
  });
});

describe('stepLayout', () => {
  const settle = (withEdges) => {
    const { nodes, edges } = buildGraph([['a', 'A #tagx'], ['b', 'B #tagx'], ['c', 'C #tagq'], ['d', 'D #tagr']].map(([id, text]) => note(id, text)));
    const first = stepLayout(nodes, withEdges ? edges : []);
    let last = first;
    for (let i = 0; i < 400; i += 1) last = stepLayout(nodes, withEdges ? edges : []);
    const at = (id) => nodes.find((n) => n.id === id);
    return { first, last, gap: Math.hypot(at('a').x - at('b').x, at('a').y - at('b').y), nodes };
  };

  it('draws two linked stars closer together than the same two with no line, and settles', () => {
    const linked = settle(true);
    expect(linked.gap).toBeLessThan(settle(false).gap);
    expect(linked.last).toBeLessThan(linked.first);
    expect(linked.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });

  it('does not blow up when two stars start on the same spot', () => {
    const nodes = [{ id: 'a', x: 0, y: 0, vx: 0, vy: 0 }, { id: 'b', x: 0, y: 0, vx: 0, vy: 0 }];
    stepLayout(nodes, []);
    expect(nodes.every((n) => Number.isFinite(n.x))).toBe(true);
  });
});

describe('sampleNotes', () => {
  it('makes a connected little web', () => {
    const { nodes, edges } = buildGraph(sampleNotes(1));
    expect(nodes).toHaveLength(8);
    expect(edges.length).toBeGreaterThan(5);
  });
});

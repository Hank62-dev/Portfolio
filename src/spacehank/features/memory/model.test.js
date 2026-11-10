import { describe, expect, it } from 'vitest';
import { groupRuns } from './model';

const e = (name, action, text) => ({ name, action, text, color: '#fff', time: 'now' });

describe('groupRuns', () => {
  it('folds a run of the same agent and action into one group, newest first', () => {
    const groups = groupRuns([e('Codex', 'output', 'c'), e('Codex', 'output', 'b'), e('Codex', 'output', 'a')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((i) => i.text)).toEqual(['c', 'b', 'a']);
  });

  it('starts a new group when the agent or the action changes, and does not merge across a gap', () => {
    const groups = groupRuns([e('Codex', 'output', '1'), e('Atlas', 'output', '2'), e('Codex', 'output', '3'), e('Codex', 'completed', '4')]);
    expect(groups.map((g) => `${g.name}:${g.action}:${g.items.length}`)).toEqual(['Codex:output:1', 'Atlas:output:1', 'Codex:output:1', 'Codex:completed:1']);
  });

  it('is empty for no events', () => {
    expect(groupRuns([])).toEqual([]);
  });
});

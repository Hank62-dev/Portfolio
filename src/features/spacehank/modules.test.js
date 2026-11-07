import { beforeEach, describe, expect, it } from 'vitest';
import { CORE, bySection, modules, setVisible, visibleNav } from './modules';
import { NAVIGATION } from './navigation';

beforeEach(() => modules.set({ hidden: [] }));

describe('choosing the places to show', () => {
  it('shows everything until something is switched off', () => {
    expect(visibleNav(modules.get().hidden)).toHaveLength(NAVIGATION.length);
  });

  it('hides a place that is switched off, and brings it back', () => {
    setVisible('wallet', false);
    expect(visibleNav(modules.get().hidden).some((i) => i.id === 'wallet')).toBe(false);
    setVisible('wallet', true);
    expect(modules.get().hidden).toEqual([]);
  });

  it('never hides the heart of the workspace', () => {
    for (const id of CORE) setVisible(id, false);
    expect(modules.get().hidden).toEqual([]);
  });

  it('ignores a place that does not exist, and counts a place once', () => {
    setVisible('nowhere', false);
    setVisible('play', false);
    setVisible('play', false);
    expect(modules.get().hidden).toEqual(['play']);
  });

  it('groups what is left by section, leaving out a section with nothing in it', () => {
    const habitsOnly = NAVIGATION.filter((i) => i.id === 'habits');
    expect(bySection(habitsOnly).map((g) => g.section)).toEqual(['LIFE']);
    const all = bySection(NAVIGATION);
    expect(all.map((g) => g.items.length).reduce((a, b) => a + b, 0)).toBe(NAVIGATION.length);
  });
});

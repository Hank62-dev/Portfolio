import { describe, expect, it } from 'vitest';
import { copy } from './copy';
import { LAYERS, byTier, deriveStack, getProject, projectHref, projects } from './projects';

// Every key path of an object, e.g. "hero.title.0".
const keyPaths = (value, prefix = '') =>
  value && typeof value === 'object'
    ? Object.entries(value).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
    : [prefix];

describe('copy', () => {
  it('has the same keys in English and Vietnamese', () => {
    const en = new Set(keyPaths(copy.en));
    const vi = new Set(keyPaths(copy.vi));
    expect([...en].filter((key) => !vi.has(key))).toEqual([]);
    expect([...vi].filter((key) => !en.has(key))).toEqual([]);
  });
});

describe('projects', () => {
  it('uses unique ids and slugs', () => {
    expect(new Set(projects.map((p) => p.id)).size).toBe(projects.length);
    expect(new Set(projects.map((p) => p.slug)).size).toBe(projects.length);
  });

  it('only uses known tiers and every project has a tier list entry', () => {
    const tiers = ['featured', 'lab', 'archive'];
    projects.forEach((p) => expect(tiers).toContain(p.tier));
    expect(tiers.flatMap((tier) => byTier(tier))).toHaveLength(projects.length);
  });

  it('resolves projects by slug and by legacy numeric id', () => {
    projects.forEach((p) => {
      expect(getProject(p.slug)).toBe(p);
      expect(getProject(String(p.id))).toBe(p);
      expect(projectHref(p)).toBe(`/projects/${p.slug}`);
    });
    expect(getProject('does-not-exist')).toBeUndefined();
  });

  it('provides both languages for the text shown on detail pages', () => {
    projects
      .filter((p) => p.tier !== 'archive')
      .forEach((p) => {
        // `role` is optional: unverified fields are left out of the data on purpose.
        ['tagline', 'summary', ...(p.role ? ['role'] : [])].forEach((field) => {
          expect(p[field]?.en, `${p.slug}.${field}.en`).toBeTruthy();
          expect(p[field]?.vi, `${p.slug}.${field}.vi`).toBeTruthy();
        });
      });
  });

  it('derives a stack for every layer from project data', () => {
    const stack = deriveStack();
    expect(Object.keys(stack)).toEqual(LAYERS);
    const slugs = new Set(projects.map((p) => p.slug));
    LAYERS.flatMap((layer) => stack[layer]).forEach(({ slugs: used }) => used.forEach((slug) => expect(slugs).toContain(slug)));
  });
});

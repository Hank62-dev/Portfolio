import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Three.js compiles every lit material with all the lights in the scene. A desk lamp, two screens and a robot each with a
// point light made 80+ of them, which is more than many phone GPUs can take, and the floor then drew nothing but its grid.
// The lights belong to the scene as a whole (a few), never to each desk or agent.

const dir = new URL('./', import.meta.url);
const source = readdirSync(dir)
  .filter((name) => name.endsWith('.jsx'))
  .map((name) => readFileSync(new URL(name, dir), 'utf8'))
  .join('\n');

describe('the 3D floor', () => {
  it('keeps the number of lights written in the scene small', () => {
    const lights = source.match(/<(pointLight|spotLight|directionalLight|rectAreaLight)\b/g) ?? [];
    expect(lights.length).toBeLessThanOrEqual(4);
  });

  it('does not put a light in the parts that repeat for every desk and agent', () => {
    const repeated = [...source.matchAll(/function (WorkScreen|Desk|RobotModel|Character)\b[\s\S]*?\r?\n}\r?\n/g)].map((m) => m[0]);
    expect(repeated.length).toBeGreaterThan(0);
    for (const part of repeated) expect(part).not.toMatch(/<(pointLight|spotLight)\b/);
  });

  it('does not load the multi-megabyte chair on every visit', () => {
    expect(source).not.toMatch(/vector-office-chair\.glb/);
  });
});

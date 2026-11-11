import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Three.js compiles every lit material with all the lights in the scene; a light per desk or per crew member made 80+ of them
// on the old floor, more than many phone GPUs take, and the scene then drew nothing. The station keeps a few, for all of it.
const scene = readFileSync(new URL('./Station3D.jsx', import.meta.url), 'utf8');

describe('the 3D station', () => {
  it('keeps the lights few, and none in the parts drawn once per crew member', () => {
    expect((scene.match(/<(pointLight|spotLight|directionalLight|rectAreaLight|hemisphereLight)\b/g) ?? []).length).toBeLessThanOrEqual(4);
    const perCrew = scene.slice(scene.indexOf('function Astronaut'), scene.indexOf('function Link'));
    expect(perCrew).not.toMatch(/<(pointLight|spotLight|directionalLight|rectAreaLight|hemisphereLight)\b/);
  });

  it('downloads no model files', () => {
    expect(scene).not.toMatch(/useGLTF|\.glb|\.gltf/);
  });
});

import { describe, expect, it } from 'vitest';
import { can3D, qualityTier } from './capabilities';

const capable = { reducedMotion: false, saveData: false, webgl: true, cores: 8, memory: 8, width: 1440 };

describe('can3D', () => {
  it('allows capable devices', () => {
    expect(can3D(capable)).toBe(true);
  });

  it('allows browsers that do not report cores or memory', () => {
    expect(can3D({ ...capable, cores: undefined, memory: undefined })).toBe(true);
  });

  it('respects reduced motion and data saving', () => {
    expect(can3D({ ...capable, reducedMotion: true })).toBe(false);
    expect(can3D({ ...capable, saveData: true })).toBe(false);
  });

  it('skips narrow screens, which get the flat drawing instead', () => {
    expect(can3D({ ...capable, width: 390 })).toBe(false);
    expect(can3D({ ...capable, width: 1024 })).toBe(true);
  });

  it('skips devices without WebGL or with very little hardware', () => {
    expect(can3D({ ...capable, webgl: false })).toBe(false);
    expect(can3D({ ...capable, cores: 2 })).toBe(false);
    expect(can3D({ ...capable, memory: 1 })).toBe(false);
  });
});

describe('qualityTier', () => {
  it('is high only for wide, many-core screens', () => {
    expect(qualityTier(capable)).toBe('high');
    expect(qualityTier({ ...capable, width: 1000 })).toBe('low');
    expect(qualityTier({ ...capable, cores: 4 })).toBe('low');
  });
});

import { describe, expect, it } from 'vitest';
import { apkOf, fraction } from './updater';

describe('the newest APK', () => {
  it('is the release’s .apk asset, with its version from the name', () => {
    const release = {
      assets: [
        { name: 'notes.txt', browser_download_url: 'https://github.com/x/notes.txt' },
        { name: 'hank62-1.54.0-release.apk', size: 3400000, browser_download_url: 'https://github.com/Hank62-dev/Portfolio/releases/download/android-v1.54.0-7/hank62-1.54.0-release.apk' },
      ],
    };
    expect(apkOf(release)).toEqual({ url: release.assets[1].browser_download_url, size: 3400000, version: '1.54.0' });
  });

  it('is nothing when the release has no APK, or an address that is not https', () => {
    expect(apkOf({ assets: [] })).toBeNull();
    expect(apkOf(null)).toBeNull();
    expect(apkOf({ assets: [{ name: 'a.apk', browser_download_url: 'http://insecure/a.apk' }] })).toBeNull();
  });
});

describe('download progress', () => {
  it('is a fraction, and 0 while the size is unknown', () => {
    expect(fraction(50, 200)).toBe(0.25);
    expect(fraction(300, 200)).toBe(1);
    expect(fraction(10, 0)).toBe(0);
  });
});

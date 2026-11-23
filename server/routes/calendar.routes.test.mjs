import { describe, expect, it } from 'vitest';
import { appReturn, appReturnPage } from './calendar.routes.mjs';

describe('the way back to the Android app after Google', () => {
  it('is an intent link to the app, with the web page as the fallback', () => {
    const link = appReturn('connected', 'https://site.test/spacehank?tab=calendar&google=connected');
    expect(link).toMatch(/^intent:\/\/calendar\?google=connected#Intent;scheme=hank62;package=dev\.hank62\.app;/);
    expect(link).toContain(`S.browser_fallback_url=${encodeURIComponent('https://site.test/spacehank?tab=calendar&google=connected')};end`);
  });

  it('is a page that opens it and has a button, with the link escaped', () => {
    const page = appReturnPage('intent://calendar?google=connected&x="<b>"', 'connected');
    expect(page).toContain('Đã kết nối Google Calendar');
    expect(page).toContain('href="intent://calendar?google=connected&amp;x=&quot;&lt;b&gt;&quot;"');
    expect(page).not.toContain('<b>');
    expect(appReturnPage('x', 'denied')).toContain('không cho phép');
  });
});

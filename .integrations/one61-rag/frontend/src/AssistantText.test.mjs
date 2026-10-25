import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AssistantText, { revealText } from './AssistantText.mjs';

const render = text => renderToStaticMarkup(createElement(AssistantText, { text }));

test('renders answer and citation Markdown, including nested formatting', () => {
  const html = render('### Tiêu chuẩn vận chuyển\n\n* **Giảm xóc (*Air Suspension*):** bắt buộc [6].\n  * Nghỉ **45 phút**.\n\n1. Kiểm tra `Booking ID`.\n2. Bàn giao.\n\n```text\n# giữ nguyên * trong code\n```\n\n[Nguồn](https://example.com)');
  assert.match(html, /<h3>Tiêu chuẩn vận chuyển<\/h3>/);
  assert.match(html, /<strong>Giảm xóc \(<em>Air Suspension<\/em>\):<\/strong>/);
  assert.match(html, /<ul>\s*<li>[\s\S]*<ul>\s*<li>Nghỉ <strong>45 phút<\/strong>\.<\/li>\s*<\/ul>/);
  assert.match(html, /<ol>\s*<li>Kiểm tra <code>Booking ID<\/code>\.<\/li>/);
  assert.match(html, /<pre><code class="language-text"># giữ nguyên \* trong code\n<\/code><\/pre>/);
  assert.match(html, /<a href="https:\/\/example.com">Nguồn<\/a>/);
  assert.ok(html.includes('[6]'));
});

test('keeps untrusted HTML inert and blocks unsafe Markdown links', () => {
  const html = render('<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[unsafe](javascript:alert%281%29)');
  assert.doesNotMatch(html, /<script|<img[^>]*onerror|(?:href|src)="javascript:/i);
  assert.ok(html.includes('&lt;script&gt;'));
});

test('reveals a Unicode answer progressively, finishes exactly and cancels cleanly', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const text = '### Vận chuyển ngựa\n\n**An toàn** 👨‍👩‍👧‍👦: kiểm tra `Booking ID`.\n';
  const frames = [];
  const cancel = revealText(text, frame => frames.push(frame));
  t.mock.timers.tick(25);
  assert.ok(frames[0].length > 0 && frames[0].length < text.length);
  for (let elapsed = 0; elapsed < 4000; elapsed += 25) t.mock.timers.tick(25);
  assert.equal(frames.at(-1), text);
  assert.ok(frames.every(frame => text.startsWith(frame)));
  const completed = frames.length;
  t.mock.timers.tick(1000);
  assert.equal(frames.length, completed);
  cancel();

  const interrupted = [];
  const stop = revealText(text, frame => interrupted.push(frame));
  t.mock.timers.tick(25);
  stop();
  t.mock.timers.tick(4000);
  assert.equal(interrupted.length, 1);
  assert.notEqual(interrupted[0], text);
});

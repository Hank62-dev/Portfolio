import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorkspace, requestChat, validateFile } from './data.mjs';

test('restores valid conversations; rejects corrupt local data', () => {
  const workspace = [{ id: 'session', title: 'Tra cứu', messages: [{ id: 'msg', role: 'user', text: 'Xin chào' }], documents: [] }];
  assert.deepEqual(loadWorkspace(JSON.stringify(workspace)), workspace);
  for (const raw of ['broken', '{}', 'null', '[{}]', '[{"id":"x","title":"x","messages":[{}],"documents":[]}]']) {
    assert.deepEqual(loadWorkspace(raw), []);
  }
});

test('chat uses the existing session and handles API failures', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/chat');
      const body = JSON.parse(options.body);
      assert.equal(body.session_id, 'session');
      assert.equal(body.message, 'Xin chào');
      assert.equal(body.mode, 'reasoning');
      assert.equal(body.conversation_history[0].content, 'Trước đó');
      assert.ok(body.request_id);
      return new Response(JSON.stringify({ status: 'success', response: { message: 'Chào bạn' } }));
    };
    const result = await requestChat('session', 'Xin chào', 'reasoning', [{ role: 'user', text: 'Trước đó' }]);
    assert.equal(result.response.message, 'Chào bạn');
    globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Pipeline not initialized' }), { status: 503 });
    await assert.rejects(requestChat('session', 'Xin chào', 'fast', []), /Pipeline not initialized/);
    globalThis.fetch = async () => new Response(JSON.stringify({ status: 'error', error: { message: 'Rate limit' } }));
    await assert.rejects(requestChat('session', 'Xin chào', 'fast', []), /Rate limit/);
    globalThis.fetch = async () => new Response(JSON.stringify({ status: 'success' }));
    await assert.rejects(requestChat('session', 'Xin chào', 'fast', []), /không hợp lệ/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('upload boundary rejects empty, oversized, unsupported files', () => {
  assert.equal(validateFile({ name: 'quy-trinh.PDF', size: 1024 }), '');
  assert.match(validateFile({ name: 'empty.txt', size: 0 }), /trống/);
  assert.match(validateFile({ name: 'large.pdf', size: 26 * 1024 * 1024 }), /25 MB/);
  assert.match(validateFile({ name: 'app.exe', size: 100 }), /PDF/);
});

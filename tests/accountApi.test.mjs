import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// 브라우저 API 모듈을 번들링하고 실제 계정 변경 없이 HTTP 계약을 검증합니다.
const result = await build({
  stdin: { contents: 'export * from "./src/api/auth.ts"; export * from "./src/api/interview.ts"; export * from "./src/lib/storage.ts";', resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', define: { 'import.meta.env': '{}' },
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

function storage(initial = {}) {
  const data = { ...initial };
  Object.defineProperties(data, {
    getItem: { value: (key) => data[key] ?? null },
    removeItem: { value: (key) => { delete data[key]; } },
  });
  return data;
}

test('계정 API 인증, 부분 수정, 목록, 204 및 실패 시 데이터 보존', async () => {
  const originals = { fetch: globalThis.fetch, localStorage: globalThis.localStorage, sessionStorage: globalThis.sessionStorage, window: globalThis.window };
  try {
    globalThis.window = { location: { origin: 'http://localhost:5173' } };
    globalThis.localStorage = storage({ access_token: 'test-token', 'iv-profile': '{}', unrelated: 'keep' });
    globalThis.sessionStorage = storage({ interviewAnalysis: '{}', interviewSessionId: '3', unrelated: 'keep' });
    let response = new Response('{"success":true}');
    let call;
    globalThis.fetch = async (url, options) => { call = { url, options }; return response; };
    await api.updateMyInfo({ email: 'new@example.com' });
    assert.equal(call.url, 'http://localhost:8000/auth/me');
    assert.equal(call.options.method, 'PATCH');
    assert.deepEqual(JSON.parse(call.options.body), { email: 'new@example.com' });
    assert.equal(new Headers(call.options.headers).get('Authorization'), 'Bearer test-token');

    const controller = new AbortController();
    const sessions = [{ session_id: 3, job_id: 1, interview_type: 'technical', difficulty: 'medium', question_count: 5, started_at: '2026-09-17T10:00:00', ended_at: null }];
    response = Response.json(sessions);
    assert.deepEqual(await api.getMyInterviewSessions(controller.signal), sessions);
    assert.equal(call.url, 'http://localhost:8000/auth/me/sessions');
    assert.equal(call.options.signal, controller.signal);

    response = Response.json({ detail: 'Unauthorized' }, { status: 401 });
    await assert.rejects(api.deleteAccount(), /Unauthorized/);
    assert.equal(localStorage.getItem('access_token'), 'test-token');
    assert.equal(sessionStorage.getItem('interviewAnalysis'), '{}');

    response = new Response(null, { status: 204 });
    assert.equal(await api.deleteAccount(), null);
    assert.equal(call.options.method, 'DELETE');
    assert.equal(call.options.body, undefined);
    api.clearAccountStorage();
    assert.equal(localStorage.getItem('access_token'), null);
    assert.equal(localStorage.getItem('iv-profile'), null);
    assert.equal(sessionStorage.getItem('interviewSessionId'), null);
    assert.equal(localStorage.getItem('unrelated'), 'keep');
    assert.equal(sessionStorage.getItem('unrelated'), 'keep');
    globalThis.fetch = () => assert.fail('토큰 없이는 요청하지 않아야 합니다.');
    await assert.rejects(api.getMyInterviewSessions(), /로그인이 필요합니다/);
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});

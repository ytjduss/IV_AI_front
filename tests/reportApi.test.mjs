import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// 실제 서버 데이터 변경 없이 Bearer 인증과 세션 ID 기반 조회 계약을 검증합니다.
const result = await build({
  stdin: { contents: 'export * from "./src/api/report.ts"; export * from "./src/api/health.ts";', resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm', define: { 'import.meta.env': '{}' },
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

test('리포트 목록의 세션 ID로 상세 조회하고 서버 점수를 그대로 반환', async () => {
  globalThis.window = { location: { origin: 'http://localhost:5173' } };
  globalThis.localStorage = { getItem: () => 'test-token' };
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  const calls = [];
  const report = { report_id: 7, total_score: 76.4, content_score: 80, voice_score: 75, behavior_score: 68, job_relevance_score: 82, strength: '잘한 점', improvement: '개선할 점', created_at: '2026-09-17T10:35:00' };
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options });
      return Response.json(calls.length === 1 ? [{ report_id: 7, session_id: 1, total_score: 76.4, created_at: report.created_at }] : report);
    };
    const list = await api.listMyReports(controller.signal);
    assert.deepEqual(await api.getReport(list[0].session_id, controller.signal), report);
    assert.equal(calls[0].url, 'http://localhost:8000/interview/reports');
    assert.equal(calls[1].url, 'http://localhost:8000/interview/session/1/report');
    for (const call of calls) {
      assert.equal(new Headers(call.options.headers).get('Authorization'), 'Bearer test-token');
      assert.equal(call.options.signal, controller.signal);
    }
    globalThis.fetch = async () => Response.json({ detail: 'Report not found' }, { status: 404 });
    await assert.rejects(api.getReport(1), /Report not found/);
    globalThis.fetch = async () => Response.json([]);
    assert.deepEqual(await api.listMyReports(), []);
  } finally { globalThis.fetch = originalFetch; }
});

test('Health Check는 비인증 GET / 및 status ok를 확인', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://localhost:8000/');
      assert.equal(new Headers(options.headers).has('Authorization'), false);
      return Response.json({ status: 'ok' });
    };
    assert.deepEqual(await api.healthCheck(), { status: 'ok' });
    globalThis.fetch = async () => Response.json({ status: 'error' });
    await assert.rejects(api.healthCheck(), /정상 상태/);
    globalThis.fetch = async (_url, { signal }) => { signal.throwIfAborted(); };
    await assert.rejects(api.healthCheck(AbortSignal.abort()), { name: 'AbortError' });
  } finally { globalThis.fetch = originalFetch; }
});

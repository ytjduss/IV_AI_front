import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({ entryPoints: ['src/api/interview.ts'], bundle: true, write: false, format: 'esm', define: { 'import.meta.env': '{}' } });
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
test('세션 생성 ID로 다음 질문과 done 응답을 조회', async () => {
  globalThis.window = { location: { origin: 'http://localhost:5173' } };
  globalThis.localStorage = { getItem: () => 'test-token' };
  const original = globalThis.fetch;
  const payload = { job_id: 1, interview_type: 'technical', difficulty: 'medium', question_count: 5 };
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://localhost:8000/interview/session');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), payload);
      assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer test-token');
      return Response.json({ session_id: 9 }, { status: 201 });
    };
    const session = await api.createInterviewSession(payload);
    const controller = new AbortController();
    const question = { question_id: 5, question: 'RESTful API?', question_type: 'technical', done: false };
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://localhost:8000/interview/session/9/question');
      assert.equal(options.signal, controller.signal);
      return Response.json(question);
    };
    assert.deepEqual(await api.getNextQuestion(String(session.session_id), controller.signal), question);
    globalThis.fetch = async () => Response.json({ done: true });
    assert.deepEqual(await api.getNextQuestion('9'), { done: true });
    globalThis.fetch = async () => Response.json({ session_id: 'invalid' });
    await assert.rejects(api.createInterviewSession(payload), /세션 ID/);
  } finally { globalThis.fetch = original; }
});

test('꼬리질문은 실제 answer_id를 전달하고 종료 응답은 report_id를 확인', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://localhost:8000/interview/session/9/followup');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), { answer_id: 12 });
      assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer test-token');
      return Response.json({ question_id: 45, question: '추가 설명해 주세요.' });
    };
    assert.deepEqual(await api.generateFollowupQuestion('9', 12), { question_id: 45, question: '추가 설명해 주세요.' });
    await assert.rejects(api.generateFollowupQuestion('9', 0), /answer_id/);
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://localhost:8000/interview/session/9/end');
      assert.equal(options.method, 'POST');
      assert.equal(options.body, undefined);
      return Response.json({ success: true, report_id: 7 });
    };
    assert.deepEqual(await api.endInterviewSession('9'), { success: true, report_id: 7 });
    globalThis.fetch = async () => Response.json({ success: true });
    await assert.rejects(api.endInterviewSession('9'), /리포트/);
    globalThis.fetch = async () => Response.json({ detail: '리포트 생성 실패' }, { status: 500 });
    await assert.rejects(api.endInterviewSession('9'), /리포트 생성 실패/);
  } finally { globalThis.fetch = original; }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({ entryPoints: ['src/lib/interviewSession.ts'], bundle: true, write: false, format: 'esm' });
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('완료 세션 재진입 차단, 보고서 유지, 새 세션 보호', () => {
  const original = globalThis.sessionStorage;
  const values = new Map([['interviewSessionId', '5'], ['iv-question-count', '5']]);
  globalThis.sessionStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  try {
    assert.equal(api.requireInterviewSessionId(), '5');
    values.set('iv-report-session-id', '5');
    assert.throws(() => api.requireInterviewSessionId());
    api.clearCompletedSession('5');
    assert.equal(values.has('interviewSessionId'), false);
    assert.equal(values.has('iv-question-count'), false);
    assert.equal(values.get('iv-report-session-id'), '5');
    values.set('interviewSessionId', '6');
    values.set('iv-question-count', '5');
    api.clearCompletedSession('5');
    assert.equal(api.requireInterviewSessionId(), '6');
    assert.equal(values.get('iv-question-count'), '5');
    values.set('interviewSessionId', '5');
    values.delete('iv-report-session-id');
    assert.throws(() => api.requireInterviewSessionId());
  } finally { globalThis.sessionStorage = original; }
});

test('최초 완료 응답은 정상 완료 화면에 전달하지 않으며 재조회 질문은 허용', () => {
  assert.throws(() => api.requireInitialQuestion({ done: true }), /첫 질문/);
  const question = { done: false, question_id: 1, question: '자기소개', question_type: 'technical' };
  assert.equal(api.requireInitialQuestion(question), question);
});

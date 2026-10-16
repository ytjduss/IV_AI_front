import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({ entryPoints: ['src/api/resume.ts'], bundle: true, write: false, format: 'esm', define: { 'import.meta.env': '{}' } });
const { updateResume, createResume, getResume } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

test('서버 ID와 전문으로 수정하며 실패/잘못된 ID를 거절', async () => {
  globalThis.window = { location: { origin: 'http://localhost:5173' } };
  globalThis.localStorage = { getItem: () => 'test-token' };
  const originalFetch = globalThis.fetch;
  const content = '이름: 홍길동\n경력: 4년\n스킬: Python, FastAPI';
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://localhost:8000/resume/1');
      assert.equal(options.method, 'PUT');
      assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer test-token');
      assert.deepEqual(JSON.parse(options.body), { content });
      return Response.json({ success: true });
    };
    assert.deepEqual(await updateResume(1, content), { success: true });
    globalThis.fetch = async () => Response.json({ detail: '수정 권한이 없습니다.' }, { status: 403 });
    await assert.rejects(updateResume(1, content), /수정 권한/);
    globalThis.fetch = () => assert.fail('유효하지 않은 입력은 요청하면 안 됩니다.');
    await assert.rejects(updateResume('local-uuid', content), /서버 이력서 ID/);
    await assert.rejects(updateResume(0, content), /서버 이력서 ID/);
    await assert.rejects(updateResume(1, ' '), /내용을 입력/);
  } finally { globalThis.fetch = originalFetch; }
});

test('등록·최신 조회는 인증 헤더와 content를 사용하고 조회 실패를 구분', async () => {
  globalThis.window = { location: { origin: 'http://localhost:5173' } };
  globalThis.localStorage = { getItem: () => 'test-token' };
  const originalFetch = globalThis.fetch;
  const content = '이름: 홍길동\n경력: 3년';
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://localhost:8000/resume');
      assert.equal(options.method, 'POST');
      assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer test-token');
      assert.deepEqual(JSON.parse(options.body), { content });
      return Response.json({ resume_id: 8 }, { status: 201 });
    };
    assert.deepEqual(await createResume(content), { resume_id: 8 });
    const controller = new AbortController();
    const resume = { resume_id: 8, content, created_at: '2026-09-17T09:00:00', updated_at: '2026-09-17T09:00:00' };
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'http://localhost:8000/resume');
      assert.equal(options.signal, controller.signal);
      assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer test-token');
      return Response.json(resume);
    };
    assert.deepEqual(await getResume(controller.signal), resume);
    globalThis.fetch = async () => Response.json({ detail: '없음' }, { status: 404 });
    assert.equal(await getResume(), null);
    globalThis.fetch = async () => Response.json({ detail: '인증 실패' }, { status: 401 });
    await assert.rejects(getResume(), /인증 실패/);
    globalThis.fetch = async () => Response.json({ resume_id: 'local-id', content });
    await assert.rejects(getResume(), /응답/);
    globalThis.fetch = async () => new Response('Internal Server Error', { status: 500 });
    await assert.rejects(createResume(content), /500/);
    globalThis.fetch = () => assert.fail('빈 이력서는 전송하면 안 됩니다.');
    await assert.rejects(createResume(' '), /내용/);
  } finally { globalThis.fetch = originalFetch; }
});

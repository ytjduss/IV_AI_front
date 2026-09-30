import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({ entryPoints: ['src/api/resume.ts'], bundle: true, write: false, format: 'esm', define: { 'import.meta.env': '{}' } });
const { updateResume } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

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

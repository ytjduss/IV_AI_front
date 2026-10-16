import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

test('배포 상태 확인은 /api로, 직접 연결은 백엔드 /로 요청', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  globalThis.window = { location: { origin: 'https://frontend.example' } };
  try {
    for (const [base, expected] of [
      ['/api', 'https://frontend.example/api'],
      ['https://backend.example', 'https://backend.example/'],
    ]) {
      const bundle = await build({ entryPoints: ['src/api/health.ts'], bundle: true, write: false, format: 'esm', define: { 'import.meta.env': JSON.stringify({ VITE_AUTH_API_BASE_URL: base }) } });
      const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
      const controller = new AbortController();
      globalThis.fetch = async (url, options) => {
        assert.equal(url, expected);
        assert.equal(options.signal, controller.signal);
        assert.equal(options.headers['ngrok-skip-browser-warning'], 'true');
        assert.equal(options.headers.Authorization, undefined);
        return Response.json({ status: 'ok' });
      };
      assert.deepEqual(await api.healthCheck(controller.signal), { status: 'ok' });
    }
  } finally { globalThis.fetch = originalFetch; globalThis.window = originalWindow; }
});

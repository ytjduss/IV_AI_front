import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({
  stdin: { contents: 'export { visionApi } from "./src/app/lib/vision-api.ts"; export { requireBaseline } from "./src/lib/calibration.ts";', resolveDir: process.cwd() },
  bundle: true, write: false, format: 'esm',
  define: { 'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: 'https://backend.example' }) },
});
const { visionApi, requireBaseline } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('캘리브레이션 API 응답을 그대로 검증 단계에 전달', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  globalThis.window = { location: { origin: 'https://frontend.example' } };
  const baseline = { shoulder_tilt: 0, neck_forward_ratio: 0.2, shoulder_width: 0.4, shoulder_mid_x: 0.5, shoulder_mid_y: 0.6 };
  const response = { success: true, baseline, movement: { x_std: 0.01, y_std: 0.01 } };
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://backend.example/vision/calibrate/finalize?session_id=9');
      assert.equal(options.method, 'POST');
      return Response.json(response);
    };
    const result = await visionApi.finalizeCalibration('9');
    assert.deepEqual(result, response);
    assert.deepEqual(requireBaseline(result), baseline);
    globalThis.fetch = async () => Response.json({ success: true });
    assert.throws(() => requireBaseline({ success: true }), /기준값/);
    assert.throws(() => requireBaseline({ success: true, baseline: { ...baseline, shoulder_width: null } }), /기준값/);
    globalThis.fetch = async () => Response.json({ success: false, reason: 'too_much_movement' });
    await assert.rejects(visionApi.finalizeCalibration('9'), /움직임/);
  } finally { globalThis.fetch = originalFetch; globalThis.window = originalWindow; }
});

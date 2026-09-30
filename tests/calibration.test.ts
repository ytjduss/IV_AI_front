import test from "node:test";
import assert from "node:assert/strict";
import { collectCalibration, requireBaseline } from "../src/lib/calibration";
import { visionApi, VisionApiError } from "../src/app/lib/vision-api";
import type { CalibrationFrameResult } from "../src/type/calibration";

const baseline = {
  shoulder_tilt: 0,
  neck_forward_ratio: 0.1,
  shoulder_width: 0.4,
  shoulder_mid_x: 0.5,
  shoulder_mid_y: 0.5,
};
const frame: CalibrationFrameResult = {
  frame_count: 2,
  body_outline: null,
  target_zone: { x_min: 0.3, x_max: 0.7, y_min: 0.3, y_max: 0.7 },
};

test("uses the server count and finalizes once even when the frame is rejected", async () => {
  let finalizations = 0;
  let received;
  const result = await collectCalibration({
    signal: new AbortController().signal,
    durationMs: 0,
    sendFrame: async () => ({
      ...frame,
      frame_count: 0,
      reason: "pose_not_ready",
    }),
    onFrame: (value) => {
      received = value;
    },
    finalize: async () => {
      finalizations++;
      return { baseline };
    },
  });
  assert.equal(received.frame_count, 0);
  assert.equal(received.reason, "pose_not_ready");
  assert.equal(finalizations, 1);
  assert.deepEqual(result, baseline);
});

test("repeats sequentially for the collection window and awaits the last response", async () => {
  let active = 0;
  let calls = 0;
  let finalizations = 0;
  await collectCalibration({
    signal: new AbortController().signal,
    durationMs: 40,
    intervalMs: 5,
    sendFrame: async () => {
      assert.equal(active++, 0);
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      return frame;
    },
    onFrame: () => {},
    finalize: async () => {
      assert.equal(active, 0);
      finalizations++;
      return { baseline };
    },
  });
  assert.ok(calls > 1);
  assert.equal(finalizations, 1);
});

test("aborting a pending frame prevents feedback and finalization", async () => {
  const controller = new AbortController();
  let release!: (value: CalibrationFrameResult) => void;
  const pending = collectCalibration({
    signal: controller.signal,
    durationMs: 0,
    sendFrame: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    onFrame: () => assert.fail("obsolete feedback"),
    finalize: async () => {
      assert.fail("finalized after cancellation");
    },
  });
  controller.abort();
  release(frame);
  await assert.rejects(pending, { name: "AbortError" });
});

test("missing counts and network failures never finalize", async () => {
  for (const sendFrame of [
    async () => ({}) as CalibrationFrameResult,
    async () => {
      throw new Error("offline");
    },
  ]) {
    await assert.rejects(
      collectCalibration({
        signal: new AbortController().signal,
        durationMs: 0,
        sendFrame,
        onFrame: () => {},
        finalize: async () => {
          assert.fail("unexpected finalize");
        },
      }),
    );
  }
});

test("requires a complete baseline and translates both finalize failure reasons", () => {
  assert.deepEqual(requireBaseline({ baseline }), baseline);
  assert.throws(
    () =>
      requireBaseline({
        reason: "too_much_movement",
        movement: { x_std: 0.2, y_std: 0.2 },
      }),
    /움직임/,
  );
  assert.throws(
    () => requireBaseline({ reason: "no_valid_frames_collected" }),
    /유효한 프레임/,
  );
  assert.throws(() => requireBaseline({ success: true }), /기준값/);
  assert.throws(() => requireBaseline(null), /기준값/);
  assert.throws(
    () => requireBaseline({ baseline: { ...baseline, shoulder_width: NaN } }),
    /기준값/,
  );
});

test("API sends multipart file and query session ID, and retains non-2xx failure details", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: { origin: "http://localhost:5173" },
  } as Window & typeof globalThis;
  const calls: { url: string; options: RequestInit }[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options: options! });
    return Response.json(
      calls.length === 1
        ? frame
        : { reason: "too_much_movement", movement: { x_std: 0.3, y_std: 0.2 } },
      { status: calls.length === 1 ? 200 : 400 },
    );
  };
  try {
    const signal = new AbortController().signal;
    await visionApi.calibrateFrame(
      "test session&001",
      new Blob(["image"], { type: "image/jpeg" }),
      signal,
    );
    const url = new URL(calls[0].url);
    assert.equal(url.pathname, "/vision/calibrate/frame");
    assert.equal(url.searchParams.get("session_id"), "test session&001");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.signal, signal);
    assert.ok(calls[0].options.body instanceof FormData);
    assert.equal(
      (calls[0].options.body as FormData).get("file")?.name,
      "frame.jpg",
    );
    await assert.rejects(
      visionApi.finalizeCalibration("test session&001", signal),
      (error) =>
        error instanceof VisionApiError &&
        error.data?.reason === "too_much_movement",
    );
    assert.equal(new URL(calls[1].url).pathname, "/vision/calibrate/finalize");
    assert.equal(calls[1].options.body, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

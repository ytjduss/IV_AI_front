import test from "node:test";
import assert from "node:assert/strict";
import {
  createVisionTracking,
  requireVisionSummary,
  visionFeedback,
} from "../src/lib/visionTracking";
import { visionApi } from "../src/app/lib/vision-api";
import type { PoseResult, GazeResult, VisionSummary } from "../src/type/vision";

const pose: PoseResult = {
  posture_h: "left",
  posture_v: "down",
  posture_extreme: true,
};
const gaze: GazeResult = {
  gaze_h: "center",
  gaze_v: "center",
  gaze_extreme: false,
};
const summary: VisionSummary = {
  posture_left_count: 3,
  posture_right_count: 0,
  posture_up_count: 0,
  posture_down_count: 3,
  posture_extreme_count: 1,
  gaze_left_count: 0,
  gaze_right_count: 0,
  gaze_up_count: 0,
  gaze_down_count: 0,
  gaze_extreme_count: 0,
  pose_frame_count: 3,
  gaze_frame_count: 3,
};
const wait = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

test("stopping drains both in-flight endpoints before allowing a summary", async () => {
  const events: string[] = [];
  let releasePose!: (value: PoseResult) => void;
  let releaseGaze!: (value: GazeResult) => void;
  const tracker = createVisionTracking({
    capture: async () => new Blob(["frame"]),
    enabled: () => true,
    pose: async () => {
      events.push("pose");
      return new Promise((resolve) => {
        releasePose = resolve;
      });
    },
    gaze: async () => {
      events.push("gaze");
      return new Promise((resolve) => {
        releaseGaze = resolve;
      });
    },
    onResult: () => events.push("feedback"),
    intervalMs: 1,
  });
  tracker.start();
  await wait();
  const stopped = tracker.stop().then(() => events.push("summary"));
  releasePose(pose);
  await wait();
  assert.deepEqual(events, ["pose", "gaze"]);
  releaseGaze(gaze);
  await stopped;
  await wait();
  assert.deepEqual(events, ["pose", "gaze", "feedback", "summary"]);
});

test("polling does not overlap and a failed pose request preserves gaze feedback", async () => {
  let active = 0;
  let received = 0;
  const tracker = createVisionTracking({
    capture: async () => {
      assert.equal(active, 0);
      return new Blob();
    },
    enabled: () => true,
    pose: async () => {
      throw new Error("pose failed");
    },
    gaze: async () => {
      active++;
      await wait();
      active--;
      return gaze;
    },
    onResult: (result) => {
      received++;
      assert.equal(result.pose.status, "rejected");
      assert.equal(result.gaze.status, "fulfilled");
    },
    intervalMs: 1,
  });
  tracker.start();
  await wait(30);
  await tracker.stop();
  assert.ok(received > 1);
  assert.equal(active, 0);
});

test("camera-off sends no frames; disposal cancels callbacks", async () => {
  const paused = createVisionTracking({
    capture: async () => {
      assert.fail("captured with camera off");
    },
    enabled: () => false,
    pose: async () => pose,
    gaze: async () => gaze,
    onResult: () => assert.fail(),
    intervalMs: 1,
  });
  paused.start();
  await wait();
  await paused.stop();
  let release!: (value: Blob) => void;
  const disposed = createVisionTracking({
    capture: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    enabled: () => true,
    pose: async () => {
      assert.fail("sent after unmount");
    },
    gaze: async () => {
      assert.fail();
    },
    onResult: () => assert.fail(),
  });
  disposed.start();
  disposed.dispose();
  release(new Blob());
  await disposed.stop();
});

test("handles documented directions, extreme flags and detection reasons without success fields", () => {
  assert.match(visionFeedback(pose, "pose"), /왼쪽.*아래쪽.*크게/);
  assert.match(visionFeedback(gaze, "gaze"), /중앙/);
  assert.match(
    visionFeedback({ reason: "not_calibrated" }, "pose"),
    /장비 테스트/,
  );
  assert.match(
    visionFeedback({ reason: "no_person_detected" }, "pose"),
    /사람/,
  );
  assert.match(visionFeedback({ reason: "no_face_detected" }, "gaze"), /얼굴/);
  assert.deepEqual(requireVisionSummary(summary), summary);
  assert.throws(() =>
    requireVisionSummary({ ...summary, pose_frame_count: -1 }),
  );
  assert.throws(() => requireVisionSummary({} as VisionSummary));
});

test("full API lifecycle uses one query session and expected methods/payloads", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  globalThis.window = {
    location: { origin: "http://localhost:5173" },
  } as Window & typeof globalThis;
  const endpoints: string[] = [];
  const session = "interview-contract-test";
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input));
    endpoints.push(url.pathname);
    assert.equal(url.searchParams.get("session_id"), session);
    assert.equal(options?.method, "POST");
    if (
      [
        "/vision/calibrate/frame",
        "/vision/check",
        "/vision/gaze-check",
      ].includes(url.pathname)
    ) {
      assert.ok(options?.body instanceof FormData);
      assert.ok(options.body.get("file") instanceof Blob);
    } else assert.equal(options?.body, undefined);
    const responses: Record<string, unknown> = {
      "/vision/calibrate/frame": {
        frame_count: 1,
        body_outline: null,
        target_zone: { x_min: 0.3, x_max: 0.7, y_min: 0.3, y_max: 0.7 },
      },
      "/vision/calibrate/finalize": {
        baseline: {
          shoulder_tilt: 0,
          neck_forward_ratio: 0,
          shoulder_width: 0.4,
          shoulder_mid_x: 0.5,
          shoulder_mid_y: 0.5,
        },
      },
      "/vision/answer/start": {},
      "/vision/check": pose,
      "/vision/gaze-check": gaze,
      "/vision/answer/summary": summary,
      "/vision/end-session": summary,
    };
    return Response.json(responses[url.pathname]);
  };
  try {
    const image = new Blob(["frame"]);
    await visionApi.calibrateFrame(session, image);
    await visionApi.finalizeCalibration(session);
    await visionApi.startAnswer(session);
    await Promise.all([
      visionApi.checkPose(session, image),
      visionApi.checkGaze(session, image),
    ]);
    assert.deepEqual(await visionApi.summarizeAnswer(session), summary);
    assert.deepEqual(await visionApi.endSession(session), summary);
    assert.deepEqual(endpoints, [
      "/vision/calibrate/frame",
      "/vision/calibrate/finalize",
      "/vision/answer/start",
      "/vision/check",
      "/vision/gaze-check",
      "/vision/answer/summary",
      "/vision/end-session",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.window = originalWindow;
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { InterviewFinalizer } from "../src/services/InterviewFinalizer";
import type { VisionSummary } from "../src/type/vision";

const vision: VisionSummary = {
  posture_left_count: 1,
  posture_right_count: 0,
  posture_up_count: 0,
  posture_down_count: 0,
  posture_extreme_count: 0,
  gaze_left_count: 0,
  gaze_right_count: 1,
  gaze_up_count: 0,
  gaze_down_count: 0,
  gaze_extreme_count: 0,
  pose_frame_count: 10,
  gaze_frame_count: 10,
};
const audio = { volume_db: -18, syllables_per_minute: 280 };
const answer = { questionIndex: 0, question: "자기소개", vision };

function fixture(cameraSkipped = false) {
  const events: string[] = [];
  const saved = new Map<string, string>();
  const dependencies = {
    getAudioSummary: async (id: string) => {
      assert.equal(id, "session-123");
      events.push("audio-summary");
      return audio;
    },
    endVision: async () => {
      events.push("vision-end");
      return vision;
    },
    endAudio: async () => {
      assert.deepEqual(JSON.parse(saved.get("finalInterviewAnalysis")!), {
        audio,
        vision: cameraSkipped ? null : vision,
      });
      assert.ok(saved.has("interviewAnalysis"));
      events.push("audio-end");
    },
    storage: {
      setItem: (key: string, value: string) => {
        events.push(`save:${key}`);
        saved.set(key, value);
      },
      removeItem: (key: string) => {
        events.push(`remove:${key}`);
        saved.delete(key);
      },
    },
  };
  return {
    dependencies,
    events,
    saved,
    finalizer: new InterviewFinalizer(
      "session-123",
      cameraSkipped,
      dependencies,
    ),
  };
}

test("finishes in the requested order and preserves answer data for the existing result screen", async () => {
  const { finalizer, events, saved } = fixture();
  await finalizer.finish([answer]);
  events.push("navigate:dashboard");
  assert.deepEqual(events, [
    "audio-summary",
    "vision-end",
    "save:finalInterviewAnalysis",
    "save:interviewAnalysis",
    "save:audioSessionSummary",
    "save:iv-current-id",
    "audio-end",
    "remove:visionSessionId",
    "remove:interviewSessionId",
    "navigate:dashboard",
  ]);
  assert.deepEqual(
    JSON.parse(saved.get("interviewAnalysis")!).answerSummaries,
    [answer],
  );
});

test("failed audio-summary leaves vision and audio buffers untouched", async () => {
  const { finalizer, dependencies, events } = fixture();
  dependencies.getAudioSummary = async () => {
    throw new Error("audio offline");
  };
  await assert.rejects(finalizer.finish([]), /audio offline/);
  assert.deepEqual(events, []);
});

test("a failed vision end does not clean audio and retry reuses audio summary", async () => {
  const { finalizer, dependencies, events } = fixture();
  const endVision = dependencies.endVision;
  dependencies.endVision = async () => {
    throw new Error("vision offline");
  };
  await assert.rejects(finalizer.finish([]), /vision offline/);
  assert.deepEqual(events, ["audio-summary"]);
  dependencies.endVision = endVision;
  await finalizer.finish([]);
  assert.equal(events.filter((e) => e === "audio-summary").length, 1);
});

test("storage failure does not clean audio and retry does not end vision twice", async () => {
  const { finalizer, dependencies, events } = fixture();
  const setItem = dependencies.storage.setItem;
  dependencies.storage.setItem = () => {
    throw new Error("quota exceeded");
  };
  await assert.rejects(finalizer.finish([answer]), /quota exceeded/);
  assert.deepEqual(events, ["audio-summary", "vision-end"]);
  dependencies.storage.setItem = setItem;
  await finalizer.finish([answer]);
  assert.equal(events.filter((e) => e === "vision-end").length, 1);
  assert.equal(events.filter((e) => e === "audio-summary").length, 1);
  assert.equal(events.filter((e) => e === "audio-end").length, 1);
});

test("audio cleanup failure retains saved results and retry only repeats cleanup", async () => {
  const { finalizer, dependencies, events, saved } = fixture();
  const endAudio = dependencies.endAudio;
  dependencies.endAudio = async () => {
    throw new Error("cleanup failed");
  };
  await assert.rejects(finalizer.finish([answer]), /cleanup failed/);
  assert.ok(saved.has("finalInterviewAnalysis"));
  dependencies.endAudio = endAudio;
  await finalizer.finish([answer]);
  assert.equal(events.filter((e) => e === "vision-end").length, 1);
  assert.equal(events.filter((e) => e === "audio-summary").length, 1);
});

test("camera-free interview skips vision; concurrent clicks share one finalization", async () => {
  const { finalizer, events } = fixture(true);
  const first = finalizer.finish([]);
  const second = finalizer.finish([]);
  assert.equal(first, second);
  assert.deepEqual(await first, { audio, vision: null });
  await finalizer.finish([]);
  assert.equal(events.filter((e) => e === "audio-summary").length, 1);
  assert.equal(events.filter((e) => e === "vision-end").length, 0);
  assert.equal(events.filter((e) => e === "audio-end").length, 1);
});

test("malformed vision result cannot delete audio or repeat a completed vision end", async () => {
  const { finalizer, dependencies, events } = fixture();
  dependencies.endVision = async () => {
    events.push("vision-end");
    return {} as VisionSummary;
  };
  await assert.rejects(finalizer.finish([]), /요약 데이터/);
  await assert.rejects(finalizer.finish([]), /요약 데이터/);
  assert.deepEqual(events, ["audio-summary", "vision-end"]);
});

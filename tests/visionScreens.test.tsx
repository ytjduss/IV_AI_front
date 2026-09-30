import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import InterviewScreen from "../src/screens/InterviewScreen";
import DeviceTestScreen from "../src/screens/DeviceTestScreen";
import DashboardScreen from "../src/screens/DashboardScreen";
import QuestionAnalysisScreen from "../src/screens/QuestionAnalysisScreen";
import CalibrationOverlay from "../src/components/calibration/CalibrationOverlay";

const summary = {
  posture_left_count: 2,
  posture_right_count: 0,
  posture_up_count: 0,
  posture_down_count: 1,
  posture_extreme_count: 1,
  gaze_left_count: 0,
  gaze_right_count: 1,
  gaze_up_count: 0,
  gaze_down_count: 0,
  gaze_extreme_count: 0,
  pose_frame_count: 10,
  gaze_frame_count: 9,
};

test("camera screens render without invalid hooks or decorative badge icons", () => {
  const original = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem: () => null } as unknown as Storage;
  try {
    assert.match(
      renderToStaticMarkup(<InterviewScreen onNavigate={() => {}} />),
      /답변 시작/,
    );
    const device = renderToStaticMarkup(
      <DeviceTestScreen
        onNavigate={() => {}}
        onStartWithoutCamera={() => {}}
      />,
    );
    assert.match(device, /장비 테스트/);
    assert.doesNotMatch(device, /lucide-badge/);
  } finally {
    globalThis.sessionStorage = original;
  }
});

test("real session and answer counts replace demo scores on result screens", () => {
  const original = globalThis.sessionStorage;
  globalThis.sessionStorage = {
    getItem: () =>
      JSON.stringify({
        visionSession: summary,
        cameraSkipped: false,
        answerSummaries: [
          { questionIndex: 0, question: "실제 질문", vision: summary },
        ],
      }),
  } as unknown as Storage;
  try {
    const dashboard = renderToStaticMarkup(
      <DashboardScreen onNavigate={() => {}} />,
    );
    assert.match(dashboard, /면접 전체 자세·시선 분석/);
    assert.match(dashboard, /처리 프레임 10개/);
    assert.doesNotMatch(dashboard, /종합 평가/);
    const answers = renderToStaticMarkup(
      <QuestionAnalysisScreen onNavigate={() => {}} />,
    );
    assert.match(answers, /실제 질문/);
    assert.match(answers, /처리 프레임 9개/);
    assert.doesNotMatch(answers, /홍길동/);
  } finally {
    globalThis.sessionStorage = original;
  }
});

test("overlay renders target without detection and supports partial body/face landmarks", () => {
  const targetZone = { x_min: 0.3, x_max: 0.7, y_min: 0.3, y_max: 0.7 };
  const empty = renderToStaticMarkup(
    <CalibrationOverlay outline={null} targetZone={targetZone} />,
  );
  assert.match(empty, /<rect/);
  assert.doesNotMatch(empty, /<line/);
  const outline = renderToStaticMarkup(
    <CalibrationOverlay
      targetZone={targetZone}
      outline={{
        left_shoulder: { x: 0.3, y: 0.5 },
        right_shoulder: { x: 0.7, y: 0.5 },
        face_bbox: targetZone,
      }}
    />,
  );
  assert.match(outline, /<line/);
  assert.equal((outline.match(/<rect/g) ?? []).length, 2);
});

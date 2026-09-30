import type { GazeResult, PoseResult, VisionSummary } from "../type/vision";

export function requireVisionSummary(value: VisionSummary | null) {
  const keys: (keyof VisionSummary)[] = [
    "posture_left_count",
    "posture_right_count",
    "posture_up_count",
    "posture_down_count",
    "posture_extreme_count",
    "gaze_left_count",
    "gaze_right_count",
    "gaze_up_count",
    "gaze_down_count",
    "gaze_extreme_count",
    "pose_frame_count",
    "gaze_frame_count",
  ];
  if (
    !value ||
    keys.some((key) => !Number.isInteger(value[key]) || value[key] < 0)
  ) {
    throw new Error("서버에서 자세·시선 요약 데이터를 받지 못했습니다.");
  }
  return value;
}

export function visionFeedback(
  result: PoseResult | GazeResult | null,
  kind: "pose" | "gaze",
) {
  if (result?.reason === "not_calibrated")
    return "기준 자세가 없습니다. 장비 테스트에서 다시 측정해 주세요.";
  if (result?.reason === "no_person_detected")
    return "사람을 감지하지 못했습니다. 상체가 화면에 보이도록 앉아 주세요.";
  if (result?.reason === "no_face_detected")
    return "얼굴을 감지하지 못했습니다. 얼굴이 카메라에 보이도록 해 주세요.";
  const h =
    kind === "pose"
      ? (result as PoseResult)?.posture_h
      : (result as GazeResult)?.gaze_h;
  const v =
    kind === "pose"
      ? (result as PoseResult)?.posture_v
      : (result as GazeResult)?.gaze_v;
  const extreme =
    kind === "pose"
      ? (result as PoseResult)?.posture_extreme
      : (result as GazeResult)?.gaze_extreme;
  const labels = {
    left: "왼쪽",
    right: "오른쪽",
    up: "위쪽",
    down: "아래쪽",
    center: "중앙",
  };
  if (
    !h ||
    !v ||
    !(h in labels) ||
    !(v in labels) ||
    typeof extreme !== "boolean"
  )
    return "측정 결과를 확인할 수 없습니다.";
  return `좌우: ${labels[h]} · 상하: ${labels[v]}${extreme ? " · 크게 벗어났어요. 중앙으로 돌아와 주세요." : ""}`;
}

export function createVisionTracking({
  capture,
  pose,
  gaze,
  enabled,
  onResult,
  intervalMs = 300,
}: {
  capture: () => Promise<Blob>;
  pose: (frame: Blob, signal: AbortSignal) => Promise<PoseResult>;
  gaze: (frame: Blob, signal: AbortSignal) => Promise<GazeResult>;
  enabled: () => boolean;
  onResult: (result: {
    pose: PromiseSettledResult<PoseResult>;
    gaze: PromiseSettledResult<GazeResult>;
  }) => void;
  intervalMs?: number;
}) {
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Promise<void> | null = null;
  const controller = new AbortController();
  const tick = () => {
    if (!running) return;
    const started = performance.now();
    pending = (async () => {
      if (!enabled()) return;
      try {
        const frame = await capture();
        if (!running || controller.signal.aborted) return;
        const [poseResult, gazeResult] = await Promise.allSettled([
          pose(frame, controller.signal),
          gaze(frame, controller.signal),
        ]);
        if (!controller.signal.aborted)
          onResult({ pose: poseResult, gaze: gazeResult });
      } catch (reason) {
        if (!controller.signal.aborted)
          onResult({
            pose: { status: "rejected", reason },
            gaze: { status: "rejected", reason },
          });
      }
    })().finally(() => {
      pending = null;
      if (running)
        timer = setTimeout(
          tick,
          Math.max(0, intervalMs - (performance.now() - started)),
        );
    });
  };
  return {
    start() {
      if (!running && !controller.signal.aborted) {
        running = true;
        tick();
      }
    },
    async stop() {
      running = false;
      clearTimeout(timer);
      await pending;
    },
    dispose() {
      running = false;
      clearTimeout(timer);
      controller.abort();
    },
  };
}

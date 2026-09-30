import type {
  CalibrationFrameResult,
  CalibrationFinalizeResult,
} from "../type/calibration";

const messages: Record<string, string> = {
  pose_not_ready:
    "얼굴과 상체가 화면 안에 보이도록 앉고, 어깨 중심을 목표 구역에 맞춰 주세요.",
  not_looking_at_camera: "카메라를 정면으로 바라봐 주세요.",
  no_valid_frames_collected:
    "유효한 프레임을 수집하지 못했습니다. 얼굴과 어깨 위치를 확인하고 다시 측정해 주세요.",
  too_much_movement:
    "측정 중 움직임이 많았습니다. 자세를 고정하고 다시 측정해 주세요.",
};

export function calibrationMessage(reason: string) {
  return messages[reason] ?? "자세 측정에 실패했습니다. 다시 측정해 주세요.";
}

export function requireBaseline(result: CalibrationFinalizeResult | null) {
  if (result?.reason) throw new Error(calibrationMessage(result.reason));
  const baseline = result?.baseline;
  if (
    result?.success === false ||
    !baseline ||
    ![
      baseline.shoulder_tilt,
      baseline.neck_forward_ratio,
      baseline.shoulder_width,
      baseline.shoulder_mid_x,
      baseline.shoulder_mid_y,
    ].every(Number.isFinite)
  ) {
    throw new Error("자세 기준값을 받지 못했습니다. 다시 측정해 주세요.");
  }
  return baseline;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

// Await every response before sending the next frame or finalizing.
export async function collectCalibration({
  signal,
  sendFrame,
  finalize,
  onFrame,
  durationMs = 5000,
  intervalMs = 500,
}: {
  signal: AbortSignal;
  sendFrame: () => Promise<CalibrationFrameResult>;
  finalize: () => Promise<CalibrationFinalizeResult>;
  onFrame: (result: CalibrationFrameResult) => void;
  durationMs?: number;
  intervalMs?: number;
}) {
  const deadline = performance.now() + durationMs;
  do {
    signal.throwIfAborted();
    const started = performance.now();
    const result = await sendFrame();
    signal.throwIfAborted();
    if (!Number.isInteger(result?.frame_count) || result.frame_count < 0) {
      throw new Error(
        "서버의 유효 프레임 수를 확인할 수 없습니다. 다시 측정해 주세요.",
      );
    }
    onFrame(result);
    const remaining = deadline - performance.now();
    if (remaining > 0) {
      await wait(
        Math.min(
          remaining,
          Math.max(0, intervalMs - (performance.now() - started)),
        ),
        signal,
      );
    }
  } while (performance.now() < deadline);
  signal.throwIfAborted();
  const result = await finalize();
  signal.throwIfAborted();
  return requireBaseline(result);
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type VisionApiResult = Record<string, unknown> | null;

function apiUrl(path: string, params?: Record<string, string>) {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL이 설정되지 않았습니다.");
  }

  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function request(path: string, options: RequestInit = {}, params?: Record<string, string>): Promise<VisionApiResult> {
  const response = await fetch(apiUrl(path, params), {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Vision API 요청 실패 (${response.status})`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function frameBody(frame: Blob) {
  const formData = new FormData();
  formData.append("file", frame, "frame.jpg");
  return formData;
}

export const visionApi = {
  healthCheck: () => request("/"),
  calibrateFrame: (sessionId: string, frame: Blob) =>
    request("/vision/calibrate/frame", { method: "POST", body: frameBody(frame) }, { session_id: sessionId }),
  finalizeCalibration: (sessionId: string) =>
    request("/vision/calibrate/finalize", { method: "POST" }, { session_id: sessionId }),
  checkPose: (sessionId: string, frame: Blob) =>
    request("/vision/check", { method: "POST", body: frameBody(frame) }, { session_id: sessionId }),
  checkGaze: (frame: Blob) =>
    request("/vision/gaze-check", { method: "POST", body: frameBody(frame) }),
  endSession: (sessionId: string) =>
    request("/vision/end-session", { method: "POST" }, { session_id: sessionId }),
};

export function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
  if (!video.videoWidth || !video.videoHeight) {
    return Promise.reject(new Error("카메라 영상이 아직 준비되지 않았습니다."));
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("영상 프레임을 생성할 수 없습니다."));

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("영상 프레임 변환에 실패했습니다.")),
      "image/jpeg",
      0.82,
    );
  });
}

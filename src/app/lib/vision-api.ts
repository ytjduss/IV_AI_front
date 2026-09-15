const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type VisionApiResult = Record<string, unknown> | null;

function apiUrl(path: string, params?: Record<string, string>) {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL이 설정되지 않았습니다.");
  }

  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function request(path: string, options: RequestInit = {}, params?: Record<string, string>): Promise<VisionApiResult> {
  const url = apiUrl(path, params);
  const method = options.method ?? "GET";
  const startedAt = performance.now();
  console.info(`[Vision API] ${method} ${url}`, { path, params });

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        ...options.headers,
      },
    });
    const text = await response.text();
    let data: VisionApiResult = null;

    if (text) {
      try {
        data = JSON.parse(text) as VisionApiResult;
      } catch {
        console.error(`[Vision API] JSON이 아닌 응답 (${response.status})`, text);
        throw new Error(`Vision API가 JSON이 아닌 응답을 반환했습니다. (${response.status})`);
      }
    }

    console.info(`[Vision API] ${method} ${path} 응답`, {
      status: response.status,
      elapsedMs: Math.round(performance.now() - startedAt),
      data,
    });
    console.info(`[Vision API RAW] ${method} ${path}\n${text || "(빈 응답)"}`);

    if (!response.ok) {
      const detail = data && typeof data === "object"
        ? JSON.stringify(data)
        : text;
      throw new Error(detail || `Vision API 요청 실패 (${response.status})`);
    }
    return data;
  } catch (error) {
    console.error(`[Vision API] ${method} ${path} 실패`, error);
    throw error;
  }
}

function frameBody(frame: Blob) {
  const formData = new FormData();
  formData.append("file", frame, "frame.jpg");
  return formData;
}

export const visionApi = {
  probe: async () => {
    if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL이 설정되지 않았습니다.");
    const response = await fetch(apiUrl(""), {
      method: "GET",
      headers: { Accept: "application/json", "ngrok-skip-browser-warning": "true" },
      cache: "no-store",
    });
    console.info("[Vision API] Health Check", { url: response.url, status: response.status });
    if (!response.ok) throw new Error(`Health Check 실패 (${response.status})`);
    return true;
  },
  calibrateFrame: (sessionId: string, frame: Blob) =>
    request("/vision/calibrate/frame", { method: "POST", body: frameBody(frame) }, { session_id: sessionId }),
  finalizeCalibration: (sessionId: string) =>
    request("/vision/calibrate/finalize", { method: "POST" }, { session_id: sessionId }),
  checkPose: (sessionId: string, frame: Blob) =>
    request("/vision/check", { method: "POST", body: frameBody(frame) }, { session_id: sessionId }),
  checkGaze: (sessionId: string, frame: Blob) =>
    request("/vision/gaze-check", { method: "POST", body: frameBody(frame) }, { session_id: sessionId }),
  startAnswer: (sessionId: string) =>
    request("/vision/answer/start", { method: "POST" }, { session_id: sessionId }),
  summarizeAnswer: (sessionId: string) =>
    request("/vision/answer/summary", { method: "POST" }, { session_id: sessionId }),
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

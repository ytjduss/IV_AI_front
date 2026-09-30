import type { PoseResult, GazeResult, VisionSummary } from "../../type/vision";
import type {
  CalibrationFrameResult,
  CalibrationFinalizeResult,
} from "../../type/calibration";
import { FileMinus } from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);

export type VisionApiResult = Record<string, unknown> | null;

function apiUrl(path: string, params?: Record<string, string>) {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL이 설정되지 않았습니다.");
  }

  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  Object.entries(params ?? {}).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  return url.toString();
}

export class VisionApiError extends Error {
  constructor(
    message: string,
    public data: VisionApiResult,
    public status: number,
  ) {
    super(message);
    this.name = "VisionApiError";
  }
}

async function request<T = VisionApiResult>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string>,
): Promise<T> {
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
        console.error(
          `[Vision API] JSON이 아닌 응답 (${response.status})`,
          text,
        );
        throw new Error(
          `Vision API가 JSON이 아닌 응답을 반환했습니다. (${response.status})`,
        );
      }
    }

    console.info(`[Vision API] ${method} ${path} 응답`, {
      status: response.status,
      elapsedMs: Math.round(performance.now() - startedAt),
      data,
    });
    console.info(`[Vision API RAW] ${method} ${path}\n${text || "(빈 응답)"}`);

    if (!response.ok) {
      const detail =
        data && typeof data === "object" ? JSON.stringify(data) : text;
      throw new VisionApiError(
        detail || `Vision API 요청 실패 (${response.status})`,
        data,
        response.status,
      );
    }
    return data as T;
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

//캘리브레이션 측정
export const visionApi = {
  calibrateFrame : async (
    sessionId : string,
    file : Blob,
  ) => {
    const formData = new FormData();

    formData.append(
      "file",
      file,
      "calibration-frame.jpg",
    );

    const response = await fetch(
      `http://localhost:8000/vision/calibrate/frame?session_id=${encodeURIComponent(sessionId)}`,
    {
      method : "POST",
      body : formData,
    },
    );

    if (!response.ok) {
      throw new Error(
        `캘리브레이션 프레임 전송 실패: ${response.status}`,
      );
    }
    return response.json();
  },
  //캘리브레이션 끝
finalizeCalibration: async (
  sessionId : string,
  signal?: AbortSignal,
) => {
  const response = await fetch(
   `http://localhost:8000/vision/calibrate/finalize?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "POST",
      signal,
    },
  );

  const data = await response.json();

   if (!response.ok || data.success === false) {
    if (data.reason === "no_valid_frames_collected") {
      throw new Error(
        "유효한 프레임이 부족. 다시 측정.",
      );
    }
      if (data.reason === "too_much_movement") {
      throw new Error(
        "측정 중 움직임이 많습니다. 다시 측정.",
      );
    }

    throw new Error(
      "캘리브레이션 기준 자세 확정에 실패.",
    );
   }
  return data.baseline;
},
//시선 체크
gazeCheck : async (
  sessionId : string,
  file : Blob, 
  signal?: AbortSignal,
) => {
  const formData = new FormData();

  formData.append(
    "file",
    file,
    //....
    "gaze-frame.jpg"
  );
   const response = await fetch(
    `http://localhost:8000/vision/gaze-check?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "POST",
      body: formData,
      signal,
    },
  );

  if (!response.ok) {
    throw new Error("시선 분석 요청 실패.");
  }
  return response.json();
},
//자세 체크
poseCheck: async (
  sessionId: string,
  file: Blob,
  signal?: AbortSignal,
) => {
  const formData = new FormData();

  formData.append("file", file, "pose-frame.jpg");

  const response = await fetch(
    `http://localhost:8000/vision/check?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "POST",
      body: formData,
      signal,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error("자세 분석 요청 실패");
  }

  if (data.reason === "not_calibrated") {
    throw new Error("캘리브레이션이 완료되지 않았습니다.");
  }

  if (data.reason === "no_person_detected") {
    throw new Error("사람이 감지되지 않았습니다.");
  }

  return data;
},

//답변 시작
startAnswer: async (
  sessionId: string,
  signal?: AbortSignal,
) => {
  const response = await fetch(
    `http://localhost:8000/vision/answer/start?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "POST",
      signal,
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.reason ?? "답변 추적 시작에 실패.",
    );
  }
  return data;
},

//답변 끝 후 summary
summarizeAnswer: async (
  sessionId: string,
  signal?: AbortSignal,
) => {
  const response = await fetch(
    `http://localhost:8000/vision/answer/summary?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "POST",
      signal,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error("답변 비전 요약 조회 실패");
  }

  return data;
},

//끝
endSession: async (
  sessionId: string,
  signal?: AbortSignal,
) => {
  const response = await fetch(
    `http://localhost:8000/vision/end-session?session_id=${encodeURIComponent(sessionId)}`,
    {
      method: "POST",
      signal,
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error("비전 세션 종료 실패");
  }

  return data;
},
}




export function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
  if (!video.videoWidth || !video.videoHeight) 
  {
    return Promise.reject(new Error("카메라 영상이 아직 준비되지 않았습니다."));
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context)
    return Promise.reject(new Error("영상 프레임을 생성할 수 없습니다."));

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("영상 프레임 변환에 실패했습니다.")),
      "image/jpeg",
      0.82,
    );
  });
}

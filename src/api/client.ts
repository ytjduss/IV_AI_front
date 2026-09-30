export class ApiError extends Error {
  constructor(
    message: string,
    public data: Record<string, unknown> | null,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(
  /\/$/,
  "",
);
export const AUDIO_API_BASE_URL = (
  import.meta.env.VITE_AUDIO_API_BASE_URL || API_BASE_URL
).replace(/\/$/, "");

export function apiUrl(
  path: string,
  params?: Record<string, string>,
  baseUrl = API_BASE_URL,
) {
  if (!baseUrl)
    throw new Error("VITE_API_BASE_URL에 백엔드 주소를 설정해 주세요.");
  const url = new URL(`${baseUrl}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(params ?? {}))
    url.searchParams.set(key, value);
  return url.toString();
}

export async function request<T = Record<string, unknown> | null>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string>,
  baseUrl = API_BASE_URL,
): Promise<T> {
  const response = await fetch(apiUrl(path, params, baseUrl), {
    ...options,
    headers: {
      Accept: "application/json",
      "ngrok-skip-browser-warning": "true",
      ...options.headers,
    },
  });
  const text = await response.text();
  let data: unknown = null;
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new ApiError(
        `서버 응답을 읽을 수 없습니다. (${response.status})`,
        null,
        response.status,
      );
    }
  }
  const record =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;
  if (!response.ok || record?.success === false) {
    const detail = record?.detail ?? record?.reason ?? record?.message;
    // FastAPI 검증 오류는 문자열 대신 배열이므로 각 필드의 메시지를 표시합니다.
    const validationMessage = Array.isArray(detail)
      ? detail.map((item) => typeof item?.msg === "string" ? item.msg : "").filter(Boolean).join(" / ")
      : "";
    throw new ApiError(
      typeof detail === "string"
        ? detail
        : validationMessage || `API 요청에 실패했습니다. (${response.status})`,
      record,
      response.status,
    );
  }
  // End-session may legitimately return 204 No Content.
  return data as T;
}

// 계정 API에만 Bearer 인증을 적용합니다. 비전·오디오의 기존 요청은 유지합니다.
export function authenticatedRequest<T>(
  path: string,
  options: RequestInit = {},
  params?: Record<string, string>,
  baseUrl = API_BASE_URL,
): Promise<T> {
  const token = localStorage.getItem("access_token");
  if (!token) return Promise.reject(new ApiError("로그인이 필요합니다.", null, 401));
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return request<T>(path, { ...options, headers: Object.fromEntries(headers.entries()) }, params, baseUrl);
}

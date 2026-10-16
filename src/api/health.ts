import { AUTH_API_BASE_URL } from "./auth";
import { request } from "./client";

// Health Check는 로그인 전에도 사용하므로 인증 헤더를 붙이지 않습니다.
export async function healthCheck(signal?: AbortSignal) {
  // Vercel의 명시적 /api → 백엔드 / 규칙을 사용합니다.
  // 백엔드에 직접 연결하는 개발 환경에서는 명세대로 /를 요청합니다.
  const path = AUTH_API_BASE_URL === "/api" ? "" : "/";
  const result = await request<{ status: string }>(path, { signal }, undefined, AUTH_API_BASE_URL);
  if (result?.status !== "ok") throw new Error("백엔드 서버가 정상 상태가 아닙니다.");
  return result;
}

import { AUTH_API_BASE_URL } from "./auth";
import { request } from "./client";

// Health Check는 로그인 전에도 사용하므로 인증 헤더를 붙이지 않습니다.
export async function healthCheck(signal?: AbortSignal) {
  const result = await request<{ status: string }>("/", { signal }, undefined, AUTH_API_BASE_URL);
  if (result?.status !== "ok") throw new Error("백엔드 서버가 정상 상태가 아닙니다.");
  return result;
}

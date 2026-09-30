import { AUTH_API_BASE_URL } from "./auth";
import { authenticatedRequest } from "./client";

// UC-23: 서버가 발급한 resume_id로 이력서 전문을 교체합니다.
// 로컬 UUID나 예시 이력서 ID를 서버 식별자로 보내지 않습니다.
export function updateResume(resumeId: number, content: string) {
  if (!Number.isSafeInteger(resumeId) || resumeId <= 0) {
    return Promise.reject(new Error("올바른 서버 이력서 ID가 필요합니다."));
  }
  if (!content.trim()) return Promise.reject(new Error("이력서 내용을 입력해 주세요."));
  return authenticatedRequest<{ success: boolean }>(`/resume/${resumeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  }, undefined, AUTH_API_BASE_URL);
}

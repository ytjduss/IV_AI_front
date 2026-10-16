import { AUTH_API_BASE_URL } from "./auth";
import { ApiError, authenticatedRequest } from "./client";

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

// UC-21: 등록 응답 형식은 아직 제공되지 않아 resume_id가 있을 때만 사용합니다.
export function createResume(content: string) {
  if (!content.trim()) return Promise.reject(new Error("이력서 내용을 입력해 주세요."));
  return authenticatedRequest<{ resume_id?: number } | null>("/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  }, undefined, AUTH_API_BASE_URL);
}

export type ServerResume = {
  resume_id: number;
  content: string;
  created_at: string;
  updated_at: string;
};

export async function getResume(signal?: AbortSignal): Promise<ServerResume | null> {
  let result: ServerResume | null;
  try {
    result = await authenticatedRequest<ServerResume | null>("/resume", { signal }, undefined, AUTH_API_BASE_URL);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
  if (result === null) return null;
  if (!Number.isSafeInteger(result.resume_id) || result.resume_id <= 0 || typeof result.content !== "string") {
    throw new Error("서버 이력서 응답을 확인할 수 없습니다.");
  }
  return result;
}

export function resumeForScreen(resume: ServerResume) {
  return {
    id: String(resume.resume_id), serverId: resume.resume_id, serverSaved: true,
    title: "내 이력서", text: resume.content, date: resume.updated_at || resume.created_at,
  };
}

import { AUTH_API_BASE_URL } from "./auth";
import { authenticatedRequest } from "./client";

export type MyInterviewSession = {
  session_id: number;
  job_id: number;
  interview_type: string;
  difficulty: string;
  question_count: number;
  started_at: string;
  ended_at: string | null;
};

// 서버에서 최신순으로 반환하므로 순서를 유지합니다. 미종료 세션도 포함됩니다.
export const getMyInterviewSessions = (signal?: AbortSignal) =>
  authenticatedRequest<MyInterviewSession[]>(
    "/auth/me/sessions", { signal }, undefined, AUTH_API_BASE_URL,
  );

export type CreateSessionPayload = {
  job_id: number;
  interview_type: "technical" | "behavioral" | "mixed";
  difficulty: "easy" | "medium" | "hard";
  question_count: number;
};
export type NextQuestion = { done: true } | {
  done: false;
  question_id: number;
  question: string;
  question_type: string;
};

// UC-33: 반환된 세션 ID를 면접·비전·오디오 모두에 동일하게 사용합니다.
export async function createInterviewSession(payload: CreateSessionPayload) {
  const result = await authenticatedRequest<{ session_id: number }>("/interview/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, undefined, AUTH_API_BASE_URL);
  if (!Number.isSafeInteger(result?.session_id) || result.session_id <= 0) {
    throw new Error("서버가 유효한 면접 세션 ID를 반환하지 않았습니다.");
  }
  return result;
}

// UC-34: 질문 수를 프론트에서 추측하지 않고 서버의 done으로 완료를 판단합니다.
export const getNextQuestion = (sessionId: string, signal?: AbortSignal) =>
  authenticatedRequest<NextQuestion>(`/interview/session/${encodeURIComponent(sessionId)}/question`, { signal }, undefined, AUTH_API_BASE_URL);

export type FollowupQuestion = { question_id: number; question: string };

// UC-36: Submit Answer가 반환한 실제 answer_id로 꼬리질문을 생성합니다.
// 응답의 question_id는 이후 꼬리질문 답변 제출에 사용해야 합니다.
export function generateFollowupQuestion(sessionId: string, answerId: number) {
  if (!Number.isSafeInteger(answerId) || answerId <= 0) {
    return Promise.reject(new Error("답변 제출 후 받은 answer_id가 필요합니다."));
  }
  return authenticatedRequest<FollowupQuestion>(`/interview/session/${encodeURIComponent(sessionId)}/followup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answer_id: answerId }),
  }, undefined, AUTH_API_BASE_URL);
}

// UC-38: 서버가 비전·오디오 인메모리 데이터를 읽어 리포트를 생성합니다.
// /vision/end-session, /audio/end-session으로 데이터를 정리하기 전에 호출해야 합니다.
export async function endInterviewSession(sessionId: string) {
  const result = await authenticatedRequest<{ success: boolean; report_id: number }>(
    `/interview/session/${encodeURIComponent(sessionId)}/end`, { method: "POST" }, undefined, AUTH_API_BASE_URL,
  );
  if (!result?.success || !Number.isSafeInteger(result.report_id) || result.report_id <= 0) {
    throw new Error("면접 종료 응답에서 생성된 리포트를 확인하지 못했습니다.");
  }
  return result;
}

export type SubmitAnswerPayload = {
  question_id: number;
  answer_text: string;
  video_path?: string;
  audio_path?: string;
};

// UC-35/37: 녹음 분석 완료 후 확인된 답변 전문을 실제 질문 ID로 저장합니다.
// 파일 업로드 응답이 없으면 선택 경로를 생략합니다. 로컬 파일명을 업로드 경로로 보내지 않습니다.
export async function submitAnswer(sessionId: string, payload: SubmitAnswerPayload) {
  if (!Number.isSafeInteger(payload.question_id) || payload.question_id <= 0 || !payload.answer_text.trim()) {
    throw new Error("질문 ID와 답변 내용을 확인해 주세요.");
  }
  const result = await authenticatedRequest<{ answer_id: number }>(
    `/interview/session/${encodeURIComponent(sessionId)}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, undefined, AUTH_API_BASE_URL,
  );
  if (!Number.isSafeInteger(result?.answer_id) || result.answer_id <= 0) {
    throw new Error("서버가 유효한 답변 ID를 반환하지 않았습니다.");
  }
  return result;
}

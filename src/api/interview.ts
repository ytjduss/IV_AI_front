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

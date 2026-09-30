import { AUTH_API_BASE_URL } from "./auth";
import { authenticatedRequest } from "./client";

export type InterviewReport = {
  report_id: number;
  total_score: number;
  content_score: number;
  voice_score: number;
  behavior_score: number;
  job_relevance_score: number;
  strength: string;
  improvement: string;
  created_at: string;
};
export type MyReport = Pick<InterviewReport, "report_id" | "total_score" | "created_at"> & { session_id: number };

// 상세 조회의 URL에는 report_id가 아니라 연결된 session_id를 전달합니다.
export const getReport = (sessionId: number, signal?: AbortSignal) =>
  authenticatedRequest<InterviewReport>(`/interview/session/${sessionId}/report`, { signal }, undefined, AUTH_API_BASE_URL);

// 서버가 최신순으로 정렬한 목록을 그대로 사용합니다.
export const listMyReports = (signal?: AbortSignal) =>
  authenticatedRequest<MyReport[]>("/interview/reports", { signal }, undefined, AUTH_API_BASE_URL);

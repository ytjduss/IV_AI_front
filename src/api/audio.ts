import { AUDIO_API_BASE_URL, request } from "./client";

function sessionBody(sessionId: string) {
  const body = new FormData();
  body.append("session_id", sessionId);
  return body;
}

export function startAudioSession(sessionId: string) {
  const body = sessionBody(sessionId);
  body.append("baseline_syllables_per_minute", "300");
  body.append("baseline_volume_db", "-20");
  return request(
    "/audio/session-start",
    { method: "POST", body },
    undefined,
    AUDIO_API_BASE_URL,
  );
}

export function analyzeAudio(sessionId: string, file: File) {
  const body = sessionBody(sessionId);
  body.append("file", file);
  return request(
    "/audio/analyze",
    { method: "POST", body },
    undefined,
    AUDIO_API_BASE_URL,
  );
}

async function getSummary(path: string) {
  const result = await request<unknown>(
    path,
    { method: "GET" },
    undefined,
    AUDIO_API_BASE_URL,
  );
  if (!result || typeof result !== "object")
    throw new Error("오디오 요약 데이터가 비어 있습니다. 다시 시도해 주세요.");
  return result;
}

export function getAnswerSummary(sessionId: string) {
  return getSummary(`/audio/answer-summary/${encodeURIComponent(sessionId)}`);
}

export function getSessionSummary(sessionId: string) {
  return getSummary(`/audio/session-summary/${encodeURIComponent(sessionId)}`);
}

export function endAudioSession(sessionId: string) {
  return request(
    "/audio/end-session",
    { method: "POST", body: sessionBody(sessionId) },
    undefined,
    AUDIO_API_BASE_URL,
  );
}

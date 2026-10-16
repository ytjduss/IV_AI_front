// 서버 세션 ID만 허용합니다. 로컬 UUID를 만들면 비전·오디오가 리포트에 연결되지 않습니다.
export function requireInterviewSessionId(): string {
  const id = sessionStorage.getItem("interviewSessionId");
  if (!id || !/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0 || sessionStorage.getItem("iv-ended-session-id") === id || sessionStorage.getItem("iv-report-session-id") === id) {
    throw new Error("직무 선택 화면에서 면접을 먼저 생성해 주세요.");
  }
  return id;
}

export function clearCompletedSession(id: string) {
  sessionStorage.setItem("iv-ended-session-id", id);
  if (sessionStorage.getItem("interviewSessionId") !== id) return;
  sessionStorage.removeItem("interviewSessionId");
  sessionStorage.removeItem("iv-question-count");
}

export function requireInitialQuestion<T extends { done: boolean }>(question: T): T {
  if (question.done) {
    throw new Error("첫 질문을 받기 전에 서버가 완료 응답을 반환했습니다. 질문을 다시 조회하거나 직무 선택에서 새 면접을 시작해 주세요.");
  }
  return question;
}

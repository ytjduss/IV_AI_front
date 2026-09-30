export function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

// 서버 탈퇴 성공 이후에만 실행합니다. 다른 서비스의 저장 항목은 지우지 않습니다.
export function clearAccountStorage() {
  const sessionKeys = [
    "interviewAnalysis", "finalInterviewAnalysis", "audioSessionSummary",
    "interviewResume", "visionSessionId", "interviewSessionId",
  ];
  for (const storage of [localStorage, sessionStorage]) {
    Object.keys(storage).forEach((key) => {
      if (key === "access_token" || key.startsWith("iv-") || sessionKeys.includes(key)) {
        storage.removeItem(key);
      }
    });
  }
}

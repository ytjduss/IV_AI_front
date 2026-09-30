// 서버 세션 ID만 허용합니다. 로컬 UUID를 만들면 비전·오디오가 리포트에 연결되지 않습니다.
export function requireInterviewSessionId(): string {
  const id = sessionStorage.getItem("interviewSessionId");
  if (!id || !/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    throw new Error("직무 선택 화면에서 면접을 먼저 생성해 주세요.");
  }
  return id;
}

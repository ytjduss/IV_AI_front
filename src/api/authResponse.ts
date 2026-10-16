// 프록시나 서버가 반환하는 텍스트 오류도 HTTP 상태와 함께 안내합니다.
export async function readAuthResponse(response: Response) {
  const text = await response.text();
  let data;
  try {
    data = text.trim() ? JSON.parse(text) : null;
  } catch {
    throw new Error(response.status >= 500
      ? `서버 처리 중 오류가 발생했습니다. (HTTP ${response.status}) 백엔드 또는 연결 서버의 로그 확인이 필요합니다.`
      : `서버가 JSON 형식이 아닌 응답을 반환했습니다. (HTTP ${response.status}) 백엔드 연결 주소를 확인해 주세요.`);
  }
  if (!response.ok) {
    const detail = data?.detail ?? data?.message;
    const message = typeof detail === "string" ? detail
      : Array.isArray(detail) ? detail.map((item) => item?.msg).filter(Boolean).join(" / ") : "";
    throw new Error(`${message || "서버 요청에 실패했습니다."} (HTTP ${response.status})`);
  }
  return data;
}

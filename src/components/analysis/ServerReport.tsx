import { useEffect, useState } from "react";
import { getReport, listMyReports, type InterviewReport, type MyReport } from "../../api/report";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { PercentRing } from "../ui/PercentRing";

export function ReportList({ onSelect }: { onSelect: (sessionId: number) => void }) {
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    // UC-61: 리포트 목록 화면 진입/재시도 시 GET /interview/reports를 호출합니다.
    listMyReports(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setReports(data); })
      .catch((error) => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "리포트 목록 조회에 실패했습니다."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  if (loading) return <p role="status">리포트 목록을 불러오는 중입니다.</p>;
  if (error) return <div role="alert"><p>{error}</p><Button onClick={() => setAttempt(attempt + 1)}>다시 시도</Button></div>;
  return <section aria-label="리포트 목록" className="space-y-5">
    <h2 className="font-bold">전체 {reports.length}건</h2>
    {!reports.length && <Card className="p-8">생성된 리포트가 없습니다.</Card>}
    {reports.map((report) => <Card key={report.report_id} className="p-6 space-y-4">
      <h3 className="font-bold">면접 #{report.session_id} 리포트</h3>
      <p>{new Date(report.created_at).toLocaleString("ko-KR")}</p>
      <p>종합 점수: {report.total_score}점 / 100점</p>
      {/* report_id와 session_id가 다를 수 있으므로 세션 번호로 상세 조회합니다. */}
      <Button onClick={() => onSelect(report.session_id)}>전체 분석 결과 조회</Button>
    </Card>)}
  </section>;
}

export function ServerReport({ sessionId }: { sessionId: number | null }) {
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (sessionId === null) { setLoading(false); return; }
    const controller = new AbortController();
    setReport(null);
    setLoading(true);
    setError("");
    // 404 등 미생성 응답을 가짜 점수로 대체하지 않고 재조회할 수 있게 합니다.
    // UC-52: 선택한 면접의 GET /interview/session/{session_id}/report를 호출합니다.
    // 반환된 종합·항목별 점수와 strength/improvement를 아래 카드에 표시합니다.
    getReport(sessionId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setReport(data); })
      .catch((error) => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "리포트 조회에 실패했습니다."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    // 다른 세션 선택 또는 화면 이동 시 이전 요청의 결과를 무시합니다.
    return () => controller.abort();
  }, [sessionId, attempt]);
  if (sessionId === null) return <Card className="p-6">리포트 목록에서 조회할 면접을 선택해 주세요.</Card>;
  if (loading) return <p role="status">분석 결과를 불러오는 중입니다.</p>;
  if (error) return <div role="alert" className="space-y-3"><p>{error}</p><Button onClick={() => setAttempt(attempt + 1)}>다시 조회</Button></div>;
  if (!report) return null;
  return <section aria-label="전체 분석 결과" className="space-y-6">
    <p>면접 #{sessionId} · {new Date(report.created_at).toLocaleString("ko-KR")}</p>
    <Card className="p-6 text-center"><h2 className="font-bold mb-4">종합 점수</h2><PercentRing value={report.total_score} large /><p className="mt-3">{report.total_score}점 / 100점</p></Card>
    <Card className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
      {[["답변 내용", report.content_score], ["음성", report.voice_score], ["비언어적 행동", report.behavior_score], ["직무 적합도", report.job_relevance_score]].map(([label, score]) =>
        <div key={label} className="text-center"><PercentRing value={Number(score)} /><h3 className="mt-3 font-bold">{label}</h3><p>{score}점</p></div>)}
    </Card>
    <Card className="p-6"><h2 className="font-bold">잘한 점</h2><p className="mt-3 whitespace-pre-wrap">{report.strength || "등록된 피드백이 없습니다."}</p></Card>
    <Card className="p-6"><h2 className="font-bold">개선할 점</h2><p className="mt-3 whitespace-pre-wrap">{report.improvement || "등록된 피드백이 없습니다."}</p></Card>
  </section>;
}

// 분석 서버의 UUID와 백엔드의 숫자 세션 ID를 혼동하지 않습니다.
export function selectedReportSessionId(): number | null {
  const value = sessionStorage.getItem("iv-report-session-id");
  return value && /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : null;
}

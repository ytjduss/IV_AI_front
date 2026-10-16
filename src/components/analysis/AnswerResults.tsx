import { useEffect, useState } from "react";
import { getAnswerResults, type AnswerResult } from "../../api/report";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

export function AnswerResults({ sessionId }: { sessionId: number }) {
  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getAnswerResults(sessionId, controller.signal).then((rows) => {
      if (!Array.isArray(rows)) throw new Error("답변 목록 응답을 확인할 수 없습니다.");
      if (!controller.signal.aborted) setAnswers(rows);
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "답변 조회에 실패했습니다.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sessionId, attempt]);
  if (loading) return <p role="status">질문별 답변을 불러오는 중입니다.</p>;
  if (error) return <div role="alert"><p>{error}</p><Button onClick={() => setAttempt((value) => value + 1)}>다시 조회</Button></div>;
  return <section className="space-y-5" aria-label="질문별 분석 결과">
    <p>전체 답변 {answers.length}개</p>
    {!answers.length && <Card className="p-6">저장된 답변이 없습니다.</Card>}
    {answers.map((answer, index) => <Card key={answer.answer_id} className="p-6 space-y-4">
      <h2 className="font-bold text-lg">Q{index + 1}. {answer.question}</h2>
      <p className="text-sm text-muted-foreground">
        {({ technical: "기술 질문", behavioral: "인성 질문", followup: "꼬리질문", mixed: "혼합 질문" } as Record<string, string>)[answer.question_type] ?? answer.question_type}
        {" · "}{new Date(answer.created_at).toLocaleString("ko-KR")}
      </p>
      <h3 className="font-semibold">답변 내용</h3>
      <p className="whitespace-pre-wrap">{answer.answer_text || "저장된 답변 텍스트가 없습니다."}</p>
      <dl className="text-sm space-y-2 break-all">
        <div><dt className="font-semibold">녹음 파일 경로</dt><dd>{answer.audio_path || "등록된 녹음 파일이 없습니다."}</dd></div>
        <div><dt className="font-semibold">녹화 파일 경로</dt><dd>{answer.video_path || "등록된 녹화 파일이 없습니다."}</dd></div>
      </dl>
    </Card>)}
  </section>;
}

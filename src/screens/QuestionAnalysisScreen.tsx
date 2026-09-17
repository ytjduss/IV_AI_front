import type { Screen } from "../type/screen";
import { useState } from "react";
import { Mic, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { ScoreRing } from "../components/ui/scoreRing";

export default function QuestionAnalysisScreen({
  onNavigate,
}: {
  onNavigate: (s: Screen) => void;
}) {
  const [activeQ, setActiveQ] = useState(0);
  const questions = [
    {
      q: "자기소개를 해주세요. 본인의 핵심 역량과 지원 동기를 중심으로 말씀해 주세요.",
      answer:
        "안녕하세요. 저는 3년간 프론트엔드 개발을 공부해온 홍길동입니다. React와 TypeScript를 주로 사용했으며, 사이드 프로젝트에서 사용자 경험 개선을 위해 렌더링 성능을 40% 향상시킨 경험이 있습니다. 귀사의 사용자 중심 개발 문화에 깊이 공감하여 지원하게 되었습니다.",
      scores: { fit: 85, logic: 78, specific: 82, relevance: 90 },
      strengths: [
        "직무 관련 기술 스택을 명확히 제시했습니다",
        "수치(40%)를 활용해 성과를 구체화했습니다",
      ],
      improvements: [
        "지원 동기가 다소 일반적입니다. 회사의 특정 제품이나 기술에 대한 언급을 추가하세요",
      ],
    },
    {
      q: "개발 프로젝트에서 가장 어려웠던 기술적 문제와 해결 과정을 설명해 주세요.",
      answer:
        "팀 프로젝트에서 대용량 데이터 렌더링 시 브라우저 프리징 문제가 발생했습니다. 원인을 분석한 결과 DOM 노드 과다 생성이 문제였고, 가상 스크롤을 도입해 해결했습니다. 결과적으로 FCP가 3.2초에서 0.8초로 75% 개선되었습니다.",
      scores: { fit: 88, logic: 92, specific: 95, relevance: 87 },
      strengths: [
        "STAR 구조가 명확하게 적용되었습니다",
        "구체적인 수치(FCP 75% 개선)로 결과를 제시했습니다",
        "기술 문제 해결 역량을 잘 보여줍니다",
      ],
      improvements: [
        "해결 과정에서 겪은 시행착오나 대안 검토 과정을 추가하면 더 설득력 있습니다",
      ],
    },
  ];

  const scoreColor = (score: number) =>
    score >= 90
      ? "#059669"
      : score >= 80
        ? "#2563eb"
        : score >= 70
          ? "#d97706"
          : "#dc2626";
  const q = questions[activeQ];
  const averageScore = Math.round(
    Object.values(q.scores).reduce((a, b) => a + b, 0) / 4,
  );

  return (
    <div className="min-h-screen bg-[#f7faf9] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => onNavigate("dashboard")}
          className="text-sm text-muted-foreground hover:text-primary mb-6 flex items-center gap-1"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> 결과{" "}
          <span className="mx-1">/</span>{" "}
          <strong className="text-foreground">질문별 분석</strong>
        </button>

        <div className="mb-6 rounded-none border border-border bg-white p-5">
          <h2>점수 기준</h2>
          <div className="flex flex-wrap gap-4 text-sm font-semibold mt-3">
            <span>90점 이상 · 우수</span>
            <span>80–89점 · 양호</span>
            <span>70–79점 · 보완</span>
            <span>70점 미만 · 연습 필요</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
          <Card className="p-4 lg:sticky lg:top-6">
            <h2 className="font-bold text-foreground px-3 pt-2 pb-4">
              전체 질문 ({questions.length})
            </h2>
            <div className="space-y-2">
              {questions.map((item, i) => {
                const average = Math.round(
                  Object.values(item.scores).reduce((a, b) => a + b, 0) / 4,
                );
                return (
                  <button
                    key={i}
                    onClick={() => setActiveQ(i)}
                    className={`w-full text-left rounded-none p-4 transition-all ${activeQ === i ? "bg-primary text-white shadow-sm" : "hover:bg-accent/40"}`}
                  >
                    <div className="flex justify-between text-sm font-bold mb-2">
                      <span>Q{i + 1}.</span>
                      <span
                        className="rounded-none bg-white px-2 py-0.5"
                        style={{ color: scoreColor(average) }}
                      >
                        {average}점
                      </span>
                    </div>
                    <p
                      className={`text-sm leading-snug line-clamp-2 ${activeQ === i ? "text-white/90" : "text-muted-foreground"}`}
                    >
                      {item.q}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6 sm:p-8">
              <div className="flex gap-6 justify-between items-start">
                <div>
                  <div className="text-sm font-bold text-primary mb-2">
                    Q{activeQ + 1}.
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
                    {q.q}
                  </h1>
                </div>
                <ScoreRing
                  color={scoreColor(averageScore)}
                  score={averageScore}
                  label="/ 100"
                  size={92}
                />
              </div>
              <div className="mt-7 rounded-none border border-border bg-muted/30 p-5">
                <div className="flex items-center gap-2 text-sm font-bold">
                 STT 변환 답변
                </div>
                <p className="text-foreground leading-relaxed">{q.answer}</p>
              </div>
            </Card>

            <Card className="p-6 sm:p-8 min-h-40">
              <h2 className="text-xl font-bold text-foreground">답변 평가</h2>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 ">
                <h3 className="font-bold text-">장점</h3>
                {q.strengths.map((s) => (
                  <div key={s} className="flex items-start gap-2 mb-2">
                    <p className="text-sm">{s}</p>
                  </div>
                ))}
              </Card>
              <Card className="p-6">
                <h3 className="font-bold">단점</h3>
                {q.improvements.map((s) => (
                  <div key={s} className="flex items-start gap-2 mb-2">
                    <p className="text-sm">{s}</p>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

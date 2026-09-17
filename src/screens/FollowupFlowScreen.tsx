import type { Screen } from "../type/screen";
import { ChevronRight, ChevronDown } from "lucide-react";

export default function FollowupFlowScreen({
  onNavigate,
}: {
  onNavigate: (s: Screen) => void;
}) {
  const deficiencyColors: Record<string, string> = {
    "행동 부족": "bg-red-50 text-red-600 border-red-200",
    "결과 부족": "bg-orange-50 text-orange-600 border-orange-200",
    "역할 불명확": "bg-amber-50 text-amber-600 border-amber-200",
    "직무 연관성 부족": "bg-purple-50 text-purple-600 border-purple-200",
  };

  const flows = [
    {
      baseQ: "자기소개를 해주세요.",
      summary:
        "3년간 프론트엔드 개발 학습, React/TS 활용, 사이드 프로젝트에서 렌더링 최적화 경험",
      keywords: [
        "프론트엔드",
        "React",
        "TypeScript",
        "렌더링 최적화",
        "성능 개선",
      ],
      deficiency: ["결과 부족", "직무 연관성 부족"],
      followup:
        "렌더링 최적화로 성능을 40% 개선했다고 하셨는데, 그 수치는 어떤 지표로 측정했으며 사용자에게 어떤 실질적인 영향을 미쳤나요?",
    },
    {
      baseQ: "팀 협업 경험을 말씀해 주세요.",
      summary: "GitHub 협업, 코드 리뷰 진행, 일정 내 기능 구현 완료",
      keywords: ["GitHub", "코드 리뷰", "협업", "일정 관리"],
      deficiency: ["행동 부족", "역할 불명확"],
      followup:
        "코드 리뷰 과정에서 팀원과 의견 충돌이 있었을 때, 본인이 구체적으로 어떤 행동을 했고 그 결과가 어땠는지 설명해 주시겠어요?",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7f6] py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => onNavigate("dashboard")}
            className="text-sm text-primary hover:underline mb-1 flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> 결과 대시보드로
          </button>
          <h1 className="text-2xl font-bold text-foreground">
            꼬리질문 생성 흐름
          </h1>
          <p className="text-muted-foreground mt-2">
            AI가 답변을 분석해 꼬리질문을 생성한 과정을 단계별로 보여드립니다.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {flows.map((f, i) => (
            <div
              key={i}
              className="rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-sm"
            >
              {[
                {
                  label: "기본 질문",
                  content: (
                    <p className="text-lg font-bold text-foreground">
                      {f.baseQ}
                    </p>
                  ),
                },
                {
                  label: "답변 요약",
                  content: (
                    <p className="text-muted-foreground leading-relaxed">
                      {f.summary}
                    </p>
                  ),
                },
                {
                  label: "핵심 키워드",
                  content: (
                    <div className="flex flex-wrap gap-2">
                      {f.keywords.map((k) => (
                        <span
                          key={k}
                          className="bg-accent/50 text-primary border border-primary/20 text-sm font-semibold px-3 py-1 rounded-full"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  ),
                },
                {
                  label: "부족 요소 태그",
                  content: (
                    <div className="flex flex-wrap gap-2">
                      {f.deficiency.map((d) => (
                        <span
                          key={d}
                          className={`text-sm font-semibold px-3 py-1 rounded-full border ${deficiencyColors[d]}`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  ),
                },
              ].map((step, si) => (
                <div key={step.label}>
                  <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">
                        {si + 1}
                      </span>
                      <h2 className="font-bold text-muted-foreground">
                        {step.label}
                      </h2>
                    </div>
                    {step.content}
                  </div>
                  <div className="h-10 flex items-center justify-center">
                    <ChevronDown className="w-5 h-5 text-primary/60" />
                  </div>
                </div>
              ))}

              <div className="rounded-2xl bg-primary text-white p-6 sm:p-7 shadow-lg shadow-primary/15">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                    5
                  </span>
                  <h2 className="font-bold text-white/80">생성된 꼬리질문</h2>
                </div>
                <p className="text-lg sm:text-xl font-bold leading-relaxed">
                  {f.followup}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

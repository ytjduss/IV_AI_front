import { ServerReport, selectedReportSessionId } from "../components/analysis/ServerReport";
import VisionSummaryCard from "../components/analysis/VisionSummaryCard";
import type { VisionSummary } from "../type/vision";
import type { Screen } from "../type/screen";
import {
  ChevronRight,
  BarChart3,
  RotateCcw,
  Download,
  FileText,
  BookOpen,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";

import { saveReport } from "../lib/reports";
import { PercentRing } from "../components/ui/PercentRing";

export default function DashboardScreen({
  onNavigate,
}: {
  onNavigate: (s: Screen) => void;
}) {
  // 과거 리포트를 선택한 경우 로컬 분석 데이터와 섞지 않고 서버 결과만 표시합니다.
  const reportSessionId = selectedReportSessionId();
  if (reportSessionId !== null) return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-3xl font-bold">면접 분석 결과</h1>
      <ServerReport sessionId={reportSessionId} />
      <Button onClick={() => onNavigate("reports")}>리포트 목록 조회</Button>
      <Button onClick={() => onNavigate("tips")}>면접 TIP</Button>
    </main>
  );
  const storedAnalysis = (() => {
    try {
      return (JSON.parse(sessionStorage.getItem("interviewAnalysis") ?? "{}") ??
        {}) as {
        cameraSkipped?: boolean;
        audioError?: string;
        gazeStability?: number | null;
        visionSession?: Record<string, unknown> | null;
      };
    } catch {
      return {};
    }
  })();

  const findNumber = (value: unknown, keys: string[]): number | null => {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (typeof record[key] === "number" && Number.isFinite(record[key]))
        return record[key];
    }
    for (const nested of Object.values(record)) {
      const found = findNumber(nested, keys);
      if (found !== null) return found;
    }
    return null;
  };

  const postureMovementPercent = findNumber(storedAnalysis.visionSession, [
    "posture_movement_percent",
  ]);
  const gazeMovementPercent = findNumber(storedAnalysis.visionSession, [
    "gaze_movement_percent",
  ]);
  const postureStability =
    postureMovementPercent === null
      ? null
      : Math.round(100 - Math.max(0, Math.min(100, postureMovementPercent)));
  const gazeStability =
    gazeMovementPercent === null
      ? (storedAnalysis.gazeStability ?? null)
      : Math.round(100 - Math.max(0, Math.min(100, gazeMovementPercent)));
  const scores = [
    { label: "답변 내용", score: null, color: "#0fa99e" },
    { label: "자세 안정성", score: postureStability, color: "#34d399" },
    { label: "시선 안정성", score: gazeStability, color: "#0d9489" },
    { label: "직무 연관성", score: null, color: "#6ee7b7" },
  ];

  const measuredScores = scores.flatMap((item) =>
    typeof item.score === "number" ? [item.score] : [],
  );
  const overall = measuredScores.length
    ? Math.round(
        measuredScores.reduce((sum, score) => sum + score, 0) /
          measuredScores.length,
      )
    : null;

  const sessionCounts =
    typeof storedAnalysis.visionSession?.pose_frame_count === "number"
      ? (storedAnalysis.visionSession as unknown as VisionSummary)
      : null;
  const isCurrentFormat =
    sessionCounts !== null || typeof storedAnalysis.cameraSkipped === "boolean";

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-wrap gap-4 items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mt-2">
              면접 분석 결과
            </h1>
            {(postureMovementPercent !== null ||
              gazeMovementPercent !== null) && (
              <p className="text-primary mt-2 text-sm font-semibold">
                전체 평균 이동 비율 · 자세{" "}
                {postureMovementPercent?.toFixed(1) ?? "—"}% · 시선{" "}
                {gazeMovementPercent?.toFixed(1) ?? "—"}%
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => onNavigate("device-test")} size="sm">
              다시 면접
            </Button>
            <Button
              onClick={() => {
                saveReport(storedAnalysis);
                onNavigate("reports");
              }}
              size="sm"
            >
              결과 저장
            </Button>
          </div>
        </div>

        {storedAnalysis.audioError && (
          <p role="status" className="mb-4 text-amber-700">
            음성 분석: {storedAnalysis.audioError}
          </p>
        )}
        {isCurrentFormat ? (
          <div className="mb-6">
            <VisionSummaryCard
              summary={sessionCounts}
              title="면접 전체 자세·시선 분석"
              emptyMessage={
                storedAnalysis.cameraSkipped
                  ? "카메라 없이 진행하여 자세·시선 데이터가 없습니다."
                  : "측정 데이터가 없습니다."
              }
            />
          </div>
        ) : (
          <div className="analysis-summary">
            <Card className="p-6 text-center">
              <h2 className="text-left text-lg mb-5">종합 평가</h2>
              <PercentRing value={overall} large />
              <p className="mt-5 font-semibold">
                {overall === null
                  ? "분석 결과를 기다리고 있어요"
                  : "측정된 항목을 바탕으로 산출했어요"}
              </p>
            </Card>
            <Card className="p-6">
              <h2 className="font-bold text-lg mb-5">항목별 점수</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {scores.map((item, index) => (
                  <div className="text-center" key={item.label}>
                    <PercentRing value={item.score} />
                    <h3 className="font-bold mt-4">{item.label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                      {item.score === null
                        ? "분석 데이터가 아직 없습니다."
                        : index === 1
                          ? "면접 중 상체 움직임을 바탕으로 측정합니다."
                          : "카메라 응시 데이터를 바탕으로 측정합니다."}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-7 p-3 rounded-xl bg-muted/60 text-sm text-muted-foreground">
                점수는 AI 측정값을 기반으로 산출되며, 참고 지표로 활용해
                주세요. (기준 .. 입력 예정)
              </p>
            </Card>
          </div>
        )}
        <Card className="p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-bold">개선점 피드백</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {sessionCounts
                  ? "방향별 프레임 수를 확인하고, 자주 벗어난 방향을 중심으로 자세와 시선을 연습해 보세요."
                  : overall === null
                    ? "분석 데이터가 없습니다."
                    : "자세와 시선 수치를 확인하고 다음 면접에서 연습해 보세요."}
              </p>
            </div>
            <Button onClick={() => onNavigate("tips")}>
              면접 TIP 조회
            </Button>
          </div>
        </Card>
        <button
          onClick={() => onNavigate("question-analysis")}
          className="w-full flex items-center justify-between p-5 rounded-none border border-primary/20 bg-card hover:border-primary/50 hover:bg-accent/20 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="text-left">
              <span className="font-bold text-foreground">
                질문별 상세 분석
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
        <div className="grid grid-cols-1 gap-4 mt-5">
          <Button
            onClick={() => onNavigate("reports")}
            className="justify-between p-5"
          >
            <span className="text-left">
              <span className="block font-bold">리포트 목록 조회</span>
            </span>
            <BarChart3 className="w-5 h-5 text-primary" />
          </Button>
        </div>
      </div>
    </div>
  );
}

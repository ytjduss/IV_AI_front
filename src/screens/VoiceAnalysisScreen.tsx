import type { Screen } from "../type/screen";
import { ChevronRight, Volume2, Eye } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card } from "../components/ui/card";

export default function VoiceAnalysisScreen({
  onNavigate,
}: {
  onNavigate: (s: Screen) => void;
}) {
  const voiceMetrics = [
    {
      label: "말하기 속도",
      value: "138 wpm",
      sub: "권장 범위 120~160 wpm",
      status: "정상",
      color: "emerald",
    },
    {
      label: "평균 음량",
      value: "72 dB",
      sub: "권장 범위 65~80 dB",
      status: "정상",
      color: "emerald",
    },
    {
      label: "침묵 비율",
      value: "18.3%",
      sub: "전체 발화 시간 대비",
      status: "보통",
      color: "amber",
    },
    {
      label: "필러워드 횟수",
      value: "23회",
      sub: "약 12.1회/분 (목표 5회 이하)",
      status: "개선 필요",
      color: "red",
    },
  ];

  const gazeMetrics = [
    {
      label: "정면 응시율",
      value: "74.2%",
      sub: "권장 70% 이상",
      status: "정상",
      color: "emerald",
    },
    {
      label: "시선 이탈 횟수",
      value: "31회",
      sub: "평균 5.3회/분",
      status: "보통",
      color: "amber",
    },
    {
      label: "얼굴 중심 유지율",
      value: "88.5%",
      sub: "화면 중앙 기준 ±10%",
      status: "정상",
      color: "emerald",
    },
    {
      label: "눈 깜빡임 빈도",
      value: "22회/분",
      sub: "일반 평균 15~20회/분",
      status: "보통",
      color: "amber",
    },
  ];

  const fillerData = [
    { name: "어", value: 9 },
    { name: "음", value: 7 },
    { name: "그래서", value: 4 },
    { name: "아무튼", value: 2 },
    { name: "뭐", value: 1 },
  ];

  const statusColor: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
    amber: "text-amber-600 bg-amber-50 border-amber-200",
    red: "text-red-600 bg-red-50 border-red-200",
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => onNavigate("dashboard")}
            className="text-sm text-primary hover:underline mb-1 flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> 결과 대시보드로
          </button>
          <h1 className="text-2xl font-bold text-foreground">음성·영상 분석</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            감정이나 인성을 판단하지 않고, 객관적인 수치 데이터만 제공합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" /> 음성 분석
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {voiceMetrics.map((m) => (
                <Card key={m.label} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {m.label}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor[m.color]}`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {m.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {m.sub}
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> 시선·영상 분석
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {gazeMetrics.map((m) => (
                <Card key={m.label} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {m.label}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor[m.color]}`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {m.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {m.sub}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4">필러워드 분포</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={fillerData}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#6b8e8c" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#0d1f2d" }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #d0f5f1",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    cursor={{ fill: "#f0faf9" }}
                  />
                  <Bar dataKey="value" fill="#0fa99e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4">
              시선 방향 분포 (정규화)
            </h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                ["좌상", "18%", "상단", "9%", "우상", "7%"],
                ["좌", "11%", "정면", "74%", "우", "8%"],
                ["좌하", "5%", "하단", "3%", "우하", "2%"],
              ].map((row, ri) => (
                <div key={ri} className="contents">
                  {row.reduce<React.ReactNode[]>((acc, item, i) => {
                    if (i % 2 === 0) {
                      const dir = item;
                      const pct = row[i + 1];
                      const isCenter = dir === "정면";
                      acc.push(
                        <div
                          key={dir}
                          className={`p-2 rounded-lg text-center border ${isCenter ? "bg-primary/10 border-primary/30" : "bg-muted border-border"}`}
                        >
                          <div
                            className={`text-xs font-medium ${isCenter ? "text-primary" : "text-muted-foreground"}`}
                          >
                            {dir}
                          </div>
                          <div
                            className={`text-sm font-bold ${isCenter ? "text-primary" : "text-foreground"}`}
                          >
                            {pct}
                          </div>
                        </div>,
                      );
                    }
                    return acc;
                  }, [])}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              정면 응시율 74.2%는 권장 기준(70% 이상)을 충족합니다.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

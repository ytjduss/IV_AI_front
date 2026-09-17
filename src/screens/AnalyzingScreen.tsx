import type { Screen } from "../type/screen";
import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Eye,
  Brain,
  Star,
  Circle,
  Loader2,
  Activity,
} from "lucide-react";
import { Card } from "../components/ui/card";

export default function AnalyzingScreen({
  onNavigate,
}: {
  onNavigate: (s: Screen) => void;
}) {
  const [progress, setProgress] = useState<number[]>([0, 0, 0, 0, 0]);
  const steps = [
    { label: "답변 내용 분석", icon: Brain, color: "text-emerald-500" },
    { label: "시선·영상 분석", icon: Eye, color: "text-cyan-500" },
    { label: "맞춤형 피드백 생성", icon: Star, color: "text-amber-500" },
  ];

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((_, i) => {
      const delay = i * 1200;
      const t = setTimeout(() => {
        const interval = setInterval(() => {
          setProgress((prev) => {
            const next = [...prev];
            next[i] = Math.min(next[i] + Math.random() * 15 + 5, 100);
            if (next[i] >= 100) clearInterval(interval);
            return next;
          });
        }, 150);
        timers.push(t);
      }, delay);
      timers.push(t);
    });
    const navTimer = setTimeout(() => onNavigate("dashboard"), 7000);
    timers.push(navTimer);
    return () => timers.forEach(clearTimeout);
  }, []);

  const overall = Math.round(
    progress.reduce((a, b) => a + b, 0) / steps.length,
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 relative">
            <Activity className="w-10 h-10 text-primary" />
            <div className="absolute inset-0 rounded-2xl border-2 border-primary border-t-transparent animate-spin opacity-40" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            면접 데이터를 분석 중입니다
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            AI가 답변과 영상을 분석해 맞춤형 피드백을 생성합니다.
          </p>
          <div className="mt-4 text-3xl font-bold text-primary">{overall}%</div>
        </div>

        <Card className="p-6">
          <div className="flex flex-col gap-5">
            {steps.map((s, i) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                      <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {s.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {progress[i] >= 100 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : progress[i] > 0 ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {Math.round(progress[i])}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress[i]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

import type { Screen } from "../type/screen";
import { Badge, CheckCircle2, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function JobSelectScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [selected, setSelected] = useState<string | null>("디자인");
  const [savedResumes] = useState(() =>
    readLocal<{ id: string; title: string; text: string }[]>(
      "iv-resumes",
      [],
    ).slice(0, 1),
  );
  const [selectedResumeId, setSelectedResumeId] = useState(
    savedResumes[0]?.id ?? "",
  );

  const jobs = [
    { id: "디자인", label: "디자인", sub: "UI·UX·시각디자인" },
    { id: "정보통신", label: "정보통신", sub: "개발·네트워크·보안" },
    { id: "연구개발", label: "연구개발", sub: "기술연구·제품개발" },
    { id: "공공서비스", label: "공공서비스", sub: "행정·복지·공공기관" },
    { id: "영업마케팅", label: "영업마케팅", sub: "영업·브랜드·마케팅" },
    { id: "경영사무", label: "경영사무", sub: "경영지원·인사·회계" },
    { id: "생산 관리", label: "생산 관리", sub: "생산·품질·공정관리" },
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f7fcfb] py-14 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge color="mint">STEP 1</Badge>
          <h1 className="text-4xl font-bold text-foreground mt-4">
            직무를 선택하세요
          </h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
          {jobs.map((j) => (
            <button
              key={j.id}
              onClick={() => setSelected(j.id)}
              className={`min-h-44 p-6 rounded-1xl border-3 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${selected === j.id ? "border-primary bg-accent/60 shadow-lg shadow-primary/10" : "border-border bg-card hover:border-primary/30"}`}
            >
              <div className="mt-4 text-lg font-bold text-foreground">
                {j.label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{j.sub}</div>
              {selected === j.id && (
                <div className="mt-3 flex justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
        {savedResumes.length > 0 && (
          <Card className="p-6 mb-8">
            <label
              htmlFor="interview-resume"
              className="block font-semibold mb-2"
            >
              면접에 사용할 이력서
            </label>
            <select
              id="interview-resume"
              value={selectedResumeId}
              onChange={(event) => setSelectedResumeId(event.target.value)}
              className="w-full rounded-xl border border-border bg-input-background px-4 py-3"
            >
              {savedResumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.title}
                </option>
              ))}
            </select>
          </Card>
        )}
        <div className="flex justify-between gap-3">
          <Button onClick={() => onNavigate("main")}>이전</Button>
          <Button
            onClick={() => {
              const resume = savedResumes.find(
                (item) => item.id === selectedResumeId,
              );
              sessionStorage.setItem(
                "interviewResume",
                JSON.stringify({ text: resume?.text ?? "", skipped: !resume }),
              );
              onNavigate("device-test");
            }}
            disabled={!selected}
          >
            다음: 장비 테스트 <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default JobSelectScreen;

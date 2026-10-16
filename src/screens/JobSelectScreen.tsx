import { createInterviewSession, resolveJobId } from "../api/interview";
import type { Screen } from "../type/screen";
import { CheckCircle2, ChevronRight } from "lucide-react";
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
  const jobs = ["디자인", "정보통신", "연구개발", "공공서비스", "영업마케팅", "경영사무", "생산 관리"];
  const [selected, setSelected] = useState("디자인");
  const questionCount = 5;
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdSession, setCreatedSession] = useState<number | null>(null);
  const [savedResumes] = useState(() =>
    readLocal<{ id: string; title: string; text: string }[]>(
      "iv-resumes",
      [],
    ).slice(0, 1),
  );
  const [selectedResumeId, setSelectedResumeId] = useState(
    savedResumes[0]?.id ?? "",
  );

  const handleCreateSession = async () => {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      // UC-33: 세션 생성에 성공한 뒤에만 장비 테스트로 이동합니다.
      // 저장소 쓰기가 실패한 경우 이미 생성된 세션을 재사용합니다.
      const sessionId = createdSession ?? (await createInterviewSession({
        job_id: await resolveJobId(selected), interview_type: "technical",
        difficulty: "medium", question_count: questionCount,
      })).session_id;
      setCreatedSession(sessionId);
      sessionStorage.setItem("interviewSessionId", String(sessionId));
      sessionStorage.setItem("iv-question-count", String(questionCount));
      sessionStorage.removeItem("visionSessionId");
      sessionStorage.removeItem("iv-report-session-id");
      const resume = savedResumes.find((item) => item.id === selectedResumeId);
      sessionStorage.setItem("interviewResume", JSON.stringify({ text: resume?.text ?? "", skipped: !resume }));
      onNavigate("device-test");
    } catch (error) {
      setError(error instanceof Error ? error.message : "면접 생성에 실패했습니다.");
    } finally { setCreating(false); }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f7fcfb] py-14 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          
          <h1 className="text-4xl font-bold text-foreground mt-4">
            직무선택
          </h1>
        </div>

        <fieldset disabled={creating || createdSession !== null} aria-label="직무 선택" className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
          {jobs.map((job) => (
            <button
              type="button"
              key={job}
              aria-pressed={selected === job}
              onClick={() => { setSelected(job); setError(""); }}
              className={`min-h-44 p-6 rounded-1xl border-3 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${selected === job ? "border-primary bg-accent/60 shadow-lg shadow-primary/10" : "border-border bg-card hover:border-primary/30"}`}
            >
              <div className="mt-4 text-lg font-bold text-foreground">{job}</div>
              {selected === job && (
                <div className="mt-3 flex justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
              )}
            </button>
          ))}
        </fieldset>
        {error && <p role="alert" className="text-red-600 mb-4">{error}</p>}
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
            onClick={handleCreateSession}
            disabled={creating || !selected}
          >
            {creating ? "면접 생성 중..." : "다음: 장비 테스트"} <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default JobSelectScreen;

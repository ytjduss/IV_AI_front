import { createInterviewSession, type CreateSessionPayload } from "../api/interview";
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
  const [selected, setSelected] = useState("");
  const [interviewType, setInterviewType] = useState<CreateSessionPayload["interview_type"]>("technical");
  const [difficulty, setDifficulty] = useState<CreateSessionPayload["difficulty"]>("medium");
  const [questionCount, setQuestionCount] = useState(5);
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
    if (!/^\d+$/.test(selected) || !Number.isSafeInteger(Number(selected)) || Number(selected) <= 0 || !Number.isSafeInteger(questionCount) || questionCount <= 0) {
      setError("유효한 직무 ID와 질문 수를 입력해 주세요.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      // UC-33: 세션 생성에 성공한 뒤에만 장비 테스트로 이동합니다.
      // 저장소 쓰기가 실패한 경우 이미 생성된 세션을 재사용합니다.
      const sessionId = createdSession ?? (await createInterviewSession({
        job_id: Number(selected), interview_type: interviewType,
        difficulty, question_count: questionCount,
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

        {/* 직무 목록 응답 명세가 제공되기 전에는 직무 이름에 임의 ID를 매핑하지 않습니다. */}
        <fieldset disabled={creating || createdSession !== null} className="grid gap-5 mb-8">
          <label>서버 직무 ID
            <input type="number" min="1" step="1" value={selected} onChange={(event) => setSelected(event.target.value)} className="block w-full border p-3 mt-2" />
            <span className="text-sm text-muted-foreground">/interview/jobs에서 확인한 job_id를 입력해 주세요.</span>
          </label>
          <label>면접 유형<select value={interviewType} onChange={(event) => setInterviewType(event.target.value as CreateSessionPayload["interview_type"])} className="block w-full border p-3 mt-2"><option value="technical">기술</option><option value="behavioral">인성</option><option value="mixed">혼합</option></select></label>
          <label>난이도<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as CreateSessionPayload["difficulty"])} className="block w-full border p-3 mt-2"><option value="easy">쉬움</option><option value="medium">보통</option><option value="hard">어려움</option></select></label>
          <label>질문 수<input type="number" min="1" step="1" value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} className="block w-full border p-3 mt-2" /></label>
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

import type { Screen } from "../type/screen";
import { useState } from "react";
import { ChevronRight, FileText, BookOpen } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { MY_SCREENS, SCREEN_LABELS } from "../type/screen";
import ResumeFormFields from "../components/resume/ResumeFormFields";
import { resumeToText, getResumeFields } from "../type/resume";
import { readLocal } from "../lib/storage";
import { getReports } from "../lib/reports";
import { EXAMPLE_REPORT } from "../data/exampleReport";

export default function ManagementScreen({
  screen,
  onNavigate,
}: {
  screen: Screen;
  onNavigate: (s: Screen) => void;
}) {
  const [profile, setProfile] = useState(() =>
    readLocal("iv-profile", { name: "", email: "", job: "" }),
  );
  const [editing, setEditing] = useState(screen === "profile-edit");
  const [notice, setNotice] = useState("");
  const [withdraw, setWithdraw] = useState(false);
  const [resumes, setResumes] = useState<any[]>(() =>
    readLocal<any[]>("iv-resumes", []).slice(0, 1),
  );
  const [draft, setDraft] = useState<any>(null);
  const [viewResume, setViewResume] = useState<any>(null);
  const reports = getReports();
  const entries =
    screen === "reports" || screen === "report-detail"
      ? [
          ...reports.filter((item) => item.id !== EXAMPLE_REPORT.id),
          EXAMPLE_REPORT,
        ]
      : reports;
  const selectedId = sessionStorage.getItem("iv-selected-report");
  const selected = selectedId
    ? entries.find((item) => item.id === selectedId)
    : entries[0];
  const fieldClass =
    "w-full border border-border rounded-none px-4 py-3 bg-white mt-2";
  const navigateReport = (entry: any, destination: Screen) => {
    sessionStorage.setItem(
      "interviewAnalysis",
      JSON.stringify(entry.analysis ?? null),
    );
    sessionStorage.setItem("iv-current-id", entry.id);
    sessionStorage.setItem("iv-selected-report", entry.id);
    onNavigate(destination);
  };
  return (
    <main className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
      {screen !== "tips" && (
        <div className="flex flex-wrap gap-2 mb-9">
          {MY_SCREENS.map((item) => (
            <button
              key={item}
              onClick={() => {
                onNavigate(item);
              }}
              className={`px-4 py-2 rounded-none text-sm ${screen === item || (screen === "report-detail" && item === "reports") ? "bg-primary" : "bg-white border border-border text-muted-foreground"}`}
            >
              {SCREEN_LABELS[item]}
            </button>
          ))}
        </div>
      )}
      <h1 className="text-3xl font-bold mt-3">{SCREEN_LABELS[screen]}</h1>
      <p className="text-muted-foreground mt-3 mb-8">
        
      </p>
      {notice && (
        <p role="status" className="bg-accent rounded-none p-4 mb-5 text-primary">
        </p>
      )}
      {(screen === "profile" || screen === "profile-edit") && (
        <Card className="p-6 sm:p-8 max-w-3xl">
          <div className="flex ">
            <h2 className="font-bold text-xl">내 정보</h2>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              try {
                localStorage.setItem("iv-profile", JSON.stringify(profile));
                setEditing(false);
                onNavigate("profile");
              } catch {
                setNotice("저장 공간이 부족합니다."); 
              }
            }}
          >
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { key: "name", label: "이름" },
                { key: "email", label: "이메일" },
                { key: "job", label: "희망 직무" },
              ].map(({ key, label }) => (
                <label key={key} className="text-sm font-semibold">
                  {label}
                  {editing ? (
                    <input
                      required={key !== "job"}
                      type={key === "email" ? "email" : "text"}
                      placeholder={
                        readLocal("iv-profile", {
                          name: "홍길동",
                          email: "hong@example.com",
                          job: "프론트엔드 개발자",
                        })[key as keyof typeof profile] ||
                        {
                          name: "홍길동",
                          email: "hong@example.com",
                          job: "프론트엔드 개발자",
                        }[key as keyof typeof profile]
                      }
                      className={fieldClass}
                      value={profile[key as keyof typeof profile]}
                      onChange={(e) =>
                        setProfile({ ...profile, [key]: e.target.value })
                      }
                    />
                  ) : (
                    <p className="text-base mt-3 pb-3 border-b border-border">
                      {profile[key as keyof typeof profile] ||
                        "등록된 정보가 없습니다"}
                    </p>
                  )}
                </label>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              {editing ? (
                <>
                  <button
                    type="submit"
                    className="bg-primary text-white rounded-none px-6 py-3 font-semibold"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfile(
                        readLocal("iv-profile", {
                          name: "",
                          email: "",
                          job: "",
                        }),
                      );
                      setEditing(false);
                      onNavigate("profile");
                    }}
                    className="px-5"
                  >
                    취소
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate("profile-edit")}
                  className="bg-primary text-white rounded-xl px-6 py-3 font-semibold"
                >
                  회원정보 수정
                </button>
              )}
            </div>
          </form>
          {editing && (
            <div className="border-t border-border mt-8 pt-6 flex flex-col items-end">
              <button
                onClick={() => setWithdraw(true)}
                className="text-sm text-red-500"
              >
                회원 탈퇴
              </button>
              {withdraw && (
                <div
                  role="alertdialog"
                  aria-label="회원 탈퇴 확인"
                  className="mt-4 w-full bg-red-50 p-5 rounded-none"
                >
                  <p className="font-semibold">
                    이 브라우저에 저장된 회원정보와 면접 자료를 삭제할까요?
                  </p>
                  <p className="text-sm mt-2">
                    삭제한 정보는 복구할 수 없습니다.
                  </p>
                  <div className="flex gap-4 mt-4">
                    <button onClick={() => setWithdraw(false)}>취소</button>
                    <button
                      className="text-red-600 font-bold"
                      onClick={() => {
                        [
                          "iv-profile",
                          "iv-history",
                          "iv-resumes",
                          "iv-reports",
                        ].forEach((key) => localStorage.removeItem(key));
                        [
                          "interviewAnalysis",
                          "interviewResume",
                          "iv-current-id",
                          "iv-selected-report",
                          "visionSessionId",
                        ].forEach((key) => sessionStorage.removeItem(key));
                        onNavigate("main");
                      }}
                    >
                      탈퇴 및 데이터 삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
      {screen === "tips" && (
        <Card className="py-24 text-center">
          <BookOpen className="mx-auto text-primary mb-5" size={40} />
          <h2 className="text-xl font-bold">등록된 면접 TIP이 없습니다</h2>
          <p className="text-muted-foreground mt-3">
            새로운 TIP이 등록되면 이곳에서 확인할 수 있어요.
          </p>
          <Button className="mt-7" onClick={() => onNavigate("dashboard")}>
            분석 결과로 돌아가기
          </Button>
        </Card>
      )}
      {(screen === "resumes" || screen === "resume-edit") && (
        <>
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold">내 이력서</h2>
            <Button
              onClick={() => {
                setDraft(
                  resumes[0]
                    ? { ...resumes[0] }
                    : {
                        id: crypto.randomUUID(),
                        title: "",
                        text: "",
                        fields: {},
                      },
                );
                setViewResume(null);
              }}
            >
              {resumes.length ? "이력서 수정" : "이력서 등록"}
            </Button>
          </div>
          {draft ? (
            <Card className="p-7">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fields = getResumeFields(draft);
                  const text = resumeToText(fields);
                  if (!draft.title.trim() || !text) {
                    setNotice(
                      "이력서 제목과 한 개 이상의 항목을 작성해 주세요.",
                    );
                    return;
                  }
                  const next = [
                    {
                      id: draft.id,
                      title: draft.title.trim(),
                      text,
                      fields,
                      date: new Date().toISOString(),
                    },
                  ];
                  try {
                    localStorage.setItem("iv-resumes", JSON.stringify(next));
                    setResumes(next);
                    setDraft(null);
                    setNotice("이력서가 저장되었습니다.");
                  } catch {
                    setNotice(
                      "저장 공간이 부족합니다. 불필요한 데이터를 정리한 후 다시 시도해 주세요.",
                    );
                  }
                }}
              >
                <label className="font-semibold">
                  이력서 제목
                  <input
                    required
                    className={fieldClass}
                    value={draft.title}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                  />
                </label>
                <div className="mt-7">
                  <ResumeFormFields
                    value={getResumeFields(draft)}
                    onChange={(fields) => setDraft({ ...draft, fields })}
                  />
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    className="bg-primary text-white rounded-none px-6 py-3"
                    type="submit"
                  >
                    저장
                  </button>
                  <button type="button" onClick={() => setDraft(null)}>
                    취소
                  </button>
                </div>
              </form>
            </Card>
          ) : viewResume ? (
            <Card className="p-7">
              <h2 className="text-xl font-bold">{viewResume.title}</h2>
              <p className="whitespace-pre-wrap my-6">{viewResume.text}</p>
              <div className="flex flex-wrap gap-3 mt-7">
                <Button onClick={() => setViewResume(null)}>목록</Button>
                <Button
                  onClick={() => {
                    setDraft(viewResume);
                    setViewResume(null);
                  }}
                >
                  이력서 수정
                </Button>
                <Button
                  onClick={() => {
                    sessionStorage.setItem(
                      "interviewResume",
                      JSON.stringify({ text: viewResume.text, skipped: false }),
                    );
                    onNavigate("job-select");
                  }}
                >
                  이 이력서로 면접 시작
                </Button>
              </div>
            </Card>
          ) : resumes.length ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {resumes.map((r) => (
                <Card key={r.id} className="p-6">
                  <FileText className="text-primary mb-4" />
                  <h2 className="font-bold text-xl">{r.title}</h2>
                  <p className="text-sm text-muted-foreground my-3">
                    수정일 {new Date(r.date).toLocaleDateString("ko-KR")}
                  </p>
                  <Button
                    onClick={() =>
                      screen === "resume-edit"
                        ? setDraft({ ...r })
                        : setViewResume(r)
                    }
                  >
                    {screen === "resume-edit" ? "이력서 수정" : "이력서 조회"}{" "}
                    <ChevronRight size={16} />
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-16 text-center text-muted-foreground">
              등록된 이력서가 없습니다. 첫 이력서를 등록해 보세요.
            </Card>
          )}
        </>
      )}
      {screen === "history" && (
        <Card className="p-6">
          <div className="flex justify-between mb-6">
            <h2 className="font-bold">전체 {entries.length}건</h2>
          </div>
          {entries.length ? (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap gap-4 items-center justify-between border-t border-border py-5"
              >
                <div>
                  <h3 className="font-bold">{entry.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {new Date(entry.date).toLocaleString("ko-KR")} · 질문 1개
                  </p>
                </div>
                <Button onClick={() => navigateReport(entry, "dashboard")}>
                  분석 결과 조회
                  <ChevronRight size={16} />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <FileText size={36} className="mx-auto mb-4 text-primary" />
              <h2 className="font-bold text-xl">완료한 면접이 없습니다</h2>
              <p className="text-muted-foreground mt-3">
                첫 면접을 시작해 나의 성장 기록을 남겨보세요.
              </p>
              <Button className="mt-6" onClick={() => onNavigate("job-select")}>
                면접 시작
              </Button>
            </div>
          )}
        </Card>
      )}
      {screen === "reports" && (
        <section aria-label="리포트 목록">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <h2 className="font-bold">전체 {entries.length}건</h2>
            <Button onClick={() => onNavigate("tips")}>
              <BookOpen size={18} />
              면접 TIP
            </Button>
          </div>
          <div className="space-y-6">
            {entries.map((entry) => (
              <Card key={entry.id} className="p-6 sm:p-8">
                <Badge>
                  {entry.id === EXAMPLE_REPORT.id ? "예시 리포트" : "REPORT"}
                </Badge>
                <h2 className="text-xl sm:text-2xl font-bold mt-4">
                  {entry.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-3">
                  {new Date(entry.date).toLocaleString("ko-KR")}
                </p>
                <div className="grid sm:grid-cols-3 gap-4 my-6">
                  {[
                    ["질문 수", entry.id === EXAMPLE_REPORT.id ? "2개" : "1개"],
                    [
                      "시선 안정성",
                      entry.analysis?.gazeStability == null
                        ? "측정 데이터 없음"
                        : `${entry.analysis.gazeStability}%`,
                    ],
                    [
                      "상태",
                      entry.id === EXAMPLE_REPORT.id
                        ? "예시 데이터"
                        : "저장 완료",
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-muted/60 p-5 rounded-none">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="font-bold text-lg mt-2">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigateReport(entry, "dashboard")}>
                    전체 분석 결과 조회
                  </Button>
                  <Button
                    onClick={() => navigateReport(entry, "question-analysis")}
                  >
                    질문별 상세 분석
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
      {screen === "report-detail" && (
        <>
          <Button className="mb-5" onClick={() => onNavigate("reports")}>
            리포트 목록으로 돌아가기
          </Button>
          {selected ? (
            <Card className="p-8">
              
              <h2 className="text-2xl font-bold mt-4">{selected.title}</h2>
              <p className="text-muted-foreground mt-3">
                {new Date(selected.date).toLocaleString("ko-KR")}
              </p>
              <div className="grid sm:grid-cols-3 gap-5 my-8">
                {[
                  [
                    "질문 수",
                    selected.id === EXAMPLE_REPORT.id ? "2개" : "1개",
                  ],
                  [
                    "시선 안정성",
                    selected.analysis?.gazeStability == null
                      ? "측정 데이터 없음"
                      : `${selected.analysis.gazeStability}%`,
                  ],
                  ["상태", "저장 완료"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-muted/60 p-5 rounded-none">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="font-bold text-lg mt-2">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    sessionStorage.setItem(
                      "interviewAnalysis",
                      JSON.stringify(selected.analysis),
                    );
                    sessionStorage.setItem("iv-current-id", selected.id);
                    onNavigate("dashboard");
                  }}
                >
                  전체 분석 결과 조회
                </Button>
                <Button onClick={() => onNavigate("question-analysis")}>
                  질문별 상세 분석
                </Button>
                <Button onClick={() => onNavigate("tips")}>면접 TIP</Button>
              </div>
            </Card>
          ) : (
            <Card className="p-16 text-center">
              <h2 className="text-xl font-bold">
                조회할 이전 면접 기록이 없습니다
              </h2>
              <p className="text-muted-foreground mt-3">
                면접을 완료하면 이곳에서 리포트를 확인할 수 있어요.
              </p>
            </Card>
          )}
        </>
      )}
    </main>
  );
}

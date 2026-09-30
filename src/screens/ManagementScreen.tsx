import { updateResume } from "../api/resume";
import { INTERVIEW_TIPS } from "../data/interviewTips";
import type { Screen } from "../type/screen";
import { useEffect, useState } from "react";
import { ChevronRight, FileText, BookOpen, Trophy } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { MY_SCREENS, SCREEN_LABELS } from "../type/screen";
import ResumeFormFields from "../components/resume/ResumeFormFields";
import { resumeToText, getResumeFields } from "../type/resume";
import { readLocal } from "../lib/storage";
import { ReportList, ServerReport, selectedReportSessionId } from "../components/analysis/ServerReport";
import { EXAMPLE_RESUME } from "../data/exampleResume";
import { getMyInfo, updateMyInfo, deleteAccount, logout, type MyInfo } from "../api/auth";

import { getMyInterviewSessions, type MyInterviewSession } from "../api/interview";
import { clearAccountStorage } from "../lib/storage";

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
  const [myInfo, setMyInfo] = useState<MyInfo | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [infoLoading, setInfoLoading] = useState(screen === "profile" || screen === "profile-edit");
  const [infoError, setInfoError] = useState("");
  const [infoAttempt, setInfoAttempt] = useState(0);

  useEffect(() => {
    if (screen !== "profile" && screen !== "profile-edit") return;
    const controller = new AbortController();
    setInfoLoading(true);
    setInfoError("");
    setMyInfo(null);
    getMyInfo(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setMyInfo(data);
          setEmail(data.email);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setInfoError(error instanceof Error ? error.message : "회원정보를 조회하지 못했습니다.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setInfoLoading(false);
      });
    return () => controller.abort();
  }, [screen, infoAttempt]);
  const [sessions, setSessions] = useState<MyInterviewSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(screen === "history");
  const [sessionsError, setSessionsError] = useState("");
  const [sessionsAttempt, setSessionsAttempt] = useState(0);

  // 화면 이동/재시도 시 이전 조회를 취소하여 늦게 온 응답이 덮어쓰지 않게 합니다.
  useEffect(() => {
    if (screen !== "history") return;
    const controller = new AbortController();
    setSessionsLoading(true);
    setSessionsError("");
    getMyInterviewSessions(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setSessions(data); })
      .catch((error) => {
        if (!controller.signal.aborted) setSessionsError(error instanceof Error ? error.message : "면접 내역을 조회하지 못했습니다.");
      })
      .finally(() => { if (!controller.signal.aborted) setSessionsLoading(false); });
    return () => controller.abort();
  }, [screen, sessionsAttempt]);

  const [notice, setNotice] = useState("");
  const [withdraw, setWithdraw] = useState(false);
  const [resumes, setResumes] = useState<any[]>(() =>
    readLocal<any[]>("iv-resumes", []).slice(0, 1),
  );
  const [draft, setDraft] = useState<any>(null);
  const [resumeSaving, setResumeSaving] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const displayedResumes = resumes.length || screen !== "resumes" ? resumes : [EXAMPLE_RESUME];
  const [viewResume, setViewResume] = useState<any>(null);
  const fieldClass =
    "w-full border border-border rounded-none px-4 py-3 bg-white mt-2";
  // 서버 상세 조회는 리포트 번호가 아닌 목록의 세션 번호를 사용합니다.
  const openReport = (sessionId: number) => {
    sessionStorage.setItem("iv-report-session-id", String(sessionId));
    onNavigate("dashboard");
  };

  //로그아웃
  const handleLogout = async() =>
  {
    try{
      await logout();
    }
    catch (error)
    {
      console.error("로그아웃 api 실패 ", error);
    }
    finally {
      localStorage.removeItem("access_token");
      onNavigate("login");
    }
  }

  const handleUpdateProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || deleting || !myInfo) return;
    setActionError("");
    // PATCH는 변경한 필드만 전달합니다. 빈 비밀번호는 기존 비밀번호 유지입니다.
    const payload: { email?: string; password?: string } = {};
    if (email.trim() !== myInfo.email) payload.email = email.trim();
    if (password) payload.password = password;
    if (!Object.keys(payload).length) {
      setActionError("변경할 이메일 또는 비밀번호를 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await updateMyInfo(payload);
      setPassword("");
      // 저장 성공 후 조회 화면을 다시 열어 서버의 최신 정보를 가져옵니다.
      // 비밀번호는 브라우저 저장소에 저장하지 않습니다.
      setEditing(false);
      onNavigate("profile");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "회원정보 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleting || saving) return;
    setDeleting(true);
    setActionError("");
    try {
      await deleteAccount();
    } catch (error) {
      // 서버 탈퇴 실패 시 토큰과 사용자 데이터를 보존하여 다시 시도할 수 있게 합니다.
      setActionError(error instanceof Error ? error.message : "회원 탈퇴에 실패했습니다.");
      setDeleting(false);
      return;
    }
    clearAccountStorage();
    onNavigate("login");
  };

  const handleSaveResume = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || resumeSaving) return;
    setResumeError("");
    setNotice("");
    const fields = getResumeFields({ ...draft, text: draft.text ?? draft.content });
    const content = resumeToText(fields);
    if (!content.trim()) {
      setResumeError("한 개 이상의 항목을 작성해 주세요.");
      return;
    }
    const hasServerId = draft.resume_id != null;
    setResumeSaving(true);
    try {
      // UC-23: 입력 필드를 전문으로 변환하여 PUT /resume/{resume_id}에 전달합니다.
      // 서버 등록/조회로 받은 ID만 사용하며 로컬 UUID는 전송하지 않습니다.
      if (hasServerId) await updateResume(draft.resume_id, content);
    } catch (error) {
      // 실패하면 편집 내용과 기존 저장 데이터를 유지하여 재시도할 수 있게 합니다.
      setResumeError(error instanceof Error ? error.message : "이력서 수정에 실패했습니다.");
      setResumeSaving(false);
      return;
    }
    const next = [{ ...draft, title: (draft.title ?? "").trim(), text: content,
      content, fields, date: new Date().toISOString() }];
    try {
      // 서버 수정 성공 이후 캐시를 갱신하며 resume_id도 함께 보관합니다.
      localStorage.setItem("iv-resumes", JSON.stringify(next));
      setNotice(hasServerId ? "이력서가 서버에 수정 저장되었습니다." : "이력서를 이 브라우저에 저장했습니다. 서버 등록은 아직 연결되지 않았습니다.");
    } catch {
      setNotice(hasServerId ? "서버 수정은 완료했지만 브라우저 저장 공간이 부족해 로컬 사본을 갱신하지 못했습니다." : "브라우저 저장 공간이 부족하여 저장하지 못했습니다.");
      if (!hasServerId) { setResumeSaving(false); return; }
    }
    setResumes(next);
    setDraft(null);
    setResumeSaving(false);
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
          {notice}
        </p>
      )}
      {(screen === "profile" || screen === "profile-edit") && (
        <Card className="p-6 sm:p-8 max-w-3xl">
          <div className="flex ">
            <h2 className="font-bold text-xl">내 정보</h2>
          </div>
          {(!editing || infoLoading || infoError) && (
            <div aria-busy={infoLoading}>
              {infoLoading && <p role="status">회원정보를 불러오는 중입니다.</p>}
              {infoError && (
                <div role="alert" className="space-y-3">
                  <p className="text-red-600">{infoError}</p>
                  <Button onClick={() => setInfoAttempt((attempt) => attempt + 1)}>다시 시도</Button>
                  <Button variant="outline" onClick={() => onNavigate("login")}>로그인</Button>
                </div>
              )}
              {myInfo && !editing && (
                <dl className="grid gap-6">
                  {[
                    ["이메일", myInfo.email],
                    ["희망 직무", profile.job || "미등록"],
                    ["가입 일시", new Date(myInfo.created_at).toLocaleString("ko-KR")],
                    ["이력서 첨부 여부", resumes.length > 0 ? "첨부 완료" : "미첨부"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-sm font-semibold">{label}</dt>
                      <dd className="mt-2 break-all">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
          {actionError && <p role="alert" className="mt-4 text-red-600">{actionError}</p>}
          <form onSubmit={handleUpdateProfile}>
            {editing && (
              <fieldset disabled={saving || deleting || infoLoading || !myInfo} className="grid gap-6 mt-6">
                <label className="text-sm font-semibold">
                  이메일
                  <input required type="email" autoComplete="email" className={fieldClass}
                    value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
                <label className="text-sm font-semibold">
                  새 비밀번호
                  <input type="password" autoComplete="new-password" className={fieldClass}
                    placeholder="변경할 때만 입력해 주세요" value={password}
                    onChange={(event) => setPassword(event.target.value)} />
                </label>
              </fieldset>
            )}
            <div className="mt-8 flex gap-3">
              {editing ? (
                <>
                  <button
                    type="submit"
                    disabled={saving || deleting || infoLoading || !myInfo}
                    className="bg-primary text-white rounded-none px-6 py-3 font-semibold"
                  >
                    {saving ? "저장 중..." : "저장"}
                  </button>
                  <button
                    type="button"
                    disabled={saving || deleting}
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
            <div className=" flex flex-col items-end">
              <button disabled={saving || deleting} className = "font-size-sm" onClick = {handleLogout}
              >
                로그아웃
              </button>

              <br></br>
              <br></br>
              <br></br>

              <button
                disabled={saving || deleting}
                onClick={() => { setActionError(""); setWithdraw(true); }}
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
                    계정과 연결된 이력서를 삭제하고 탈퇴할까요?
                  </p>
                  <p className="text-sm mt-2">
                    삭제한 계정과 이력서는 복구할 수 없습니다. 서버의 면접 세션과 리포트는 유지되며, 이 브라우저에 저장된 계정 관련 데이터는 정리됩니다.
                  </p>
                  <div className="flex gap-4 mt-4">
                    <button disabled={deleting} onClick={() => setWithdraw(false)}>취소</button>
                    <button
                      className="text-red-600 font-bold"
                      disabled={deleting || saving}
                      onClick={handleDeleteAccount}
                    >
                      {deleting ? "탈퇴 중..." : "회원 탈퇴"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
      {screen === "tips" && (
        <section className="max-w-4xl space-y-6" aria-label="STAR 면접 답변 예시">
          {INTERVIEW_TIPS.map((tip, index) => (
            <Card key={tip.title} className="p-6 sm:p-8">
              <h2 className="text-xl font-bold">{index + 1}. {tip.title}</h2>
              <p className="mt-5 font-semibold text-primary leading-relaxed">질문: {tip.question}</p>
              <p className="mt-4 leading-8"><strong>답변: </strong>{tip.answer}</p>
              {tip.note && <p className="mt-5 border-l-4 border-primary pl-4 text-sm text-muted-foreground leading-7">{tip.note}</p>}
            </Card>
          ))}
          <Card className="p-6 sm:p-8 bg-accent/40">
            <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen size={22} />STAR 활용 TIP</h2>
            <div className="mt-5 space-y-4 leading-8">
              <p>STAR 구조는 반드시 “경험을 말해 주세요”라는 질문에서만 사용할 필요는 없습니다.</p>
              <p><strong>지원 동기, 장점, 단점, 가치관, 기술 관심 분야</strong>와 같은 질문에서도 자신의 경험을 근거로 연결하면 답변의 신뢰도가 높아집니다.</p>
              <p>예를 들어 “저는 사용자 중심 개발을 중요하게 생각합니다.”라고 끝내는 것보다,</p>
              <blockquote className="border-l-4 border-primary pl-4 font-semibold">“정신 건강 챗봇을 개발하면서 단순한 해결책 제시보다 감정을 먼저 공감하도록 대화 흐름을 수정했고, 이를 통해 사용자 관점의 중요성을 배웠습니다.”</blockquote>
              <p>처럼 <strong>실제 상황 → 행동 → 결과</strong>를 함께 말하는 것이 더 설득력 있습니다.</p>
            </div>
          </Card>
          <Button onClick={() => onNavigate("dashboard")}>분석 결과로 돌아가기</Button>
        </section>
      )}
      {(screen === "resumes" || screen === "resume-edit") && (
        <>
          <div className="flex justify-between items-center mb-5">
            <h2 className="font-bold">내 이력서</h2>
            <Button
              disabled={resumeSaving}
              onClick={() => {
                setResumeError("");
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
              이력서 등록
            </Button>
          </div>
          {draft ? (
            <Card className="p-7">
              <form onSubmit={handleSaveResume}>
                <p className="text-sm text-muted-foreground">{draft.resume_id != null ? "서버에 등록된 이력서를 수정합니다." : "이 이력서는 브라우저에만 저장됩니다. 서버 등록은 아직 연결되지 않았습니다."}</p>
                {resumeError && <p role="alert" className="mt-3 text-red-600">{resumeError}</p>}
                <fieldset disabled={resumeSaving}>
                <div className="mt-7">
                  <ResumeFormFields
                    value={getResumeFields({ ...draft, text: draft.text ?? draft.content })}
                    onChange={(fields) => setDraft({ ...draft, fields })}
                  />
                </div>
                <div className="flex gap-4 mt-6">
                  <button
                    className="bg-primary text-white rounded-none px-6 py-3"
                    type="submit"
                  >
                    {resumeSaving ? "저장 중..." : draft.resume_id != null ? "수정 저장" : "브라우저에 저장"}
                  </button>
                  <button type="button" onClick={() => setDraft(null)}>
                    취소
                  </button>
                </div>
                </fieldset>
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
          ) : displayedResumes.length ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {displayedResumes.map((r) => (
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
              등록된 이력서가 없습니다. 
            </Card>
          )}
        </>
      )}
      {screen === "history" && (
        <Card className="p-6" aria-busy={sessionsLoading}>
          {sessionsLoading ? <p role="status">면접 내역을 불러오는 중입니다.</p> : sessionsError ? (
            <div role="alert" className="space-y-3">
              <p className="text-red-600">{sessionsError}</p>
              <Button onClick={() => setSessionsAttempt((attempt) => attempt + 1)}>다시 시도</Button>
            </div>
          ) : (
            <>
              <h2 className="font-bold mb-6">전체 {sessions.length}건</h2>
              {sessions.length ? sessions.map((session) => (
                <div key={session.session_id} className="flex flex-wrap gap-4 items-center justify-between border-t border-border py-5">
                  <div>
                    <h3 className="font-bold">면접 #{session.session_id} · 직무 #{session.job_id}</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {({ technical: "기술 면접", behavioral: "인성 면접" } as Record<string, string>)[session.interview_type] ?? session.interview_type}
                      {" · "}{({ easy: "쉬움", medium: "보통", hard: "어려움" } as Record<string, string>)[session.difficulty] ?? session.difficulty}
                      {" · 질문 "}{session.question_count}개
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">시작: {new Date(session.started_at).toLocaleString("ko-KR")}</p>
                    {session.ended_at && <p className="text-sm text-muted-foreground mt-2">종료: {new Date(session.ended_at).toLocaleString("ko-KR")}</p>}
                  </div>
                  {/* 종료된 면접은 세션 번호로 서버 리포트를 조회합니다. */}
                  {session.ended_at && <Button onClick={() => openReport(session.session_id)}>분석 결과 조회</Button>}
                  <Badge>{session.ended_at ? "완료" : "미종료"}</Badge>
                </div>
              )) : (
                <div className="text-center py-16">
                  <FileText size={36} className="mx-auto mb-4 text-primary" />
                  <h2 className="font-bold text-xl">면접 내역이 없습니다</h2>
                  <Button className="mt-6" onClick={() => onNavigate("job-select")}>면접 시작</Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}
      {screen === "reports" && <ReportList onSelect={openReport} />}
      {screen === "report-detail" && (
        <>
          <Button className="mb-5" onClick={() => onNavigate("reports")}>리포트 목록으로 돌아가기</Button>
          <ServerReport sessionId={selectedReportSessionId()} />
        </>
      )}
    </main>
  );
}

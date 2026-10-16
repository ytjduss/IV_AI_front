import { createResume } from "../api/resume";
import type { Screen } from "../type/screen";
import { ChevronRight, Video } from "lucide-react";
import { useRef, useState } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

import { ResumeFields, resumeToText } from "../type/resume";
import ResumeFormFields from "../components/resume/ResumeFormFields";

import {login, signup } from "../api/auth";

function LoginScreen({
  onNavigate,
  initialTab = "login",
}: {
  onNavigate: (s: Screen) => void;
  initialTab?: "login" | "signup";
}) {
  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [enteringResume, setEnteringResume] = useState(false);
  const [resumeFields, setResumeFields] = useState<ResumeFields>({});
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  
  const authFormRef = useRef<HTMLFormElement>(null);
  const readCredentials = () => {
    const form = authFormRef.current;
    if (!form) return { email, password, passwordConfirm };
    const data = new FormData(form);
    return {
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      passwordConfirm: String(data.get("passwordConfirm") ?? ""),
    };
  };
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  //회원가입 
  const handleSignup = async (skipResume = false) => {
    if (submittingRef.current) return;
    const { email, password, passwordConfirm } = readCredentials();
    setNotice("");

     if (!email.trim() || !password.trim())
    {
      setNotice("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    if (password !== passwordConfirm) 
    {
      setNotice("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      //회원가입 API
      await signup(email.trim(), password);

      const text = skipResume ? "" : resumeToText(resumeFields);

      if (text) {
        // 가입 직후에는 인증 토큰이 없으므로 같은 이메일로 로그인한 후 등록합니다.
        localStorage.setItem(
          "iv-pending-resume",
        JSON.stringify(
          {
            email: email.trim(),
            id: crypto.randomUUID(),
            title: resumeFields.name?.trim()
              ? `${resumeFields.name.trim()}의 이력서`
              : name.trim()
                ? `${name.trim()}의 이력서`
                : "등록한 이력서",
            text,
            fields: resumeFields,
            date: new Date().toISOString(),
          },
        ),
      );
    } else {
      localStorage.removeItem("iv-pending-resume");
    }

    // 로그인 화면에서 회원가입 탭을 연 경우에도 로그인 폼으로 전환합니다.
    setEnteringResume(false);
    setTab("login");
    setPassword("");
    setPasswordConfirm("");
    onNavigate("login");
    } catch (error){
      setNotice(
        error instanceof Error ? error.message : "회원가입 실패.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  //로그인
  const handleLogin = async () => 
  {
    if (submittingRef.current) return;
    const { email, password } = readCredentials();
    setNotice("");

    if (!email.trim() || !password.trim())
    {
      setNotice("아이디 또는 비밀번호를 입력해주세요.");
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try 
    {
      const result = await login(
        email.trim(),
        password,
      );

      if (typeof result?.access_token !== "string" || !result.access_token.trim()) throw new Error("로그인 응답에 인증 토큰이 없습니다.");
      localStorage.setItem(
      "access_token",
      result.access_token,
    );

    const pendingText = localStorage.getItem("iv-pending-resume");
    const pending = pendingText ? JSON.parse(pendingText) : null;
    if (pending?.email === email.trim()) {
      try {
        const saved = await createResume(pending.text);
        // 성공한 등록을 다시 전송하지 않도록 대기 항목부터 제거합니다.
        localStorage.removeItem("iv-pending-resume");
        const serverId = Number.isSafeInteger(saved?.resume_id) && saved!.resume_id! > 0 ? saved!.resume_id : undefined;
        const { email: pendingEmail, ...resume } = pending;
        localStorage.setItem("iv-resumes", JSON.stringify([{ ...resume, id: serverId ? String(serverId) : resume.id, serverId, serverSaved: true }]));
      } catch (error) {
        setNotice(`로그인은 성공했지만 이력서 등록을 완료하지 못했습니다. ${error instanceof Error ? error.message : "다시 시도해 주세요."}`);
        return;
      }
    }
    onNavigate("job-select");
  } catch (error) {
    setNotice(
      error instanceof Error
        ? error.message
        : "로그인에 실패했습니다.",
    );
  } finally {
    submittingRef.current = false;
    setSubmitting(false);
  }
};


  //화면
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className={`w-full ${enteringResume ? "max-w-3xl" : "max-w-md"}`}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">IV-Coach</h1>
        </div>
        <Card className="p-8">
          <form ref={authFormRef} onSubmit={(event) => {
            event.preventDefault();
            if (tab === "login") void handleLogin();
            else if (enteringResume) void handleSignup();
            else void handleSignup(true);
          }}>
          <fieldset disabled={submitting}>
          <div hidden={enteringResume}>
            <div className="flex rounded-xl bg-muted p-1 mb-6">
              {(["login", "signup"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
                >
                  {t === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              {tab === "signup" && <Input label="이름" placeholder="홍길동" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />}
              <Input
                label="이메일"
                type="email"
                placeholder="example@email.com"
                name="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input label="비밀번호" type="password" placeholder="••••••••" name="password" autoComplete={tab === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
              {tab === "signup" && (
                <Input
                  label="비밀번호 확인"
                  name="passwordConfirm"
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  type="password"
                  placeholder="••••••••"
                />
              )}
            </div>

            {tab === "signup" ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  이력서는 회원가입 후 로그인하면 서버에 등록됩니다.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setNotice("");
                    setEnteringResume(true);
                  }}
                  className="w-full"
                >
                  이력서 입력하기 <ChevronRight size={18} />
                </Button>
                <Button type="button" onClick={() => handleSignup(true)} className="w-full">
                  이력서 없이 진행
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                className="w-full"
              >
                로그인
              </Button>
            )}
          </div>

          {enteringResume && (
            <section>
              <Badge>회원가입 · 이력서 등록</Badge>
              <h2 className="text-2xl font-bold mt-4">이력서</h2>
              <p className="text-sm text-muted-foreground mt-2 mb-7">
                해당하는 항목을 입력한 후 회원가입을 완료해 주세요.
              </p>
              <ResumeFormFields
                value={resumeFields}
                onChange={setResumeFields}
              />
              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Button
                  type="button"
                  onClick={() => {
                    setNotice("");
                    setEnteringResume(false);
                  }}
                >
                  이전
                </Button>
                <Button type="button" onClick={() => handleSignup(true)}>
                  이력서 없이 진행
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSignup()}
                  disabled={!resumeToText(resumeFields).trim()}
                  className="sm:ml-auto"
                >
                  이력서 등록 및 회원가입
                </Button>
              </div>
            </section>
          )}
          </fieldset>
          </form>
          {submitting && <p role="status" className="mt-4 text-sm">처리 중입니다.</p>}
          {notice && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {notice}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default LoginScreen;

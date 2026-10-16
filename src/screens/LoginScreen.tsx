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
  
  const credentialsRef = useRef<HTMLDivElement>(null);
  // 자동 완성 등으로 React 이벤트가 발생하지 않아도 실제 입력값으로 제출합니다.
  const readCredentials = () => {
    const read = (field: string) => credentialsRef.current?.querySelector<HTMLInputElement>(`input[name="${field}"]`)?.value ?? "";
    return { email: read("email").trim(), password: read("password"), passwordConfirm: read("passwordConfirm") };
  };

  //회원가입 
  const handleSignup = async (skipResume = false) => {
    const { email, password, passwordConfirm } = readCredentials();
    setNotice("");

     if (!email || !password)
    {
      setNotice(!email ? "이메일 입력칸이 비어 있습니다." : "비밀번호 입력칸이 비어 있습니다.");
      return;
    }

    if (password !== passwordConfirm) 
    {
      setNotice("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      //회원가입 API
      await signup(email.trim(), password);

      const text = skipResume ? "" : resumeToText(resumeFields);

      if (text) {
        //db 연결 필요
        localStorage.setItem(
          "iv-resumes",
        JSON.stringify([
          {
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
        ]),
      );
    }

    // 로그인 화면에서 회원가입 탭을 연 경우에도 로그인 폼으로 전환합니다.
    setEnteringResume(false);
    setTab("login");
    setPassword("");
    setPasswordConfirm("");
    onNavigate("login");
    } catch (error){
      setNotice(
        error instanceof Error ? `회원가입 처리 실패: ${error.message}` : "회원가입 실패.",
      );
    }
  };

  //로그인
  const handleLogin = async () => 
  {
    const { email, password } = readCredentials();
    setNotice("");

    if (!email || !password)
    {
      setNotice("아이디 또는 비밀번호를 입력해주세요.");
      return;
    }
    try 
    {
      const result = await login(
        email.trim(),
        password,
      );

      localStorage.setItem(
      "access_token",
      result.access_token,
    );

    onNavigate("job-select");
  } catch (error) {
    setNotice(
      error instanceof Error
        ? error.message
        : "로그인에 실패했습니다.",
    );
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
          <div hidden={enteringResume}>
            <div className="flex rounded-xl bg-muted p-1 mb-6">
              {(["login", "signup"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
                >
                  {t === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>

            <div ref={credentialsRef} className="flex flex-col gap-4">
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
                  이력서를 입력하면 맞춤형 면접 질문을 생성이 가능합니다.
                </p>
                <Button
                  onClick={() => {
                    setNotice("");
                    setEnteringResume(true);
                  }}
                  className="w-full"
                >
                  이력서 입력하기 <ChevronRight size={18} />
                </Button>
                <Button onClick={() => handleSignup(true)} className="w-full">
                  이력서 없이 진행
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleLogin}
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
                  onClick={() => {
                    setNotice("");
                    setEnteringResume(false);
                  }}
                >
                  이전
                </Button>
                <Button onClick={() => handleSignup(true)}>
                  이력서 없이 진행
                </Button>
                <Button
                  onClick={() => handleSignup()}
                  disabled={!resumeToText(resumeFields).trim()}
                  className="sm:ml-auto"
                >
                  이력서 등록 및 회원가입
                </Button>
              </div>
            </section>
          )}
          {notice && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {notice}
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground text-center">화면 버전 · 인증 3</p>
        </Card>
      </div>
    </div>
  );
}

export default LoginScreen;

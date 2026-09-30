import type { Screen } from "../type/screen";
import { ChevronRight, Video } from "lucide-react";
import { useState } from "react";
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
  
  //회원가입 
  const handleSignup = async (skipResume = false) => {
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

    onNavigate("job-select");
    } catch (error){
      setNotice(
        error instanceof Error ? error.message : "회원가입 실패.",
      );
    }
  };

  //로그인
  const handleLogin = async () => 
  {
    setNotice("");

    if (!email.trim() || !password.trim())
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

            <div className="flex flex-col gap-4">
              {tab === "signup" && <Input label="이름" placeholder="홍길동" />}
              <Input
                label="이메일"
                type="email"
                placeholder="example@email.com"
              />
              <Input label="비밀번호" type="password" placeholder="••••••••" />
              {tab === "signup" && (
                <Input
                  label="비밀번호 확인"
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
        </Card>
      </div>
    </div>
  );
}

export default LoginScreen;

import type { Screen } from "../type/screen";
import { ChevronRight, Video } from "lucide-react";
import { useState } from "react";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

import { ResumeFields, resumeToText } from "../type/resume";
import ResumeFormFields from "../components/resume/ResumeFormFields";

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

  const completeSignup = (skipResume = false) => {
    const text = skipResume ? "" : resumeToText(resumeFields);
    try {
      if (text) {
        localStorage.setItem(
          "iv-resumes",
          JSON.stringify([
            {
              id: crypto.randomUUID(),
              title: resumeFields.name?.trim()
                ? `${resumeFields.name.trim()}의 이력서`
                : "등록한 이력서",
              text,
              fields: resumeFields,
              date: new Date().toISOString(),
            },
          ]),
        );
      }
      onNavigate("job-select");
    } catch {
      setNotice("이력서를 저장하지 못했습니다. 다시 시도해 주세요.");
    }
  };
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className={`w-full ${enteringResume ? "max-w-3xl" : "max-w-md"}`}>
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Video className="w-7 h-7 text-white" />
          </div>
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

            {tab === "login" && (
              <div className="text-right mt-2">
                <button className="text-sm text-primary hover:underline">
                  비밀번호 찾기
                </button>
              </div>
            )}

            {tab === "signup" ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  이력서를 입력하면 맞춤형 면접 질문을 준비할 수 있습니다.
                  나중에 마이페이지에서 등록할 수도 있습니다.
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
                <Button onClick={() => completeSignup(true)} className="w-full">
                  이력서 없이 진행
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => onNavigate("job-select")}
                className="w-full mt-6"
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
                <Button onClick={() => completeSignup(true)}>
                  이력서 없이 진행
                </Button>
                <Button
                  onClick={() => completeSignup()}
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

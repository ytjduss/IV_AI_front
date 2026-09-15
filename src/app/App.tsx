import { useState, useEffect, useRef } from "react";
import {
  Mic, Camera, CameraOff, Video, VideoOff, ChevronRight, CheckCircle2,
  AlertCircle, Wifi, Volume2, Eye, Brain, MessageSquare, TrendingUp, Star,
  BarChart3, Clock, Users, ArrowRight, Play, RotateCcw, Download, RefreshCw,
  ChevronDown, Circle, Check, X, Loader2, Award, Target, Zap, FileText,
  Activity, Radio, BookOpen
} from "lucide-react";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { captureVideoFrame, visionApi } from "./lib/vision-api";

type Screen =
  | "profile-edit" | "resume-edit" | "profile" | "history" | "resumes" | "reports" | "report-detail" | "tips"
  | "main"
  | "login"
  | "job-select"
  | "signup"
  | "device-test"
  | "interview"
  | "analyzing"
  | "dashboard"
  | "question-analysis"
  | "voice-analysis"
  | "followup-flow";

const MY_SCREENS: Screen[] = ["profile", "profile-edit", "resume-edit", "resumes", "reports"];

const SCREENS: Screen[] = ["job-select", "device-test", "interview", "dashboard"];

const SCREEN_LABELS: Record<Screen, string> = {
  "profile-edit": "회원정보 수정", "resume-edit": "이력서 수정", profile: "회원정보 조회", history: "면접 내역", resumes: "이력서 조회", reports: "리포트 목록 조회", "report-detail": "리포트 조회", tips: "면접 TIP",
  main: "메인",
  login: "로그인",
  "job-select": "직무 선택",
  signup: "회원가입",
  "device-test": "장비 테스트",
  interview: "면접 진행",
  analyzing: "분석 대기",
  dashboard: "결과 대시보드",
  "question-analysis": "질문별 분석",
  "voice-analysis": "음성·영상 분석",
  "followup-flow": "꼬리질문 흐름",
};

// ────────────────────────────────────────────────────────────
// Shared Components
// ────────────────────────────────────────────────────────────

function Badge({ children, color = "mint" }: { children: React.ReactNode; color?: "mint" | "navy" | "gray" | "green" | "orange" | "red" }) {
  const colors = {
    mint: "bg-accent text-accent-foreground",
    navy: "bg-secondary text-secondary-foreground",
    gray: "bg-muted text-muted-foreground",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, className = "", size = "md", disabled = false }: {
  children: React.ReactNode; onClick?: () => void; className?: string; size?: "sm" | "md" | "lg"; disabled?: boolean;
}) {
  const sizes = { sm: "px-4 py-2 text-sm", md: "px-6 py-3 text-base", lg: "px-8 py-4 text-lg" };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-[#0d9489] active:scale-[0.98] transition-all duration-150 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, className = "", size = "md" }: {
  children: React.ReactNode; onClick?: () => void; className?: string; size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "px-4 py-2 text-sm", md: "px-6 py-3 text-base", lg: "px-8 py-4 text-lg" };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold border border-border text-foreground bg-card hover:bg-muted active:scale-[0.98] transition-all duration-150 ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-2xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Input({ label, type = "text", placeholder, className = "" }: {
  label?: string; type?: string; placeholder?: string; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-semibold text-foreground">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all text-base"
      />
    </div>
  );
}

function ScoreRing({ score, label, color = "#0fa99e", size = 80 }: { score: number; label: string; color?: string; size?: number }) {
  const data = [{ value: score, fill: color }];
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#e6f9f7" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-foreground">{score}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

function NavBar({ currentScreen, onNavigate }: { currentScreen: Screen; onNavigate: (s: Screen) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate("main")}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl text-foreground">IV-Coach</span>
        </div>
        {currentScreen !== "main" && currentScreen !== "login" && !MY_SCREENS.includes(currentScreen) && currentScreen !== "report-detail" && <div className="hidden md:flex items-center gap-2">
          {SCREENS.map((s, index) => (
            <button
              key={s}
              onClick={() => onNavigate(s)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${currentScreen === s ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentScreen === s ? "bg-primary text-white" : "bg-muted"}`}>{index + 1}</span>
              {SCREEN_LABELS[s]}
            </button>
          ))}
        </div>}
        <div className="flex items-center gap-1 sm:gap-3">
        <div className="relative flex items-center">
          <button onClick={() => { onNavigate("profile"); setOpen(false); }} className="p-2 rounded-lg hover:bg-muted transition-colors text-sm font-semibold whitespace-nowrap">
            마이페이지
          </button>
          <button onClick={() => setOpen(!open)} aria-label="마이페이지 메뉴" aria-expanded={open} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
              {MY_SCREENS.map((s) => (
                <button
                  key={s}
                  onClick={() => { onNavigate(s); setOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${(currentScreen === s || (currentScreen === "report-detail" && s === "reports")) ? "text-primary font-semibold bg-accent" : "text-foreground hover:bg-muted"}`}
                >
                  {SCREEN_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
          {(currentScreen === "main" || currentScreen === "login") && (
            <div className="flex items-center gap-1 sm:gap-3">
              <button onClick={() => onNavigate("login")} className="px-2 sm:px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-primary whitespace-nowrap">로그인</button>
              <button onClick={() => onNavigate("signup")} className="px-3 sm:px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold whitespace-nowrap">회원가입</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ────────────────────────────────────────────────────────────
// 1. Main Screen
// ────────────────────────────────────────────────────────────

function MainScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-[#effcf9] to-white flex items-center justify-center px-4 pb-20">
      <div className="max-w-4xl mx-auto text-center">
        <div className="w-24 h-24 rounded-[2rem] bg-white border border-primary/10 shadow-xl shadow-primary/10 flex items-center justify-center mx-auto mb-9">
          <Video className="w-11 h-11 text-primary" />
        </div>
        <p className="text-primary font-bold tracking-[0.24em] text-sm mb-5">IV-COACH</p>
        <h1 className="text-4xl sm:text-6xl font-bold text-foreground leading-tight tracking-tight">AI 기반 맞춤형<br/><span className="text-primary">모의면접</span></h1>
        <p className="mt-7 text-lg text-muted-foreground leading-relaxed">카메라와 마이크만 준비하면 바로 시작할 수 있어요.<br/>답변과 시선을 분석해 나만의 면접 리포트를 제공합니다.</p>
        <PrimaryButton onClick={() => onNavigate("job-select")} size="lg" className="mt-11 min-w-64 py-5 rounded-2xl text-xl shadow-xl shadow-primary/20">면접 시작 <ArrowRight className="w-6 h-6" /></PrimaryButton>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 2. Login Screen
// ────────────────────────────────────────────────────────────

function LoginScreen({ onNavigate, initialTab = "login" }: { onNavigate: (s: Screen) => void; initialTab?: "login" | "signup" }) {
  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [enteringResume, setEnteringResume] = useState(false);
  const [resumeFields, setResumeFields] = useState<ResumeFields>({});
  const [notice, setNotice] = useState("");
  const completeSignup = (skipResume = false) => {
    const text = skipResume ? "" : resumeToText(resumeFields);
    try {
      if (text) {
        localStorage.setItem("iv-resumes", JSON.stringify([{
          id: crypto.randomUUID(), title: resumeFields.name?.trim() ? `${resumeFields.name.trim()}의 이력서` : "가입 시 등록한 이력서",
          text, fields: resumeFields, date: new Date().toISOString(),
        }]));
      }
      onNavigate("job-select");
    } catch {
      setNotice("이력서를 저장하지 못했습니다. 브라우저 저장 공간을 확인한 후 다시 시도해 주세요.");
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
          <p className="text-muted-foreground mt-1 text-sm">AI 기반 맞춤형 모의면접</p>
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
            <Input label="이메일" type="email" placeholder="example@email.com" />
            <Input label="비밀번호" type="password" placeholder="••••••••" />
            {tab === "signup" && <Input label="비밀번호 확인" type="password" placeholder="••••••••" />}
          </div>

          {tab === "login" && (
            <div className="text-right mt-2">
              <button className="text-sm text-primary hover:underline">비밀번호 찾기</button>
            </div>
          )}

          {tab === "signup" ? <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">이력서를 입력하면 맞춤형 면접 질문을 준비할 수 있어요. 나중에 마이페이지에서 등록할 수도 있습니다.</p>
            <PrimaryButton onClick={() => {setNotice("");setEnteringResume(true);}} className="w-full">이력서 입력하기 <ChevronRight size={18}/></PrimaryButton>
            <SecondaryButton onClick={() => completeSignup(true)} className="w-full">이력서 없이 진행</SecondaryButton>
          </div> : <PrimaryButton onClick={() => onNavigate("job-select")} className="w-full mt-6">로그인</PrimaryButton>}
          </div>
          {enteringResume && <section>
            <Badge>회원가입 · 이력서 등록</Badge>
            <h2 className="text-2xl font-bold mt-4">이력서 입력하기</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-7">해당하는 항목을 입력한 후 회원가입을 완료해 주세요.</p>
            <ResumeFormFields value={resumeFields} onChange={setResumeFields} />
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <SecondaryButton onClick={() => {setNotice("");setEnteringResume(false);}}>이전</SecondaryButton>
              <SecondaryButton onClick={() => completeSignup(true)}>이력서 없이 진행</SecondaryButton>
              <PrimaryButton onClick={() => completeSignup()} disabled={!resumeToText(resumeFields).trim()} className="sm:ml-auto">이력서 등록 및 회원가입</PrimaryButton>
            </div>
          </section>}
          {notice && <p role="alert" className="mt-4 text-sm text-red-600">{notice}</p>}

        </Card>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 3. Job Selection Screen
// ────────────────────────────────────────────────────────────

function JobSelectScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [selected, setSelected] = useState<string | null>("디자인");
  const [savedResumes] = useState(() => readLocal<{ id: string; title: string; text: string }[]>("iv-resumes", []).slice(0, 1));
  const [selectedResumeId, setSelectedResumeId] = useState(savedResumes[0]?.id ?? "");

  const jobs = [
    { id: "디자인", icon: "🎨", label: "디자인", sub: "UI·UX·시각디자인" },
    { id: "정보통신", icon: "💻", label: "정보통신", sub: "개발·네트워크·보안" },
    { id: "연구개발", icon: "🔬", label: "연구개발", sub: "기술연구·제품개발" },
    { id: "공공서비스", icon: "🏛️", label: "공공서비스", sub: "행정·복지·공공기관" },
    { id: "영업마케팅", icon: "📣", label: "영업마케팅", sub: "영업·브랜드·마케팅" },
    { id: "경영사무", icon: "🗂️", label: "경영사무", sub: "경영지원·인사·회계" },
    { id: "생산 관리", icon: "🏭", label: "생산 관리", sub: "생산·품질·공정관리" },
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f7fcfb] py-14 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge color="mint">STEP 1</Badge>
          <h1 className="text-4xl font-bold text-foreground mt-4">직무를 선택하세요</h1>
          <p className="text-muted-foreground mt-3">선택한 직무를 바탕으로 맞춤 질문을 준비합니다.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
          {jobs.map((j) => (
            <button
              key={j.id}
              onClick={() => setSelected(j.id)}
              className={`min-h-44 p-6 rounded-3xl border-2 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${selected === j.id ? "border-primary bg-accent/60 shadow-lg shadow-primary/10" : "border-border bg-card hover:border-primary/30"}`}
            >
              <span className="text-4xl block">{j.icon}</span>
              <div className="mt-4 text-lg font-bold text-foreground">{j.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{j.sub}</div>
              {selected === j.id && (
                <div className="mt-3 flex justify-center">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
        {savedResumes.length > 0 && <Card className="p-6 mb-8">
          <label htmlFor="interview-resume" className="block font-semibold mb-2">면접에 사용할 이력서</label>
          <select id="interview-resume" value={selectedResumeId} onChange={event => setSelectedResumeId(event.target.value)} className="w-full rounded-xl border border-border bg-input-background px-4 py-3">
            {savedResumes.map(resume => <option key={resume.id} value={resume.id}>{resume.title}</option>)}
            <option value="">이력서 없이 진행</option>
          </select>
          <p className="text-sm text-muted-foreground mt-3">회원가입 또는 마이페이지에서 등록한 이력서를 사용합니다.</p>
        </Card>}
        <div className="flex justify-between gap-3">
          <SecondaryButton onClick={() => onNavigate("main")} size="lg">이전</SecondaryButton>
          <PrimaryButton onClick={() => {
            const resume = savedResumes.find(item => item.id === selectedResumeId);
            sessionStorage.setItem("interviewResume", JSON.stringify({ text: resume?.text ?? "", skipped: !resume }));
            onNavigate("device-test");
          }} disabled={!selected} size="lg">
            다음: 장비 테스트 <ChevronRight className="w-5 h-5" />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 4. Resume Screen
// ────────────────────────────────────────────────────────────

const RESUME_FIELDS = [
  { key: "name", label: "이름", placeholder: "홍길동" },
  { key: "job", label: "지원 직무", placeholder: "예: 프론트엔드 개발자" },
  { key: "email", label: "이메일", placeholder: "example@email.com" },
  { key: "phone", label: "연락처", placeholder: "010-0000-0000" },
  { key: "education", label: "학력", placeholder: "학교명 / 전공 / 재학 기간 / 졸업 여부", rows: 3 },
  { key: "experience", label: "경력", placeholder: "회사명 / 근무 기간 / 직무 / 주요 업무와 성과", rows: 4 },
  { key: "projects", label: "프로젝트 및 활동", placeholder: "프로젝트명 / 진행 기간 / 담당 역할 / 사용 기술 / 성과", rows: 4 },
  { key: "skills", label: "보유 기술 및 자격증", placeholder: "활용 가능한 기술, 자격증, 어학 능력", rows: 3 },
  { key: "introduction", label: "자기소개", placeholder: "직무 관련 강점, 지원 동기와 목표를 작성해 주세요.", rows: 5 },
] as const;
type ResumeFields = Partial<Record<typeof RESUME_FIELDS[number]["key"], string>>;
function resumeToText(fields: ResumeFields): string {
  return RESUME_FIELDS.filter(field => fields[field.key]?.trim()).map(field => `${field.label}\n${fields[field.key]!.trim()}`).join("\n\n");
}
function getResumeFields(resume: { fields?: ResumeFields; text?: string }): ResumeFields {
  return resume.fields ?? { introduction: resume.text ?? "" };
}
function ResumeFormFields({ value, onChange }: { value: ResumeFields; onChange: (value: ResumeFields) => void }) {
  const inputClass = "mt-2 w-full rounded-xl border border-border bg-input-background px-4 py-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring";
  return <div className="space-y-6">
    <div className="border-b border-border pb-5"><h2 className="text-2xl font-bold">이력서</h2><p className="text-sm text-muted-foreground mt-2">해당하는 항목을 텍스트로 작성해 주세요. 작성한 내용은 면접 질문에 활용됩니다.</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">{RESUME_FIELDS.map(field => <label key={field.key} className={`block text-sm font-semibold ${"rows" in field ? "sm:col-span-2 border-t border-border pt-5" : ""}`}>
      {field.label}
      {"rows" in field ? <textarea rows={field.rows} className={`${inputClass} resize-y`} placeholder={field.placeholder} value={value[field.key] ?? ""} onChange={event => onChange({...value, [field.key]: event.target.value})}/> : <input type={field.key === "email" ? "email" : field.key === "phone" ? "tel" : "text"} className={inputClass} placeholder={field.placeholder} value={value[field.key] ?? ""} onChange={event => onChange({...value, [field.key]: event.target.value})}/>}
    </label>)}</div>
  </div>;
}

// ────────────────────────────────────────────────────────────
// 5. Device Test Screen
// ────────────────────────────────────────────────────────────

function DeviceTestScreen({ onNavigate, onStartWithoutCamera }: { onNavigate: (s: Screen) => void; onStartWithoutCamera: () => void }) {
  const [cameraOk, setCameraOk] = useState(false);
  const startWithoutCamera = () => {
    if (testing) return;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getVideoTracks().forEach(track => track.stop());
    onStartWithoutCamera();
  };
  const [micOk, setMicOk] = useState(false);
  const [noiseOk, setNoiseOk] = useState(false);
  const [netOk, setNetOk] = useState(false);
  const [testing, setTesting] = useState(false);
  const [calibrationReady, setCalibrationReady] = useState(false);
  const [calibrationFinalized, setCalibrationFinalized] = useState(false);
  const [calibrationMetrics, setCalibrationMetrics] = useState<Array<{ label: string; value: number }>>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [ambientLevel, setAmbientLevel] = useState(0);
  const [visionStatus, setVisionStatus] = useState("카메라 연결 중");
  const [poseErrorRate, setPoseErrorRate] = useState<number | null>(null);
  const [poseFeedback, setPoseFeedback] = useState("카메라 중앙에 얼굴과 양쪽 어깨가 보이도록 앉아 주세요.");
  const [poseFeedbackLevel, setPoseFeedbackLevel] = useState<"waiting" | "good" | "adjust">("waiting");
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionIdRef = useRef(`interview-${crypto.randomUUID()}`);

  const extractCalibrationMetrics = (result: unknown) => {
    const metrics: Array<{ label: string; value: number }> = [];
    const labels: Record<string, string> = {
      confidence: "감지 신뢰도",
      detection_confidence: "감지 신뢰도",
      pose_confidence: "자세 감지 신뢰도",
      visibility: "가시성",
      frame_count: "수집 프레임",
      accepted_frames: "유효 프레임",
      shoulder_width: "어깨 너비",
      shoulder_center_x: "어깨 중심 X",
      shoulder_center_y: "어깨 중심 Y",
      center_x: "중심 X",
      center_y: "중심 Y",
    };

    const visit = (value: unknown, path = "") => {
      if (!value || typeof value !== "object") return;
      Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
        const nextPath = path ? `${path}.${key}` : key;
        if (typeof nested === "number" && Number.isFinite(nested)) {
          const normalizedKey = key.toLowerCase();
          if (![/timestamp/, /session/, /width$/, /height$/].some((pattern) => pattern.test(normalizedKey))) {
            metrics.push({ label: labels[normalizedKey] ?? nextPath, value: nested });
          }
        } else if (nested && typeof nested === "object" && !Array.isArray(nested)) {
          visit(nested, nextPath);
        }
      });
    };

    visit(result);
    return metrics.slice(0, 6);
  };

  const formatMetricValue = (label: string, value: number) => {
    const isRatio = /confidence|visibility|ratio|score/i.test(label) || /신뢰도|가시성/.test(label);
    if (isRatio && value >= 0 && value <= 1) return `${(value * 100).toFixed(1)}%`;
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  };

  const findYValues = (result: unknown) => {
    const values: Record<string, number> = {};
    const visit = (value: unknown, path = "") => {
      if (!value || typeof value !== "object") return;
      Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
        const nextPath = path ? `${path}.${key}` : key;
        if (typeof nested === "number" && Number.isFinite(nested) && /(^y$|_y$|y_|\.y$)/i.test(key)) {
          values[nextPath] = nested;
        } else if (nested && typeof nested === "object") {
          visit(nested, nextPath);
        }
      });
    };
    visit(result);
    return values;
  };

  const findNumericValues = (result: unknown) => {
    const values: Record<string, number> = {};
    const visit = (value: unknown, path = "") => {
      if (!value || typeof value !== "object") return;
      Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
        const nextPath = path ? `${path}.${key}` : key;
        if (typeof nested === "number" && Number.isFinite(nested)) values[nextPath] = nested;
        else if (nested && typeof nested === "object") visit(nested, nextPath);
      });
    };
    visit(result);
    return values;
  };

  const updatePoseFeedback = (result: unknown) => {
    const numericValues = findNumericValues(result);
    const entries = Object.entries(numericValues);
    const findMetric = (patterns: RegExp[]) => entries.find(([key]) => patterns.some((pattern) => pattern.test(key)))?.[1];
    const explicitError = findMetric([
      /posture_movement_percent/i,
      /movement_percent/i,
      /error_rate/i,
      /deviation_percent/i,
      /error_percent/i,
    ]);
    const deltaY = findMetric([/delta_y/i, /y_diff/i, /y_offset/i, /vertical.*deviation/i]);
    const deltaX = findMetric([/delta_x/i, /x_diff/i, /x_offset/i, /horizontal.*deviation/i]);
    const normalizedError = explicitError !== undefined
      ? (explicitError <= 1 ? explicitError * 100 : explicitError)
      : Math.max(Math.abs(deltaY ?? 0), Math.abs(deltaX ?? 0)) * 100;
    const errorRate = Math.max(0, Math.min(100, normalizedError));
    setPoseErrorRate(errorRate);

    if (errorRate <= 8) {
      setPoseFeedbackLevel("good");
      setPoseFeedback("현재 자세가 안정적입니다. 시선과 어깨 위치를 그대로 유지하세요.");
    } else if (deltaY !== undefined && Math.abs(deltaY) >= Math.abs(deltaX ?? 0)) {
      setPoseFeedbackLevel("adjust");
      setPoseFeedback(deltaY > 0
        ? "상체가 기준보다 아래에 있습니다. 허리를 세우고 얼굴과 어깨를 조금 올려 주세요."
        : "상체가 기준보다 위에 있습니다. 어깨의 힘을 빼고 앉은 위치를 조금 낮춰 주세요.");
    } else if (deltaX !== undefined) {
      setPoseFeedbackLevel("adjust");
      setPoseFeedback(deltaX > 0
        ? "몸이 기준보다 오른쪽에 있습니다. 상체를 화면 중앙 쪽으로 조금 옮겨 주세요."
        : "몸이 기준보다 왼쪽에 있습니다. 상체를 화면 중앙 쪽으로 조금 옮겨 주세요.");
    } else {
      setPoseFeedbackLevel("adjust");
      setPoseFeedback("기준 자세와 차이가 큽니다. 허리를 세우고 양쪽 어깨가 수평이 되도록 몸의 흔들림을 줄여 주세요.");
    }
  };

  useEffect(() => {
    sessionStorage.setItem("visionSessionId", sessionIdRef.current);
  }, []);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    let disposed = false;
    let audioContext: AudioContext | null = null;
    let animationFrame = 0;
    let ambientTimer = 0;
    let ambientCollecting = true;
    const ambientSamples: number[] = [];

    const checkNetwork = async () => {
      if (!navigator.onLine) return setNetOk(false);
      try {
        await visionApi.probe();
        setNetOk(true);
      } catch {
        setNetOk(false);
      }
    };
    const handleOnline = () => void checkNetwork();
    const handleOffline = () => setNetOk(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    void checkNetwork();

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (disposed) { stream.getTracks().forEach(track => track.stop()); return; }
        mediaStream = stream;
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            const hasVideo = Boolean(videoRef.current?.videoWidth && videoRef.current?.videoHeight);
            setCameraOk(hasVideo && videoTrack?.readyState === "live");
            setVisionStatus(hasVideo ? "카메라 영상 확인 완료" : "카메라 영상을 확인할 수 없습니다");
          };
        }
        setMicOk(Boolean(audioTrack && audioTrack.readyState === "live" && audioTrack.enabled));

        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.65;
        source.connect(analyser);
        const samples = new Uint8Array(analyser.fftSize);

        const measureAudio = () => {
          analyser.getByteTimeDomainData(samples);
          let sumSquares = 0;
          for (const value of samples) {
            const normalized = (value - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / samples.length);
          const decibels = 20 * Math.log10(Math.max(rms, 0.00001));
          const level = Math.max(0, Math.min(100, ((decibels + 60) / 60) * 100));
          setMicLevel(level);
          if (ambientCollecting) ambientSamples.push(level);
          animationFrame = requestAnimationFrame(measureAudio);
        };
        measureAudio();

        ambientTimer = window.setTimeout(() => {
          ambientCollecting = false;
          const average = ambientSamples.length
            ? ambientSamples.reduce((sum, value) => sum + value, 0) / ambientSamples.length
            : 100;
          setAmbientLevel(Math.round(average));
          setNoiseOk(average < 35);
        }, 3000);
      })
      .catch(() => {
        if (disposed) return;
        setCameraOk(false);
        setMicOk(false);
        setVisionStatus("카메라·마이크 권한을 허용해 주세요");
      });

    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearTimeout(ambientTimer);
      cancelAnimationFrame(animationFrame);
      void audioContext?.close();
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const runTest = async () => {
    if (testing || !cameraOk) return;
    setTesting(true);
    setCalibrationReady(false);
    setCalibrationFinalized(false);
    setCalibrationMetrics([]);
    setVisionStatus("5초 캘리브레이션 준비 중");
    try {
      await visionApi.probe();
      setNetOk(true);
      if (!videoRef.current) throw new Error("카메라를 찾을 수 없습니다.");
      let acceptedFrames = 0;
      for (let index = 0; index < 10; index += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        const frame = await captureVideoFrame(videoRef.current);
        const result = await visionApi.calibrateFrame(sessionIdRef.current, frame);
        // 일부 서버 응답은 HTTP 200이어도 success 필드를 생략한다.
        // request()가 2xx 응답만 반환하므로 명시적인 실패가 아니면 유효 프레임으로 센다.
        if (result?.success !== false) {
          acceptedFrames += 1;
        }
        const metrics = extractCalibrationMetrics(result);
        if (metrics.length > 0) setCalibrationMetrics(metrics);
        setVisionStatus("캘리브레이션 중입니다. 자세를 유지해 주세요.");
      }
      if (acceptedFrames === 0) throw new Error("기준값으로 사용할 수 있는 프레임이 없습니다.");
      setVisionStatus("자세 기준값 확정 및 check 요청 중");
      const finalized = await visionApi.finalizeCalibration(sessionIdRef.current);
      if (finalized?.success === false) {
        throw new Error(typeof finalized?.reason === "string" ? finalized.reason : "자세 기준값을 확정하지 못했습니다.");
      }
      setCalibrationFinalized(true);

      console.info("[장비 테스트] 기준값 확정 완료 · 프레임별 자세 check 시작");
      let poseCheckResult: Record<string, unknown> | null = null;
      for (let index = 0; index < 10; index += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        const checkFrame = await captureVideoFrame(videoRef.current);
        try {
          poseCheckResult = await visionApi.checkPose(sessionIdRef.current, checkFrame);
          updatePoseFeedback(poseCheckResult);
          console.info(`[장비 테스트] 확정 후 프레임 ${index + 1}/10 자세 check`, {
            yValues: findYValues(poseCheckResult),
            numericValues: findNumericValues(poseCheckResult),
            data: poseCheckResult,
          });
          console.info(
            `[장비 테스트 RAW] 프레임 ${index + 1}/10 /vision/check\n${JSON.stringify(poseCheckResult, null, 2)}`,
          );
        } catch (checkError) {
          console.error(`[장비 테스트] 확정 후 프레임 ${index + 1}/10 자세 check 실패`, checkError);
        }
      }

      const gazeFrame = await captureVideoFrame(videoRef.current);
      let visionCheckResult: Record<string, unknown> | null = null;
      try {
        visionCheckResult = await visionApi.checkGaze(sessionIdRef.current, gazeFrame);
        console.info("[장비 테스트] 시선 check (/vision/gaze-check) 결과", visionCheckResult);
      } catch (gazeError) {
        console.error("[장비 테스트] 시선 check (/vision/gaze-check) 실패", gazeError);
      }
      const checkMetrics = [
        ...extractCalibrationMetrics(poseCheckResult),
        ...extractCalibrationMetrics(visionCheckResult),
      ].slice(0, 6);
      if (checkMetrics.length > 0) setCalibrationMetrics(checkMetrics);
      setCalibrationReady(true);
      setVisionStatus("장비 테스트 완료");
    } catch (error) {
      setVisionStatus(error instanceof Error ? error.message : "Vision API 연결에 실패했습니다.");
    } finally {
      setTesting(false);
    }
  };

  const startInterview = async () => {
    if (!calibrationReady) {
      setVisionStatus("먼저 5초 캘리브레이션을 완료해 주세요.");
      return;
    }
    setTesting(true);
    setVisionStatus("면접 화면 준비 중");
    try {
      if (!calibrationFinalized) {
        const result = await visionApi.finalizeCalibration(sessionIdRef.current);
        if (result?.success === false) {
          throw new Error(typeof result?.reason === "string" ? result.reason : "자세 기준값을 확정하지 못했습니다.");
        }
      }
      setVisionStatus("자세 기준값 확정 완료");
      onNavigate("interview");
    } catch (error) {
      setVisionStatus(error instanceof Error ? error.message : "캘리브레이션 확정에 실패했습니다.");
    } finally {
      setTesting(false);
    }
  };

  const checks = [
    { label: "카메라", ok: cameraOk, icon: Camera },
    { label: "마이크", ok: micOk, icon: Mic },
    { label: "주변 소음", ok: noiseOk, icon: Volume2 },
    { label: "인터넷 연결", ok: netOk, icon: Wifi },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 text-center">
          <Badge color="mint">STEP 2</Badge>
          <h1 className="text-4xl font-bold text-foreground mt-3">장비를 테스트하세요</h1>
          <p className="text-muted-foreground mt-2">원활한 면접을 위해 카메라와 마이크를 확인합니다.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Camera Preview */}
          <Card className="p-5 rounded-[2rem]">
            <div className="flex items-center justify-between gap-3 mb-3"><h3 className="font-bold text-foreground">카메라 미리보기</h3>
              <PrimaryButton size="sm" onClick={startWithoutCamera} disabled={testing}>
                <CameraOff size={16}/>웹캠 끄고 면접 진행하기
              </PrimaryButton>
            </div>
            <div className="relative aspect-video min-h-[420px] bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-48 border-2 border-primary/60 rounded-full opacity-60" />
                <div className="absolute w-32 h-32 border border-primary/40 rounded-full" />
                <div className="absolute">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-primary absolute -top-16 -left-16" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-primary absolute -top-16 -right-16" />
                  <div className="w-4 h-4 border-b-2 border-l-2 border-primary absolute top-8 -left-16" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-primary absolute top-8 -right-16" />
                </div>
              </div>
              {!cameraOk && <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
                  <Users className="w-10 h-10 text-slate-400" />
                </div>
                <span className="text-slate-400 text-xs">카메라 권한 허용 후 표시됩니다</span>
              </div>}
              <div className="absolute bottom-3 right-3">
                <Badge color={cameraOk ? "green" : "red"}>{cameraOk ? "카메라 정상" : "확인 중"}</Badge>
              </div>
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 rounded-lg px-2 py-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white text-xs">LIVE</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">{visionStatus}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              {calibrationMetrics.filter(metric => !["유효 프레임", "수집 프레임", "진행률"].includes(metric.label)).map((metric) => (
                <div key={metric.label} className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground truncate" title={metric.label}>{metric.label}</p>
                  <p className="text-sm font-bold text-foreground">{formatMetricValue(metric.label, metric.value)}</p>
                </div>
              ))}
            </div>
            <div className={`mt-3 rounded-2xl border p-4 ${poseFeedbackLevel === "good" ? "bg-emerald-50 border-emerald-200" : poseFeedbackLevel === "adjust" ? "bg-amber-50 border-amber-200" : "bg-muted/50 border-border"}`}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="font-bold text-foreground flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> 사용자 자세 가이드</p>
                <Badge color={poseFeedbackLevel === "good" ? "green" : poseFeedbackLevel === "adjust" ? "orange" : "gray"}>
                  오차율 {poseErrorRate === null ? "측정 전" : `${poseErrorRate.toFixed(1)}%`}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{poseFeedback}</p>
            </div>
          </Card>

          {/* Status Checks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-bold text-foreground mb-3">장비 상태</h3>
              <div className="grid grid-cols-2 gap-3">
                {checks.map((c) => (
                  <div key={c.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.ok ? "bg-emerald-50" : "bg-red-50"}`}>
                      <c.icon className={`w-4 h-4 ${c.ok ? "text-emerald-500" : "text-red-500"}`} />
                    </div>
                    <span className="font-medium text-foreground flex-1">{c.label}</span>
                    {testing ? (
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    ) : c.ok ? (
                      <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">정상</span></div>
                    ) : (
                      <div className="flex items-center gap-1.5"><AlertCircle className="w-4 h-4 text-red-500" /><span className="text-xs text-red-600 font-medium">오류</span></div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-bold text-foreground mb-3">마이크 음량 테스트</h3>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-100"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">실제 마이크 입력입니다. 주변 소음 측정값: {ambientLevel}% · 처음 3초 동안 조용히 있어주세요.</p>
            </Card>
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <PrimaryButton onClick={runTest} disabled={testing || !cameraOk}>
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {calibrationReady ? "다시 캘리브레이션" : "5초 캘리브레이션 시작"}
          </PrimaryButton>
          <div className="flex gap-3">
            <SecondaryButton onClick={() => onNavigate("job-select")}>이전</SecondaryButton>
            <PrimaryButton onClick={startInterview} disabled={!calibrationReady || testing}>
              면접 시작 <ChevronRight className="w-5 h-5" />
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 5. Interview Screen
// ────────────────────────────────────────────────────────────

function InterviewScreen({ onNavigate, initialCameraOff = false }: { onNavigate: (s: Screen) => void; initialCameraOff?: boolean }) {
  const [phase, setPhase] = useState<"prep" | "answering" | "followup-loading" | "followup">("prep");
  const [qIdx, setQIdx] = useState(0);
  const [camOff, setCamOff] = useState(initialCameraOff);
  const [guide, setGuide] = useState(true);
  const [timer, setTimer] = useState(30);
  const [recording, setRecording] = useState(false);
  const [poseStatus, setPoseStatus] = useState("자세 분석 대기");
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionIdRef = useRef(sessionStorage.getItem("visionSessionId") ?? `interview-${crypto.randomUUID()}`);
  const gazeSamplesRef = useRef<boolean[]>([]);
  const answerActiveRef = useRef(false);
  const answerSummariesRef = useRef<Record<string, unknown>[]>([]);
  const visionIntervalRef = useRef<number | null>(null);
  const camOffRef = useRef(camOff);

  useEffect(() => {
    camOffRef.current = camOff;
  }, [camOff]);

  const questions = [
    "자기소개를 해주세요. 본인의 핵심 역량을 중심으로 간단히 말씀해 주세요.",
  ];

  const stopVisionTracking = () => {
    if (visionIntervalRef.current !== null) {
      window.clearInterval(visionIntervalRef.current);
      visionIntervalRef.current = null;
    }
  };

  const checkCurrentFrame = async () => {
    if (camOffRef.current || !videoRef.current) return;
    try {
      const frame = await captureVideoFrame(videoRef.current);
      const poseResult = await visionApi.checkPose(sessionIdRef.current, frame);
      const gazeResult = await visionApi.checkGaze(sessionIdRef.current, frame);
      if (typeof gazeResult?.looking_at_camera === "boolean") {
        gazeSamplesRef.current.push(gazeResult.looking_at_camera);
      }
      if (poseResult?.success === true && gazeResult?.success === true) {
        setPoseStatus("자세 확인됨");
      } else {
        setPoseStatus("자세 또는 시선 분석 실패 응답");
      }
    } catch (error) {
      setPoseStatus(error instanceof Error ? error.message : "자세 분석 실패");
    }
  };

  const runVisionTracking = async () => {
    if (!answerActiveRef.current) return;
    await checkCurrentFrame();
    if (!answerActiveRef.current) return;
    visionIntervalRef.current = window.setTimeout(() => void runVisionTracking(), 3000);
  };

  const startVisionTracking = () => {
    stopVisionTracking();
    void runVisionTracking();
  };

  const finishAnswer = async () => {
    if (!answerActiveRef.current) return;
    answerActiveRef.current = false;
    stopVisionTracking();
    setRecording(false);
    setPhase("followup-loading");
    try {
      const summary = await visionApi.summarizeAnswer(sessionIdRef.current);
      answerSummariesRef.current.push({
        questionIndex: qIdx,
        vision: summary,
      });
    } catch (error) {
      setPoseStatus(error instanceof Error ? error.message : "답변 분석 요청 실패");
    } finally {
      window.setTimeout(() => setPhase("followup"), 2000);
    }
  };

  useEffect(() => {
    if (phase !== "answering") return;
    setRecording(true);
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          void finishAnswer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    let disposed = false;
    if (camOff) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setPoseStatus("카메라 권한과 브라우저 지원을 확인해 주세요");
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (disposed) { stream.getTracks().forEach(track => track.stop()); return; }
        mediaStream = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPoseStatus("카메라 연결 완료 · 자세 분석 대기");
      })
      .catch(() => { if (!disposed) setPoseStatus("카메라 권한을 확인해 주세요"); });
    return () => { disposed = true; mediaStream?.getTracks().forEach((track) => track.stop()); };
  }, [camOff]);

  useEffect(() => () => stopVisionTracking(), []);

  const handleStart = async () => {
    if (answerActiveRef.current) return;
    answerActiveRef.current = true;
    setPhase("answering");
    setTimer(90);
    startVisionTracking();
    try {
      await visionApi.startAnswer(sessionIdRef.current);
    } catch (error) {
      console.warn("[Vision API] 답변 시작 기록은 실패했지만 프레임 분석은 계속합니다.", error);
      setPoseStatus("답변 시작 기록 실패 · 자세 분석은 계속 진행 중");
    }
  };
  const handleDone = () => { void finishAnswer(); };
  const handleNext = async () => {
    if (qIdx >= questions.length - 1) {
      const gazeSamples = gazeSamplesRef.current;
      const gazeStability = gazeSamples.length
        ? Math.round((gazeSamples.filter(Boolean).length / gazeSamples.length) * 100)
        : null;
      let visionSession = null;
      try {
        visionSession = await visionApi.endSession(sessionIdRef.current);
      } catch (error) {
        setPoseStatus(error instanceof Error ? error.message : "세션 종료 요청 실패");
      }
      sessionStorage.setItem("interviewAnalysis", JSON.stringify({
        gazeStability,
        answerSummaries: answerSummariesRef.current,
        visionSession,
      }));
      const entry = { id: crypto.randomUUID(), date: new Date().toISOString(), title: "맞춤형 모의면접", analysis: { gazeStability, visionSession, answerSummaries: answerSummariesRef.current } };
      localStorage.setItem("iv-history", JSON.stringify([entry, ...readLocal("iv-history", [])]));
      sessionStorage.setItem("iv-current-id", entry.id);
      onNavigate("analyzing");
      return;
    }
    setQIdx(q => q + 1); setPhase("prep"); setTimer(30);
  };

  const progress = ((qIdx) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-[#f3fbfa] flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-border bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">질문</span>
            <span className="font-bold text-foreground">{qIdx + 1}</span>
            <span className="text-muted-foreground text-sm">/ {questions.length}</span>
          </div>
          <div className="w-40 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {recording && (
            <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-medium">REC</span>
            </div>
          )}
          <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1 ${phase === "prep" ? "bg-amber-500/20 border border-amber-500/30" : "bg-primary/20 border border-primary/30"}`}>
            <Clock className={`w-3.5 h-3.5 ${phase === "prep" ? "text-amber-400" : "text-primary"}`} />
            <span className={`text-xs font-bold font-mono ${phase === "prep" ? "text-amber-600" : "text-primary"}`}>
              {String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col gap-4 p-4 sm:p-6">
        {/* AI Interviewer */}
        <div className="flex flex-col gap-3 order-1">
          <Card className="bg-white border-primary/20 p-5 sm:p-6 flex flex-col rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent border border-primary/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-foreground font-semibold text-sm">AI 면접관</div>
                <div className="text-muted-foreground text-xs">선택 직무 맞춤 질문</div>
              </div>
              {phase === "prep" && <Badge color="mint">준비 시간</Badge>}
              {phase === "answering" && <Badge color="orange">답변 중</Badge>}
              {phase === "followup-loading" && <Badge color="gray">꼬리질문 생성 중</Badge>}
              {phase === "followup" && <Badge color="navy">꼬리질문</Badge>}
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {phase === "followup-loading" ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-muted-foreground text-sm">답변을 분석해 꼬리질문을 생성하고 있습니다...</p>
                </div>
              ) : phase === "followup" ? (
                <div>
                  <div className="bg-muted rounded-xl p-4 mb-4">
                    <p className="text-muted-foreground text-xs mb-2">이전 답변 키워드</p>
                    <div className="flex flex-wrap gap-2">
                      {["React", "TypeScript", "팀 협업", "성능 최적화"].map(k => (
                        <span key={k} className="bg-primary/20 text-primary text-xs rounded-lg px-2 py-1">{k}</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-foreground text-xl font-bold leading-relaxed">
                    성능 최적화를 진행하면서 구체적으로 어떤 지표를 측정했고, 결과는 얼마나 개선되었나요?
                  </p>
                </div>
              ) : (
                <p className="text-foreground text-lg sm:text-xl font-bold leading-relaxed text-center">{questions[qIdx]}</p>
              )}
            </div>

            {phase === "prep" && (
              <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-600 text-xs">답변을 준비하세요. 준비가 되면 "답변 시작" 버튼을 누르세요.</p>
              </div>
            )}
          </Card>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button aria-label={camOff ? "카메라 켜기" : "카메라 끄기"} onClick={() => setCamOff(!camOff)}
              className={`p-3 rounded-xl border transition-all ${camOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>
              {camOff ? <CameraOff className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            </button>

            {phase === "prep" && (
              <PrimaryButton onClick={handleStart} size="lg" className="px-10">
                <Radio className="w-5 h-5" /> 답변 시작
              </PrimaryButton>
            )}
            {phase === "answering" && (
              <PrimaryButton onClick={handleDone} size="lg" className="px-10 bg-emerald-500 hover:bg-emerald-600">
                <Check className="w-5 h-5" /> 답변 완료
              </PrimaryButton>
            )}
            {phase === "followup" && (
              <PrimaryButton onClick={handleNext} size="lg" className="px-10">
                {qIdx >= questions.length - 1 ? "면접 종료" : "다음 질문"} <ChevronRight className="w-5 h-5" />
              </PrimaryButton>
            )}
          </div>
        </div>

        <div className="interview-layout order-2">
          <div className={`interview-stage ${phase !== "prep" ? "is-answering" : ""}`}>
            <div className="interviewer-placeholder"><span>AI 면접관</span></div>
            <div className="stage-label"><span className="live-dot" />{phase === "prep" ? "나의 화면 · 준비 중" : "AI 면접관"}</div>
            <div className="self-camera">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              {(camOff || poseStatus.includes("권한")) && <div className="camera-empty"><CameraOff /><p>{camOff ? "카메라 꺼짐" : "카메라 권한을 허용해 주세요"}</p></div>}
              {guide && <div className="pose-grid" />}
              <span className="self-label">나의 화면</span>
            </div>
            <button className="guide-toggle" onClick={() => setGuide(!guide)} aria-pressed={guide}>자세 가이드 <strong>{guide ? "ON" : "OFF"}</strong></button>
            <div className="stage-status"><Activity size={16}/>{phase === "prep" ? "준비가 되면 답변을 시작하세요" : recording ? "면접이 진행 중입니다." : "답변이 완료되었습니다."}</div>
          </div>
          <Card className="p-5 feedback-panel">
            <div className="flex justify-between items-center mb-5"><h2 className="font-bold text-lg">실시간 피드백</h2><Badge>{recording ? "LIVE" : "대기"}</Badge></div>
            {[{title:"자세", items:["어깨", "등 / 상체", "얼굴 위치"]}, {title:"시선", items:["시선 방향", "시선 안정성"]}].map(group => <div key={group.title} className="mb-4"><h3 className="font-bold mb-2 flex gap-2 items-center"><Eye size={16} className="text-primary"/>{group.title}</h3><div className="rounded-xl border border-border px-3">{group.items.map(label => <div key={label} className="flex gap-3 items-center py-3 border-b border-border last:border-0"><div className="rounded-full p-2 bg-accent text-primary"><Activity size={16}/></div><div className="flex-1"><p className="text-sm font-bold">{label}</p><p className="text-xs text-muted-foreground mt-1">{recording ? "분석 결과를 확인하고 있어요" : "답변 시작 후 측정합니다"}</p></div><Badge color="gray">{recording ? "측정 중" : "대기"}</Badge></div>)}</div></div>)}
            <p role="status" className="text-xs text-muted-foreground mb-3 break-words">{poseStatus}</p>
            <div className="rounded-xl bg-accent/60 p-3 text-primary text-xs leading-relaxed"><strong className="flex gap-2 mb-1"><Star size={14}/>TIP</strong>답변할 땐 말하고, 핵심 내용을 구조적으로 전달해 보세요.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 6. Analyzing Screen
// ────────────────────────────────────────────────────────────

function AnalyzingScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
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

  const overall = Math.round(progress.reduce((a, b) => a + b, 0) / steps.length);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6 relative">
            <Activity className="w-10 h-10 text-primary" />
            <div className="absolute inset-0 rounded-2xl border-2 border-primary border-t-transparent animate-spin opacity-40" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">면접 데이터를 분석 중입니다</h1>
          <p className="text-muted-foreground mt-2 text-sm">AI가 답변과 영상을 분석해 맞춤형 피드백을 생성합니다.</p>
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
                    <span className="text-sm font-medium text-foreground">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {progress[i] >= 100 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : progress[i] > 0 ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(progress[i])}%</span>
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

// ────────────────────────────────────────────────────────────
// 7. Dashboard Screen
// ────────────────────────────────────────────────────────────

function DashboardScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const storedAnalysis = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("interviewAnalysis") ?? "{}") as {
        gazeStability?: number | null;
        visionSession?: Record<string, unknown> | null;
      };
    } catch {
      return {};
    }
  })();

  const findNumber = (value: unknown, keys: string[]): number | null => {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (typeof record[key] === "number" && Number.isFinite(record[key])) return record[key];
    }
    for (const nested of Object.values(record)) {
      const found = findNumber(nested, keys);
      if (found !== null) return found;
    }
    return null;
  };

  const postureMovementPercent = findNumber(storedAnalysis.visionSession, ["posture_movement_percent"]);
  const gazeMovementPercent = findNumber(storedAnalysis.visionSession, ["gaze_movement_percent"]);
  const postureStability = postureMovementPercent === null ? null : Math.round(100 - Math.max(0, Math.min(100, postureMovementPercent)));
  const gazeStability = gazeMovementPercent === null
    ? storedAnalysis.gazeStability ?? null
    : Math.round(100 - Math.max(0, Math.min(100, gazeMovementPercent)));
  const scores = [
    { label: "답변 내용", score: null, color: "#0fa99e" },
    { label: "자세 안정성", score: postureStability, color: "#34d399" },
    { label: "시선 안정성", score: gazeStability, color: "#0d9489" },
    { label: "직무 연관성", score: null, color: "#6ee7b7" },
  ];

  const measuredScores = scores.flatMap((item) => typeof item.score === "number" ? [item.score] : []);
  const overall = measuredScores.length
    ? Math.round(measuredScores.reduce((sum, score) => sum + score, 0) / measuredScores.length)
    : null;

  const barData = scores.flatMap((item) => typeof item.score === "number"
    ? [{ name: item.label, value: item.score, fill: item.color }]
    : []);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-wrap gap-4 items-start justify-between mb-8">
          <div>
            <Badge color="mint">면접 완료</Badge>
            <h1 className="text-3xl font-bold text-foreground mt-2">AI 면접 분석 결과</h1>
            <p className="text-muted-foreground mt-1 text-sm">API 연결 테스트 면접 · 1개 질문</p>
            {(postureMovementPercent !== null || gazeMovementPercent !== null) && (
              <p className="text-primary mt-2 text-sm font-semibold">
                전체 평균 이동 비율 · 자세 {postureMovementPercent?.toFixed(1) ?? "—"}% · 시선 {gazeMovementPercent?.toFixed(1) ?? "—"}%
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => onNavigate("interview")} size="sm">
              <RotateCcw className="w-4 h-4" /> 다시 면접
            </SecondaryButton>
            <PrimaryButton onClick={() => { saveReport(storedAnalysis); onNavigate("reports"); }} size="sm">
              <Download className="w-4 h-4" /> 결과 저장
            </PrimaryButton>
          </div>
        </div>

        <div className="analysis-summary">
          <Card className="p-6 text-center"><h2 className="text-left font-bold text-lg mb-5">종합 평가</h2><PercentRing value={overall} large/><p className="mt-5 font-semibold">{overall === null ? "분석 결과를 기다리고 있어요" : "측정된 항목을 바탕으로 산출했어요"}</p><p className="text-sm text-muted-foreground mt-2">세부 항목을 확인하고 개선해 보세요!</p></Card>
          <Card className="p-6"><h2 className="font-bold text-lg mb-5">항목별 퍼센테이지</h2><div className="grid grid-cols-2 sm:grid-cols-4 gap-6">{scores.map((item, index) => <div className="text-center" key={item.label}><PercentRing value={item.score}/><h3 className="font-bold mt-4">{item.label}</h3><p className="text-sm text-muted-foreground leading-relaxed mt-2">{item.score === null ? "분석 데이터가 아직 없습니다." : index === 1 ? "면접 중 상체 움직임을 바탕으로 측정합니다." : "카메라 응시 데이터를 바탕으로 측정합니다."}</p></div>)}</div><p className="mt-7 p-3 rounded-xl bg-muted/60 text-sm text-muted-foreground">ⓘ 퍼센테이지는 AI 측정값을 기반으로 산출되며, 참고 지표로 활용해 주세요.</p></Card>
        </div>
        <Card className="p-5 mb-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold">개선점 피드백</h2><p className="text-sm text-muted-foreground mt-2">{overall === null ? "분석이 완료되면 개선 포인트가 표시됩니다." : "자세와 시선 수치를 확인하고 다음 면접에서 연습해 보세요."}</p></div><SecondaryButton onClick={() => onNavigate("tips")}><BookOpen size={18}/>면접 TIP 조회</SecondaryButton></div></Card>
        <button onClick={() => onNavigate("question-analysis")}
          className="w-full flex items-center justify-between p-5 rounded-2xl border border-primary/20 bg-card hover:border-primary/50 hover:bg-accent/20 transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <span className="font-bold text-foreground">질문별 상세 분석</span>
              <p className="text-xs text-muted-foreground mt-0.5">각 질문의 답변과 평가를 확인하세요</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
        <div className="grid grid-cols-1 gap-4 mt-5">
          <SecondaryButton onClick={() => onNavigate("reports")} className="justify-between p-5"><span className="text-left"><span className="block font-bold">리포트 목록 조회</span><span className="block text-xs text-muted-foreground mt-1">목록에서 리포트를 선택해 상세 결과 확인</span></span><BarChart3 className="w-5 h-5 text-primary"/></SecondaryButton>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 8. Question Analysis Screen
// ────────────────────────────────────────────────────────────

function QuestionAnalysisScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [activeQ, setActiveQ] = useState(0);
  const questions = [
    {
      q: "자기소개를 해주세요. 본인의 핵심 역량과 지원 동기를 중심으로 말씀해 주세요.",
      answer: "안녕하세요. 저는 3년간 프론트엔드 개발을 공부해온 홍길동입니다. React와 TypeScript를 주로 사용했으며, 사이드 프로젝트에서 사용자 경험 개선을 위해 렌더링 성능을 40% 향상시킨 경험이 있습니다. 귀사의 사용자 중심 개발 문화에 깊이 공감하여 지원하게 되었습니다.",
      scores: { fit: 85, logic: 78, specific: 82, relevance: 90 },
      strengths: ["직무 관련 기술 스택을 명확히 제시했습니다", "수치(40%)를 활용해 성과를 구체화했습니다"],
      improvements: ["지원 동기가 다소 일반적입니다. 회사의 특정 제품이나 기술에 대한 언급을 추가하세요"],
    },
    {
      q: "개발 프로젝트에서 가장 어려웠던 기술적 문제와 해결 과정을 설명해 주세요.",
      answer: "팀 프로젝트에서 대용량 데이터 렌더링 시 브라우저 프리징 문제가 발생했습니다. 원인을 분석한 결과 DOM 노드 과다 생성이 문제였고, 가상 스크롤을 도입해 해결했습니다. 결과적으로 FCP가 3.2초에서 0.8초로 75% 개선되었습니다.",
      scores: { fit: 88, logic: 92, specific: 95, relevance: 87 },
      strengths: ["STAR 구조가 명확하게 적용되었습니다", "구체적인 수치(FCP 75% 개선)로 결과를 제시했습니다", "기술 문제 해결 역량을 잘 보여줍니다"],
      improvements: ["해결 과정에서 겪은 시행착오나 대안 검토 과정을 추가하면 더 설득력 있습니다"],
    },
  ];

  const scoreColor = (score: number) => score >= 90 ? "#059669" : score >= 80 ? "#2563eb" : score >= 70 ? "#d97706" : "#dc2626";
  const q = questions[activeQ];
  const averageScore = Math.round(Object.values(q.scores).reduce((a, b) => a + b, 0) / 4);

  return (
    <div className="min-h-screen bg-[#f7faf9] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => onNavigate("dashboard")} className="text-sm text-muted-foreground hover:text-primary mb-6 flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> 결과 <span className="mx-1">/</span> <strong className="text-foreground">질문별 분석</strong>
        </button>

        <div className="mb-6 rounded-2xl border border-border bg-white p-5"><Badge>예시 분석</Badge><p className="text-sm text-muted-foreground mt-3">Q1, Q2의 답변과 장단점을 보여주는 예시입니다.</p><div className="flex flex-wrap gap-4 text-sm font-semibold mt-3"><span className="text-emerald-600">90점 이상 · 우수</span><span className="text-blue-600">80–89점 · 양호</span><span className="text-amber-600">70–79점 · 보완</span><span className="text-red-600">70점 미만 · 연습 필요</span></div></div>
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
          <Card className="p-4 lg:sticky lg:top-6">
            <h2 className="font-bold text-foreground px-3 pt-2 pb-4">전체 질문 ({questions.length})</h2>
            <div className="space-y-2">
              {questions.map((item, i) => {
                const average = Math.round(Object.values(item.scores).reduce((a, b) => a + b, 0) / 4);
                return (
                  <button key={i} onClick={() => setActiveQ(i)} className={`w-full text-left rounded-2xl p-4 transition-all ${activeQ === i ? "bg-primary text-white shadow-sm" : "hover:bg-accent/40"}`}>
                    <div className="flex justify-between text-sm font-bold mb-2"><span>Q{i + 1}.</span><span className="rounded-lg bg-white px-2 py-0.5" style={{color: scoreColor(average)}}>{average}점</span></div>
                    <p className={`text-sm leading-snug line-clamp-2 ${activeQ === i ? "text-white/90" : "text-muted-foreground"}`}>{item.q}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6 sm:p-8">
              <div className="flex gap-6 justify-between items-start">
                <div><div className="text-sm font-bold text-primary mb-2">Q{activeQ + 1}.</div><h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">{q.q}</h1></div>
                <ScoreRing color={scoreColor(averageScore)} score={averageScore} label="/ 100" size={92} />
              </div>
              <div className="mt-7 rounded-2xl border border-border bg-muted/30 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-3"><Mic className="w-4 h-4" /> STT 변환 답변</div>
                <p className="text-foreground leading-relaxed">{q.answer}</p>
              </div>
            </Card>

            <Card className="p-6 sm:p-8 min-h-40">
              <h2 className="text-xl font-bold text-foreground">답변 평가</h2>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 border-emerald-200 bg-emerald-50/40">
                <h3 className="font-bold text-emerald-800 mb-3">장점</h3>
                {q.strengths.map((s) => <div key={s} className="flex items-start gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><p className="text-sm text-emerald-700">{s}</p></div>)}
              </Card>
              <Card className="p-6 border-amber-200 bg-amber-50/40">
                <h3 className="font-bold text-amber-800 mb-3">단점</h3>
                {q.improvements.map((s) => <div key={s} className="flex items-start gap-2 mb-2"><AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><p className="text-sm text-amber-700">{s}</p></div>)}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 9. Voice & Video Analysis Screen
// ────────────────────────────────────────────────────────────

function VoiceAnalysisScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const voiceMetrics = [
    { label: "말하기 속도", value: "138 wpm", sub: "권장 범위 120~160 wpm", status: "정상", color: "emerald" },
    { label: "평균 음량", value: "72 dB", sub: "권장 범위 65~80 dB", status: "정상", color: "emerald" },
    { label: "침묵 비율", value: "18.3%", sub: "전체 발화 시간 대비", status: "보통", color: "amber" },
    { label: "필러워드 횟수", value: "23회", sub: "약 12.1회/분 (목표 5회 이하)", status: "개선 필요", color: "red" },
  ];

  const gazeMetrics = [
    { label: "정면 응시율", value: "74.2%", sub: "권장 70% 이상", status: "정상", color: "emerald" },
    { label: "시선 이탈 횟수", value: "31회", sub: "평균 5.3회/분", status: "보통", color: "amber" },
    { label: "얼굴 중심 유지율", value: "88.5%", sub: "화면 중앙 기준 ±10%", status: "정상", color: "emerald" },
    { label: "눈 깜빡임 빈도", value: "22회/분", sub: "일반 평균 15~20회/분", status: "보통", color: "amber" },
  ];

  const fillerData = [
    { name: "어", value: 9 },
    { name: "음", value: 7 },
    { name: "그래서", value: 4 },
    { name: "아무튼", value: 2 },
    { name: "뭐", value: 1 },
  ];

  const statusColor: Record<string, string> = {
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
    amber: "text-amber-600 bg-amber-50 border-amber-200",
    red: "text-red-600 bg-red-50 border-red-200",
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button onClick={() => onNavigate("dashboard")} className="text-sm text-primary hover:underline mb-1 flex items-center gap-1">
            <ChevronRight className="w-4 h-4 rotate-180" /> 결과 대시보드로
          </button>
          <h1 className="text-2xl font-bold text-foreground">음성·영상 분석</h1>
          <p className="text-muted-foreground mt-1 text-sm">감정이나 인성을 판단하지 않고, 객관적인 수치 데이터만 제공합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" /> 음성 분석
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {voiceMetrics.map((m) => (
                <Card key={m.label} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground font-medium">{m.label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor[m.color]}`}>{m.status}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{m.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> 시선·영상 분석
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {gazeMetrics.map((m) => (
                <Card key={m.label} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted-foreground font-medium">{m.label}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor[m.color]}`}>{m.status}</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{m.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4">필러워드 분포</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fillerData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6b8e8c" }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#0d1f2d" }} width={40} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #d0f5f1", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "#f0faf9" }} />
                  <Bar dataKey="value" fill="#0fa99e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-foreground mb-4">시선 방향 분포 (정규화)</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                ["좌상", "18%", "상단", "9%", "우상", "7%"],
                ["좌", "11%", "정면", "74%", "우", "8%"],
                ["좌하", "5%", "하단", "3%", "우하", "2%"],
              ].map((row, ri) => (
                <div key={ri} className="contents">
                  {row.reduce<React.ReactNode[]>((acc, item, i) => {
                    if (i % 2 === 0) {
                      const dir = item;
                      const pct = row[i + 1];
                      const isCenter = dir === "정면";
                      acc.push(
                        <div key={dir} className={`p-2 rounded-lg text-center border ${isCenter ? "bg-primary/10 border-primary/30" : "bg-muted border-border"}`}>
                          <div className={`text-xs font-medium ${isCenter ? "text-primary" : "text-muted-foreground"}`}>{dir}</div>
                          <div className={`text-sm font-bold ${isCenter ? "text-primary" : "text-foreground"}`}>{pct}</div>
                        </div>
                      );
                    }
                    return acc;
                  }, [])}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">정면 응시율 74.2%는 권장 기준(70% 이상)을 충족합니다.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 10. Followup Flow Screen
// ────────────────────────────────────────────────────────────

function FollowupFlowScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const deficiencyColors: Record<string, string> = {
    "행동 부족": "bg-red-50 text-red-600 border-red-200",
    "결과 부족": "bg-orange-50 text-orange-600 border-orange-200",
    "역할 불명확": "bg-amber-50 text-amber-600 border-amber-200",
    "직무 연관성 부족": "bg-purple-50 text-purple-600 border-purple-200",
  };

  const flows = [
    {
      baseQ: "자기소개를 해주세요.",
      summary: "3년간 프론트엔드 개발 학습, React/TS 활용, 사이드 프로젝트에서 렌더링 최적화 경험",
      keywords: ["프론트엔드", "React", "TypeScript", "렌더링 최적화", "성능 개선"],
      deficiency: ["결과 부족", "직무 연관성 부족"],
      followup: "렌더링 최적화로 성능을 40% 개선했다고 하셨는데, 그 수치는 어떤 지표로 측정했으며 사용자에게 어떤 실질적인 영향을 미쳤나요?",
    },
    {
      baseQ: "팀 협업 경험을 말씀해 주세요.",
      summary: "GitHub 협업, 코드 리뷰 진행, 일정 내 기능 구현 완료",
      keywords: ["GitHub", "코드 리뷰", "협업", "일정 관리"],
      deficiency: ["행동 부족", "역할 불명확"],
      followup: "코드 리뷰 과정에서 팀원과 의견 충돌이 있었을 때, 본인이 구체적으로 어떤 행동을 했고 그 결과가 어땠는지 설명해 주시겠어요?",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7f6] py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button onClick={() => onNavigate("dashboard")} className="text-sm text-primary hover:underline mb-1 flex items-center gap-1">
            <ChevronRight className="w-4 h-4 rotate-180" /> 결과 대시보드로
          </button>
          <h1 className="text-2xl font-bold text-foreground">꼬리질문 생성 흐름</h1>
          <p className="text-muted-foreground mt-2">AI가 답변을 분석해 꼬리질문을 생성한 과정을 단계별로 보여드립니다.</p>
        </div>

        <div className="flex flex-col gap-8">
          {flows.map((f, i) => (
            <div key={i} className="rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-sm">
              {[
                { label: "기본 질문", content: <p className="text-lg font-bold text-foreground">{f.baseQ}</p> },
                { label: "답변 요약", content: <p className="text-muted-foreground leading-relaxed">{f.summary}</p> },
                { label: "핵심 키워드", content: <div className="flex flex-wrap gap-2">{f.keywords.map(k => <span key={k} className="bg-accent/50 text-primary border border-primary/20 text-sm font-semibold px-3 py-1 rounded-full">{k}</span>)}</div> },
                { label: "부족 요소 태그", content: <div className="flex flex-wrap gap-2">{f.deficiency.map(d => <span key={d} className={`text-sm font-semibold px-3 py-1 rounded-full border ${deficiencyColors[d]}`}>{d}</span>)}</div> },
              ].map((step, si) => (
                <div key={step.label}>
                  <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">{si + 1}</span>
                      <h2 className="font-bold text-muted-foreground">{step.label}</h2>
                    </div>
                    {step.content}
                  </div>
                  <div className="h-10 flex items-center justify-center"><ChevronDown className="w-5 h-5 text-primary/60" /></div>
                </div>
              ))}

              <div className="rounded-2xl bg-primary text-white p-6 sm:p-7 shadow-lg shadow-primary/15">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">5</span>
                  <h2 className="font-bold text-white/80">생성된 꼬리질문</h2>
                </div>
                <p className="text-lg sm:text-xl font-bold leading-relaxed">{f.followup}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Root App
// ────────────────────────────────────────────────────────────

function readLocal<T,>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
}
const EXAMPLE_REPORT = {
  id: "example-interview-report",
  title: "[예시] 프론트엔드 개발자 면접 리포트",
  date: "2026-09-07T05:00:00.000Z",
  analysis: {
    gazeStability: 86,
    visionSession: { posture_movement_percent: 24, gaze_movement_percent: 14 },
    strengths: ["답변 중 카메라를 바라보는 시선이 안정적으로 유지되었습니다."],
    weaknesses: ["답변 중 상체 움직임이 다소 많았습니다. 어깨에 힘을 빼고 편안한 자세를 유지해 보세요."],
  },
};
function getReports(): any[] {
  const saved = readLocal<any[]>("iv-reports", []);
  const history = readLocal<any[]>("iv-history", []);
  return [...saved, ...history.filter(item => !saved.some(report => report.id === item.id))]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
function saveReport(analysis: unknown) {
  const id = sessionStorage.getItem("iv-current-id") ?? "preview";
  const reports = readLocal<any[]>("iv-reports", []);
  const report = { id, title: "AI 면접 분석 리포트", date: new Date().toISOString(), analysis };
  localStorage.setItem("iv-reports", JSON.stringify([report, ...reports.filter(item => item.id !== id)]));
}
function PercentRing({ value, large = false }: { value: number | null; large?: boolean }) {
  return <div className={`percent-ring ${large ? "large" : ""}`} style={{background: `conic-gradient(#00a79e ${value ?? 0}%, #e3f1f0 0)`}}><div><strong>{value === null ? "—" : `${value}%`}</strong>{large && <span>종합 퍼센테이지</span>}</div></div>;
}
function ManagementScreen({ screen, onNavigate }: { screen: Screen; onNavigate: (s: Screen) => void }) {
  const [profile, setProfile] = useState(() => readLocal("iv-profile", {name:"", email:"", job:""}));
  const [editing, setEditing] = useState(screen === "profile-edit");
  const [notice, setNotice] = useState("");
  const [withdraw, setWithdraw] = useState(false);
  const [resumes, setResumes] = useState<any[]>(() => readLocal<any[]>("iv-resumes", []).slice(0, 1));
  const [draft, setDraft] = useState<any>(null);
  const [viewResume, setViewResume] = useState<any>(null);
  const reports = getReports();
  const entries = screen === "reports" || screen === "report-detail"
    ? [...reports.filter(item => item.id !== EXAMPLE_REPORT.id), EXAMPLE_REPORT]
    : reports;
  const selectedId = sessionStorage.getItem("iv-selected-report");
  const selected = selectedId ? entries.find(item => item.id === selectedId) : entries[0];
  const fieldClass = "w-full border border-border rounded-xl px-4 py-3 bg-white mt-2";
  const navigateReport = (entry: any, destination: Screen) => {
    sessionStorage.setItem("interviewAnalysis", JSON.stringify(entry.analysis ?? null));
    sessionStorage.setItem("iv-current-id", entry.id);
    sessionStorage.setItem("iv-selected-report", entry.id);
    onNavigate(destination);
  };
  return <main className="max-w-6xl mx-auto px-4 py-10 sm:py-14">
    {screen !== "tips" && <div className="flex flex-wrap gap-2 mb-9">{MY_SCREENS.map(item => <button key={item} onClick={() => { onNavigate(item); }} className={`px-4 py-2 rounded-full text-sm font-semibold ${(screen === item || (screen === "report-detail" && item === "reports")) ? "bg-primary text-white" : "bg-white border border-border text-muted-foreground"}`}>{SCREEN_LABELS[item]}</button>)}</div>}
    <Badge>{screen === "tips" ? "INTERVIEW TIP" : "MY IV-COACH"}</Badge><h1 className="text-3xl font-bold mt-3">{SCREEN_LABELS[screen]}</h1><p className="text-muted-foreground mt-3 mb-8">{screen === "tips" ? "더 나은 다음 면접을 위한 가이드를 만나보세요." : "나의 정보와 면접 준비 과정을 한곳에서 관리하세요."}</p>
    {notice && <p role="status" className="bg-accent rounded-xl p-4 mb-5 text-primary">{notice}</p>}
    {(screen === "profile" || screen === "profile-edit") && <Card className="p-6 sm:p-8 max-w-3xl"><div className="flex justify-between items-center mb-7"><h2 className="font-bold text-xl">기본 정보</h2><Badge>내 프로필</Badge></div><form onSubmit={event => {event.preventDefault(); try {localStorage.setItem("iv-profile",JSON.stringify(profile));setEditing(false);onNavigate("profile");} catch {setNotice("저장 공간이 부족합니다.");}}}><div className="grid sm:grid-cols-2 gap-6">{[{key:"name",label:"이름"},{key:"email",label:"이메일"},{key:"job",label:"희망 직무"}].map(({key,label}) => <label key={key} className="text-sm font-semibold">{label}{editing ? <input required={key !== "job"} type={key === "email" ? "email" : "text"} placeholder={readLocal("iv-profile", {name:"홍길동",email:"hong@example.com",job:"프론트엔드 개발자"})[key as keyof typeof profile] || {name:"홍길동",email:"hong@example.com",job:"프론트엔드 개발자"}[key as keyof typeof profile]} className={fieldClass} value={profile[key as keyof typeof profile]} onChange={e => setProfile({...profile,[key]:e.target.value})}/> : <p className="text-base mt-3 pb-3 border-b border-border">{profile[key as keyof typeof profile] || "등록된 정보가 없습니다"}</p>}</label>)}</div><div className="mt-8 flex gap-3">{editing ? <><button type="submit" className="bg-primary text-white rounded-xl px-6 py-3 font-semibold">저장</button><button type="button" onClick={() => {setProfile(readLocal("iv-profile", {name:"",email:"",job:""}));setEditing(false);onNavigate("profile");}} className="px-5">취소</button></> : <button type="button" onClick={() => onNavigate("profile-edit")} className="bg-primary text-white rounded-xl px-6 py-3 font-semibold">회원정보 수정</button>}</div></form>{editing && <div className="border-t border-border mt-8 pt-6 flex flex-col items-end"><button onClick={() => setWithdraw(true)} className="text-sm text-red-500">회원 탈퇴</button>{withdraw && <div role="alertdialog" aria-label="회원 탈퇴 확인" className="mt-4 w-full bg-red-50 p-5 rounded-xl"><p className="font-semibold">이 브라우저에 저장된 회원정보와 면접 자료를 삭제할까요?</p><p className="text-sm mt-2">삭제한 정보는 복구할 수 없습니다.</p><div className="flex gap-4 mt-4"><button onClick={() => setWithdraw(false)}>취소</button><button className="text-red-600 font-bold" onClick={() => { ["iv-profile","iv-history","iv-resumes","iv-reports"].forEach(key => localStorage.removeItem(key));["interviewAnalysis","interviewResume","iv-current-id","iv-selected-report","visionSessionId"].forEach(key => sessionStorage.removeItem(key));onNavigate("main");}}>탈퇴 및 데이터 삭제</button></div></div>}</div>}</Card>}
    {screen === "tips" && <Card className="py-24 text-center"><BookOpen className="mx-auto text-primary mb-5" size={40}/><h2 className="text-xl font-bold">등록된 면접 TIP이 없습니다</h2><p className="text-muted-foreground mt-3">새로운 TIP이 등록되면 이곳에서 확인할 수 있어요.</p><SecondaryButton className="mt-7" onClick={() => onNavigate("dashboard")}>분석 결과로 돌아가기</SecondaryButton></Card>}
    {(screen === "resumes" || screen === "resume-edit") && <><div className="flex justify-between items-center mb-5"><h2 className="font-bold">내 이력서</h2><PrimaryButton onClick={() => {setDraft(resumes[0] ? {...resumes[0]} : {id:crypto.randomUUID(),title:"",text:"",fields:{}});setViewResume(null);}}>{resumes.length ? "이력서 수정" : "이력서 등록"}</PrimaryButton></div>{draft ? <Card className="p-7"><form onSubmit={e => {e.preventDefault(); const fields=getResumeFields(draft); const text=resumeToText(fields); if (!draft.title.trim() || !text) {setNotice("이력서 제목과 한 개 이상의 항목을 작성해 주세요.");return;} const next=[{id:draft.id,title:draft.title.trim(),text,fields,date:new Date().toISOString()}];try {localStorage.setItem("iv-resumes",JSON.stringify(next));setResumes(next);setDraft(null);setNotice("이력서가 저장되었습니다.");}catch{setNotice("저장 공간이 부족합니다. 불필요한 데이터를 정리한 후 다시 시도해 주세요.");}}}><label className="font-semibold">이력서 제목<input required className={fieldClass} value={draft.title} onChange={e => setDraft({...draft,title:e.target.value})}/></label><div className="mt-7"><ResumeFormFields value={getResumeFields(draft)} onChange={fields => setDraft({...draft,fields})}/></div><div className="flex gap-4 mt-6"><button className="bg-primary text-white rounded-xl px-6 py-3" type="submit">저장</button><button type="button" onClick={() => setDraft(null)}>취소</button></div></form></Card> : viewResume ? <Card className="p-7"><h2 className="text-xl font-bold">{viewResume.title}</h2><p className="whitespace-pre-wrap my-6">{viewResume.text}</p><div className="flex flex-wrap gap-3 mt-7"><SecondaryButton onClick={() => setViewResume(null)}>목록</SecondaryButton><PrimaryButton onClick={() => {setDraft(viewResume);setViewResume(null);}}>이력서 수정</PrimaryButton><SecondaryButton onClick={() => {sessionStorage.setItem("interviewResume",JSON.stringify({text:viewResume.text,skipped:false}));onNavigate("job-select");}}>이 이력서로 면접 시작</SecondaryButton></div></Card> : resumes.length ? <div className="grid sm:grid-cols-2 gap-5">{resumes.map(r => <Card key={r.id} className="p-6"><FileText className="text-primary mb-4"/><h2 className="font-bold text-xl">{r.title}</h2><p className="text-sm text-muted-foreground my-3">수정일 {new Date(r.date).toLocaleDateString("ko-KR")}</p><SecondaryButton onClick={() => screen === "resume-edit" ? setDraft({...r}) : setViewResume(r)}>{screen === "resume-edit" ? "이력서 수정" : "이력서 조회"} <ChevronRight size={16}/></SecondaryButton></Card>)}</div> : <Card className="p-16 text-center text-muted-foreground">등록된 이력서가 없습니다. 첫 이력서를 등록해 보세요.</Card>}</>}
    {screen === "history" && <Card className="p-6">
      <div className="flex justify-between mb-6"><h2 className="font-bold">전체 {entries.length}건</h2><Badge>INTERVIEWS</Badge></div>
      {entries.length ? entries.map(entry => <div key={entry.id} className="flex flex-wrap gap-4 items-center justify-between border-t border-border py-5">
        <div><h3 className="font-bold">{entry.title}</h3><p className="text-sm text-muted-foreground mt-2">{new Date(entry.date).toLocaleString("ko-KR")} · 질문 1개</p></div>
        <SecondaryButton onClick={() => navigateReport(entry, "dashboard")}>분석 결과 조회<ChevronRight size={16}/></SecondaryButton>
      </div>) : <div className="text-center py-16"><FileText size={36} className="mx-auto mb-4 text-primary"/><h2 className="font-bold text-xl">완료한 면접이 없습니다</h2><p className="text-muted-foreground mt-3">첫 면접을 시작해 나의 성장 기록을 남겨보세요.</p><PrimaryButton className="mt-6" onClick={() => onNavigate("job-select")}>면접 시작</PrimaryButton></div>}
    </Card>}
    {screen === "reports" && <section aria-label="리포트 목록">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6"><h2 className="font-bold">전체 {entries.length}건</h2><SecondaryButton onClick={() => onNavigate("tips")}><BookOpen size={18}/>면접 TIP</SecondaryButton></div>
      <div className="space-y-6">{entries.map(entry => <Card key={entry.id} className="p-6 sm:p-8">
        <Badge>{entry.id === EXAMPLE_REPORT.id ? "예시 리포트" : "REPORT"}</Badge>
        <h2 className="text-xl sm:text-2xl font-bold mt-4">{entry.title}</h2>
        <p className="text-sm text-muted-foreground mt-3">{new Date(entry.date).toLocaleString("ko-KR")}</p>
        <div className="grid sm:grid-cols-3 gap-4 my-6">
          {[["질문 수", entry.id === EXAMPLE_REPORT.id ? "2개" : "1개"], ["시선 안정성", entry.analysis?.gazeStability == null ? "측정 데이터 없음" : `${entry.analysis.gazeStability}%`], ["상태", entry.id === EXAMPLE_REPORT.id ? "예시 데이터" : "저장 완료"]].map(([label, value]) => <div key={label} className="bg-muted/60 p-5 rounded-xl">
            <p className="text-sm text-muted-foreground">{label}</p><p className="font-bold text-lg mt-2">{value}</p>
          </div>)}
        </div>
        <div className="flex flex-wrap gap-3">
          <PrimaryButton onClick={() => navigateReport(entry, "dashboard")}>전체 분석 결과 조회</PrimaryButton>
          <SecondaryButton onClick={() => navigateReport(entry, "question-analysis")}>질문별 상세 분석</SecondaryButton>
        </div>
      </Card>)}</div>
    </section>}
    {screen === "report-detail" && <><SecondaryButton className="mb-5" onClick={() => onNavigate("reports")}>리포트 목록으로 돌아가기</SecondaryButton>{selected ? <Card className="p-8"><Badge>REPORT</Badge><h2 className="text-2xl font-bold mt-4">{selected.title}</h2><p className="text-muted-foreground mt-3">{new Date(selected.date).toLocaleString("ko-KR")}</p><div className="grid sm:grid-cols-3 gap-5 my-8">{[["질문 수",selected.id === EXAMPLE_REPORT.id ? "2개" : "1개"],["시선 안정성",selected.analysis?.gazeStability == null ? "측정 데이터 없음" : `${selected.analysis.gazeStability}%`],["상태","저장 완료"]].map(([label,value])=><div key={label} className="bg-muted/60 p-5 rounded-xl"><p className="text-sm text-muted-foreground">{label}</p><p className="font-bold text-lg mt-2">{value}</p></div>)}</div><div className="flex flex-wrap gap-3"><PrimaryButton onClick={() => {sessionStorage.setItem("interviewAnalysis",JSON.stringify(selected.analysis));sessionStorage.setItem("iv-current-id",selected.id);onNavigate("dashboard");}}>전체 분석 결과 조회</PrimaryButton><SecondaryButton onClick={() => onNavigate("question-analysis")}>질문별 상세 분석</SecondaryButton><SecondaryButton onClick={() => onNavigate("tips")}>면접 TIP</SecondaryButton></div></Card> : <Card className="p-16 text-center"><h2 className="text-xl font-bold">조회할 이전 면접 기록이 없습니다</h2><p className="text-muted-foreground mt-3">면접을 완료하면 이곳에서 리포트를 확인할 수 있어요.</p></Card>}</>}
  </main>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("main");
  const [startWithCameraOff, setStartWithCameraOff] = useState(false);

  const renderScreen = () => {
    switch (screen) {
      case "profile-edit": case "resume-edit": case "profile": case "history": case "resumes": case "reports": case "report-detail": case "tips": return <ManagementScreen key={screen} screen={screen} onNavigate={setScreen}/>;
      case "main": return <MainScreen onNavigate={setScreen} />;
      case "login": case "signup": return <LoginScreen key={screen} initialTab={screen} onNavigate={setScreen} />;
      case "job-select": return <JobSelectScreen onNavigate={setScreen} />;
      case "device-test": return <DeviceTestScreen onNavigate={next => {setStartWithCameraOff(false);setScreen(next);}} onStartWithoutCamera={() => {setStartWithCameraOff(true);setScreen("interview");}} />;
      case "interview": return <InterviewScreen initialCameraOff={startWithCameraOff} onNavigate={next => {setStartWithCameraOff(false);setScreen(next);}} />;
      case "analyzing": return <AnalyzingScreen onNavigate={setScreen} />;
      case "dashboard": return <DashboardScreen onNavigate={setScreen} />;
      case "question-analysis": return <QuestionAnalysisScreen onNavigate={setScreen} />;
    }
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}>
      {screen !== "interview" && screen !== "analyzing" && (
        <NavBar currentScreen={screen} onNavigate={setScreen} />
      )}
      {renderScreen()}
    </div>
  );
}

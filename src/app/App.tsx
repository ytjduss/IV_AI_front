import { useState, useEffect, useRef } from "react";
import {
  Mic, MicOff, Camera, CameraOff, Video, VideoOff, ChevronRight, CheckCircle2,
  AlertCircle, Wifi, Volume2, Eye, Brain, MessageSquare, TrendingUp, Star,
  BarChart3, Clock, Users, ArrowRight, Play, RotateCcw, Download, RefreshCw,
  ChevronDown, Circle, Check, X, Loader2, Award, Target, Zap, FileText,
  Activity, Radio, BookOpen
} from "lucide-react";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { captureVideoFrame, visionApi } from "./lib/vision-api";

type Screen =
  | "main"
  | "login"
  | "job-select"
  | "device-test"
  | "interview"
  | "analyzing"
  | "dashboard"
  | "question-analysis"
  | "voice-analysis"
  | "followup-flow";

const SCREENS: Screen[] = ["job-select", "device-test", "interview", "dashboard"];

const SCREEN_LABELS: Record<Screen, string> = {
  main: "메인",
  login: "로그인",
  "job-select": "직무 선택",
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
        {currentScreen === "main" || currentScreen === "login" ? (
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => onNavigate("login")} className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-primary">로그인</button>
            <button onClick={() => onNavigate("login")} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold">회원가입</button>
          </div>
        ) : <div className="hidden md:flex items-center gap-2">
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
        <div className="md:hidden relative">
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronDown className="w-5 h-5 text-foreground" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
              {SCREENS.map((s) => (
                <button
                  key={s}
                  onClick={() => { onNavigate(s); setOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${currentScreen === s ? "text-primary font-semibold bg-accent" : "text-foreground hover:bg-muted"}`}
                >
                  {SCREEN_LABELS[s]}
                </button>
              ))}
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

function LoginScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Video className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">IV-Coach</h1>
          <p className="text-muted-foreground mt-1 text-sm">AI 기반 맞춤형 모의면접</p>
        </div>
        <Card className="p-8">
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

          <PrimaryButton onClick={() => onNavigate("job-select")} className="w-full mt-6">
            {tab === "login" ? "로그인" : "회원가입"}
          </PrimaryButton>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 text-xs text-muted-foreground">또는</span>
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-3 border border-border rounded-xl py-3 text-sm font-medium hover:bg-muted transition-colors">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            Google 계정으로 로그인
          </button>
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
        <div className="flex justify-between gap-3">
          <SecondaryButton onClick={() => onNavigate("main")} size="lg">이전</SecondaryButton>
          <PrimaryButton onClick={() => onNavigate("device-test")} disabled={!selected} size="lg">
            다음: 장비 테스트 <ChevronRight className="w-5 h-5" />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 4. Device Test Screen
// ────────────────────────────────────────────────────────────

function DeviceTestScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [noiseOk, setNoiseOk] = useState(false);
  const [netOk, setNetOk] = useState(false);
  const [testing, setTesting] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const [calibrationReady, setCalibrationReady] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [ambientLevel, setAmbientLevel] = useState(0);
  const [visionStatus, setVisionStatus] = useState("카메라 연결 중");
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionIdRef = useRef(`interview-${crypto.randomUUID()}`);

  useEffect(() => {
    sessionStorage.setItem("visionSessionId", sessionIdRef.current);
  }, []);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;
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
        setCameraOk(false);
        setMicOk(false);
        setVisionStatus("카메라·마이크 권한을 허용해 주세요");
      });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearTimeout(ambientTimer);
      cancelAnimationFrame(animationFrame);
      void audioContext?.close();
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const runTest = async () => {
    if (testing) return;
    setTesting(true);
    setCalibrationReady(false);
    setCalibrationProgress(0);
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
        if (result?.success === true) acceptedFrames += 1;
        setCalibrationProgress((index + 1) * 10);
        setVisionStatus(`캘리브레이션 중 · ${index + 1}/10 프레임`);
      }
      if (acceptedFrames === 0) throw new Error("기준값으로 사용할 수 있는 프레임이 없습니다.");
      setCalibrationReady(true);
      setVisionStatus(`캘리브레이션 준비 완료 · 유효 프레임 ${acceptedFrames}/10`);
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
    setVisionStatus("자세 기준값 확정 중");
    try {
      const result = await visionApi.finalizeCalibration(sessionIdRef.current);
      if (result?.success !== true) {
        throw new Error(typeof result?.reason === "string" ? result.reason : "자세 기준값을 확정하지 못했습니다.");
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
            <h3 className="font-bold text-foreground mb-3">카메라 미리보기</h3>
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
            <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${calibrationProgress}%` }} />
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
          <SecondaryButton onClick={runTest}>
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {calibrationReady ? "다시 캘리브레이션" : "5초 캘리브레이션 시작"}
          </SecondaryButton>
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

function InterviewScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [phase, setPhase] = useState<"prep" | "answering" | "followup-loading" | "followup">("prep");
  const [qIdx, setQIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [timer, setTimer] = useState(30);
  const [recording, setRecording] = useState(false);
  const [poseStatus, setPoseStatus] = useState("자세 분석 대기");
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionIdRef = useRef(sessionStorage.getItem("visionSessionId") ?? `interview-${crypto.randomUUID()}`);
  const voiceSamplesRef = useRef<number[]>([]);
  const gazeSamplesRef = useRef<boolean[]>([]);

  const questions = [
    "자기소개를 해주세요. 본인의 핵심 역량을 중심으로 간단히 말씀해 주세요.",
  ];

  useEffect(() => {
    if (phase !== "answering") return;
    setRecording(true);
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setPhase("followup-loading");
          setTimeout(() => setPhase("followup"), 2000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    if (camOff) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: !muted })
      .then((stream) => {
        mediaStream = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setPoseStatus("카메라 권한을 확인해 주세요"));

    return () => mediaStream?.getTracks().forEach((track) => track.stop());
  }, [camOff, muted]);

  useEffect(() => {
    if (phase !== "answering" || muted) return;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    const audioTrack = stream?.getAudioTracks()[0];
    if (!stream || !audioTrack) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const interval = window.setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      let sumSquares = 0;
      for (const value of samples) {
        const normalized = (value - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / samples.length);
      const decibels = 20 * Math.log10(Math.max(rms, 0.00001));
      const level = Math.max(0, Math.min(100, ((decibels + 60) / 60) * 100));
      voiceSamplesRef.current.push(level);
    }, 250);

    return () => {
      window.clearInterval(interval);
      void audioContext.close();
    };
  }, [phase, muted]);

  useEffect(() => {
    if (phase !== "answering" || camOff) return;
    let requesting = false;

    const checkPose = async () => {
      if (requesting || !videoRef.current) return;
      requesting = true;
      try {
        const frame = await captureVideoFrame(videoRef.current);
        const [, gazeResult] = await Promise.all([
          visionApi.checkPose(sessionIdRef.current, frame),
          visionApi.checkGaze(frame),
        ]);
        if (typeof gazeResult?.looking_at_camera === "boolean") {
          gazeSamplesRef.current.push(gazeResult.looking_at_camera);
        }
        setPoseStatus("자세 확인됨");
      } catch (error) {
        setPoseStatus(error instanceof Error ? error.message : "자세 분석 실패");
      } finally {
        requesting = false;
      }
    };

    void checkPose();
    const interval = setInterval(checkPose, 3000);
    return () => clearInterval(interval);
  }, [phase, camOff]);

  const handleStart = () => { setPhase("answering"); setTimer(90); };
  const handleDone = () => { setPhase("followup-loading"); setTimeout(() => setPhase("followup"), 2000); setRecording(false); };
  const handleNext = async () => {
    if (qIdx >= questions.length - 1) {
      const voiceSamples = voiceSamplesRef.current.filter((value) => Number.isFinite(value));
      const voiceDelivery = voiceSamples.length
        ? Math.round(voiceSamples.reduce((sum, level) => sum + Math.max(0, 100 - Math.abs(level - 50) * 2), 0) / voiceSamples.length)
        : null;
      const gazeSamples = gazeSamplesRef.current;
      const gazeStability = gazeSamples.length
        ? Math.round((gazeSamples.filter(Boolean).length / gazeSamples.length) * 100)
        : null;
      sessionStorage.setItem("interviewAnalysis", JSON.stringify({ voiceDelivery, gazeStability }));
      try {
        await visionApi.endSession(sessionIdRef.current);
      } catch (error) {
        setPoseStatus(error instanceof Error ? error.message : "세션 종료 요청 실패");
      }
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
            <span className={`text-xs font-bold font-mono ${phase === "prep" ? "text-amber-300" : "text-primary"}`}>
              {String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col gap-3 p-3 sm:p-4">
        {/* AI Interviewer */}
        <div className="flex flex-col gap-3 order-2">
          <Card className="bg-white border-primary/20 p-4 flex flex-col rounded-2xl">
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
                <p className="text-amber-300 text-xs">답변을 준비하세요. 준비가 되면 "답변 시작" 버튼을 누르세요.</p>
              </div>
            )}
          </Card>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setMuted(!muted)}
              className={`p-3 rounded-xl border transition-all ${muted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}>
              {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button onClick={() => setCamOff(!camOff)}
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

        {/* Webcam */}
        <div className="flex flex-col gap-3 order-1">
          <Card className="w-full max-w-3xl mx-auto bg-slate-900 border-primary/20 overflow-hidden rounded-2xl shadow-lg shadow-primary/10">
            <div className="relative h-[clamp(290px,43vh,360px)] bg-slate-950 flex items-center justify-center">
              {camOff ? (
                <div className="flex flex-col items-center gap-2">
                  <CameraOff className="w-10 h-10 text-slate-600" />
                  <span className="text-slate-500 text-xs">카메라 꺼짐</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 w-full h-full">
                  <div className="w-full h-full bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center">
                    <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-contain" />
                  </div>
                </div>
              )}
              {recording && !camOff && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 rounded px-1.5 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-white text-[10px] font-bold">REC</span>
                </div>
              )}
            </div>
            <div className="px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs">나의 화면</span>
                <Badge color={recording ? "orange" : "gray"}>{recording ? "녹화 중" : "대기"}</Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">{poseStatus}</p>
            </div>
          </Card>

          <Card className="hidden bg-slate-900 border-slate-800 p-4">
            <h4 className="text-slate-300 text-sm font-semibold mb-3">면접 가이드</h4>
            <ul className="flex flex-col gap-2 text-xs text-slate-400">
              <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />카메라를 정면으로 바라보세요</li>
              <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />또는, 으음 같은 필러워드를 줄이세요</li>
              <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />구체적인 수치와 사례를 포함하세요</li>
              <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />STAR 구조로 답변을 구성하세요</li>
            </ul>
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
    { label: "STT 음성 텍스트 변환", icon: Mic, color: "text-primary" },
    { label: "답변 내용 분석", icon: Brain, color: "text-emerald-500" },
    { label: "음성 특성 분석", icon: Volume2, color: "text-teal-500" },
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
        voiceDelivery?: number | null;
        gazeStability?: number | null;
      };
    } catch {
      return {};
    }
  })();
  const scores = [
    { label: "답변 내용", score: null, color: "#0fa99e" },
    { label: "음성 전달력", score: storedAnalysis.voiceDelivery ?? null, color: "#34d399" },
    { label: "시선 안정성", score: storedAnalysis.gazeStability ?? null, color: "#0d9489" },
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
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <Badge color="mint">면접 완료</Badge>
            <h1 className="text-3xl font-bold text-foreground mt-2">AI 면접 분석 결과</h1>
            <p className="text-muted-foreground mt-1 text-sm">API 연결 테스트 면접 · 1개 질문</p>
          </div>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => onNavigate("interview")} size="sm">
              <RotateCcw className="w-4 h-4" /> 다시 면접
            </SecondaryButton>
            <PrimaryButton size="sm">
              <Download className="w-4 h-4" /> 결과 저장
            </PrimaryButton>
          </div>
        </div>

        {/* Overall + Subscores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/20 col-span-1 flex flex-col items-center justify-center">
            <p className="text-sm font-semibold text-muted-foreground mb-2">종합 점수</p>
            <div className="relative w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="100%" data={[{ value: overall ?? 0, fill: "#0fa99e" }]} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "#d0f5f1" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{overall ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{overall === null ? "측정 전" : "/ 100"}</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 col-span-1 lg:col-span-2">
            <h3 className="font-bold text-foreground mb-4">항목별 점수</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {scores.map((s) => typeof s.score === "number" ? (
                <ScoreRing key={s.label} score={s.score} label={s.label} color={s.color} size={76} />
              ) : (
                <div key={s.label} className="flex flex-col items-center gap-2">
                  <div className="w-[76px] h-[76px] rounded-full border-[7px] border-muted flex items-center justify-center text-xl font-bold text-muted-foreground">—</div>
                  <span className="text-xs text-muted-foreground text-center">{s.label}<br/>분석 데이터 없음</span>
                </div>
              ))}
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b8e8c" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b8e8c" }} />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #d0f5f1", borderRadius: 8, fontSize: 12 }}
                    cursor={{ fill: "#f0faf9" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

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
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 8. Question Analysis Screen
// ────────────────────────────────────────────────────────────

function QuestionAnalysisScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [activeQ, setActiveQ] = useState(0);
  const questionAnalysisAvailable = false;
  if (!questionAnalysisAvailable) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-[#f7faf9] px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => onNavigate("dashboard")} className="text-sm text-muted-foreground hover:text-primary mb-6 flex items-center gap-1">
            <ChevronRight className="w-4 h-4 rotate-180" /> 결과 대시보드로
          </button>
          <Card className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <FileText className="w-7 h-7 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">질문별 분석 데이터가 없습니다</h1>
            <p className="text-muted-foreground mt-3">답변 내용 분석 API가 연결되면 질문별 평가가 이곳에 표시됩니다.</p>
          </Card>
        </div>
      </div>
    );
  }
  const questions = [
    {
      q: "자기소개를 해주세요. 본인의 핵심 역량과 지원 동기를 중심으로 말씀해 주세요.",
      answer: "안녕하세요. 저는 3년간 프론트엔드 개발을 공부해온 홍길동입니다. React와 TypeScript를 주로 사용했으며, 사이드 프로젝트에서 사용자 경험 개선을 위해 렌더링 성능을 40% 향상시킨 경험이 있습니다. 귀사의 사용자 중심 개발 문화에 깊이 공감하여 지원하게 되었습니다.",
      scores: { fit: 85, logic: 78, specific: 82, relevance: 90 },
      star: { S: "React/TS 프론트엔드 3년 학습", T: "성능 저하 문제 해결", A: "렌더링 최적화 구현", R: "성능 40% 향상" },
      strengths: ["직무 관련 기술 스택을 명확히 제시했습니다", "수치(40%)를 활용해 성과를 구체화했습니다"],
      improvements: ["지원 동기가 다소 일반적입니다. 회사의 특정 제품이나 기술에 대한 언급을 추가하세요"],
      example: "안녕하세요, 홍길동입니다. React/TypeScript를 활용해 사이드 프로젝트에서 가상 스크롤 도입으로 렌더링 성능을 40% 개선한 경험이 있습니다. 귀사의 [특정 제품명]이 [특정 문제]를 해결하는 방식에 깊은 인상을 받아, 제 역량을 기여하고 싶어 지원했습니다.",
    },
    {
      q: "개발 프로젝트에서 가장 어려웠던 기술적 문제와 해결 과정을 설명해 주세요.",
      answer: "팀 프로젝트에서 대용량 데이터 렌더링 시 브라우저 프리징 문제가 발생했습니다. 원인을 분석한 결과 DOM 노드 과다 생성이 문제였고, 가상 스크롤을 도입해 해결했습니다. 결과적으로 FCP가 3.2초에서 0.8초로 75% 개선되었습니다.",
      scores: { fit: 88, logic: 92, specific: 95, relevance: 87 },
      star: { S: "대용량 데이터 렌더링 문제 발생", T: "브라우저 프리징 해결 필요", A: "가상 스크롤 도입 구현", R: "FCP 75% 개선 (3.2s → 0.8s)" },
      strengths: ["STAR 구조가 명확하게 적용되었습니다", "구체적인 수치(FCP 75% 개선)로 결과를 제시했습니다", "기술 문제 해결 역량을 잘 보여줍니다"],
      improvements: ["해결 과정에서 겪은 시행착오나 대안 검토 과정을 추가하면 더 설득력 있습니다"],
      example: "가상 스크롤 외에도 Web Worker를 이용한 비동기 처리를 검토했지만, 기존 코드 구조와의 호환성 문제로 가상 스크롤을 최종 선택했습니다.",
    },
  ];

  const q = questions[activeQ];
  const starColors = { S: "bg-blue-50 border-blue-200 text-blue-700", T: "bg-amber-50 border-amber-200 text-amber-700", A: "bg-emerald-50 border-emerald-200 text-emerald-700", R: "bg-purple-50 border-purple-200 text-purple-700" };
  const starLabels = { S: "Situation", T: "Task", A: "Action", R: "Result" };

  return (
    <div className="min-h-screen bg-[#f7faf9] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <button onClick={() => onNavigate("dashboard")} className="text-sm text-muted-foreground hover:text-primary mb-6 flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> 결과 <span className="mx-1">/</span> <strong className="text-foreground">질문별 분석</strong>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
          <Card className="p-4 lg:sticky lg:top-6">
            <h2 className="font-bold text-foreground px-3 pt-2 pb-4">전체 질문 ({questions.length})</h2>
            <div className="space-y-2">
              {questions.map((item, i) => {
                const average = Math.round(Object.values(item.scores).reduce((a, b) => a + b, 0) / 4);
                return (
                  <button key={i} onClick={() => setActiveQ(i)} className={`w-full text-left rounded-2xl p-4 transition-all ${activeQ === i ? "bg-primary text-white shadow-sm" : "hover:bg-accent/40"}`}>
                    <div className="flex justify-between text-sm font-bold mb-2"><span>Q{i + 1}</span><span>{average}</span></div>
                    <p className={`text-sm leading-snug line-clamp-2 ${activeQ === i ? "text-white/90" : "text-muted-foreground"}`}>{item.q}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6 sm:p-8">
              <div className="flex gap-6 justify-between items-start">
                <div><div className="text-sm font-bold text-primary mb-2">Q{activeQ + 1}</div><h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">{q.q}</h1></div>
                <ScoreRing score={Math.round(Object.values(q.scores).reduce((a, b) => a + b, 0) / 4)} label="/ 100" size={92} />
              </div>
              <div className="mt-7 rounded-2xl border border-border bg-muted/30 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground mb-3"><Mic className="w-4 h-4" /> STT 변환 답변</div>
                <p className="text-foreground leading-relaxed">{q.answer}</p>
              </div>
            </Card>

            <Card className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-foreground mb-6">답변 평가</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                {[
                  { k: "fit", label: "질문 적합성" },
                  { k: "logic", label: "논리성" },
                  { k: "specific", label: "구체성" },
                  { k: "relevance", label: "직무 연관성" },
                ].map(({ k, label }) => {
                  const val = q.scores[k as keyof typeof q.scores];
                  return (
                    <div key={k}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-sm font-semibold text-foreground">{label}</span>
                        <span className="text-sm font-bold text-foreground">{val}<span className="font-normal text-muted-foreground">/100</span></span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-foreground mb-6">STAR 구조 분석</h2>
              <div className="space-y-4">
                {(Object.keys(q.star) as (keyof typeof q.star)[]).map((k) => (
                  <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 items-center">
                    <div className={`rounded-full border px-3 py-2 text-center text-xs font-bold ${starColors[k]}`}>{starLabels[k]}</div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-foreground">{q.star[k]}</div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 border-emerald-200 bg-emerald-50/40">
                <h3 className="font-bold text-emerald-800 mb-3">강점</h3>
                {q.strengths.map((s) => <div key={s} className="flex items-start gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><p className="text-sm text-emerald-700">{s}</p></div>)}
              </Card>
              <Card className="p-6 border-amber-200 bg-amber-50/40">
                <h3 className="font-bold text-amber-800 mb-3">개선점</h3>
                {q.improvements.map((s) => <div key={s} className="flex items-start gap-2 mb-2"><AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><p className="text-sm text-amber-700">{s}</p></div>)}
              </Card>
            </div>
            <Card className="p-6 border-primary/20 bg-accent/20">
              <h3 className="font-bold text-primary mb-3">개선 답변 예시</h3>
              <p className="text-sm text-foreground leading-relaxed">{q.example}</p>
            </Card>
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

export default function App() {
  const [screen, setScreen] = useState<Screen>("main");

  const renderScreen = () => {
    switch (screen) {
      case "main": return <MainScreen onNavigate={setScreen} />;
      case "login": return <LoginScreen onNavigate={setScreen} />;
      case "job-select": return <JobSelectScreen onNavigate={setScreen} />;
      case "device-test": return <DeviceTestScreen onNavigate={setScreen} />;
      case "interview": return <InterviewScreen onNavigate={setScreen} />;
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

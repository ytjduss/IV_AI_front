import type { Screen } from "../type/screen";
import { useEffect, useRef, useState } from "react";
import { captureVideoFrame, visionApi } from "../app/lib/vision-api";
import {
  Activity,
  Camera,
  CameraOff,
  Check,
  ChevronRight,
  Clock,
  Eye,
  Radio,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

function InterviewScreen({
  onNavigate,
  initialCameraOff = false,
}: {
  onNavigate: (s: Screen) => void;
  initialCameraOff?: boolean;
}) {
  const [phase, setPhase] = useState<
    "prep" | "answering" | "followup-loading" | "followup"
  >("prep");
  const [qIdx, setQIdx] = useState(0);
  const [camOff, setCamOff] = useState(initialCameraOff);
  const [guide, setGuide] = useState(true);
  const [timer, setTimer] = useState(30);
  const [recording, setRecording] = useState(false);
  const [poseStatus, setPoseStatus] = useState("자세 분석 대기");
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionIdRef = useRef(
    sessionStorage.getItem("visionSessionId") ??
      `interview-${crypto.randomUUID()}`,
  );
  const gazeSamplesRef = useRef<boolean[]>([]);
  const answerActiveRef = useRef(false);
  const answerSummariesRef = useRef<Record<string, unknown>[]>([]);
  const visionIntervalRef = useRef<number | null>(null);
  const camOffRef = useRef(camOff);

  useEffect(() => {
    camOffRef.current = camOff;
  }, [camOff]);

  //예시 질문*************************하드코딩
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
    visionIntervalRef.current = window.setTimeout(
      () => void runVisionTracking(),
      3000,
    );
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
      setPoseStatus(
        error instanceof Error ? error.message : "답변 분석 요청 실패",
      );
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
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        mediaStream = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPoseStatus("카메라 연결 완료 · 자세 분석 대기");
      })
      .catch(() => {
        if (!disposed) setPoseStatus("카메라 권한을 확인해 주세요");
      });
    return () => {
      disposed = true;
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
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
      console.warn(
        "[Vision API] 답변 시작 기록은 실패했지만 프레임 분석은 계속합니다.",
        error,
      );
      setPoseStatus("답변 시작 기록 실패 · 자세 분석은 계속 진행 중");
    }
  };
  const handleDone = () => {
    void finishAnswer();
  };
  const handleNext = async () => {
    if (qIdx >= questions.length - 1) {
      const gazeSamples = gazeSamplesRef.current;
      const gazeStability = gazeSamples.length
        ? Math.round(
            (gazeSamples.filter(Boolean).length / gazeSamples.length) * 100,
          )
        : null;
      let visionSession = null;
      try {
        visionSession = await visionApi.endSession(sessionIdRef.current);
      } catch (error) {
        setPoseStatus(
          error instanceof Error ? error.message : "세션 종료 요청 실패",
        );
      }
      sessionStorage.setItem(
        "interviewAnalysis",
        JSON.stringify({
          gazeStability,
          answerSummaries: answerSummariesRef.current,
          visionSession,
        }),
      );
      const entry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        title: "맞춤형 모의면접",
        analysis: {
          gazeStability,
          visionSession,
          answerSummaries: answerSummariesRef.current,
        },
      };
      //이건 나중에 history에 저장하는거라서 지금은 필요없음
      //   localStorage.setItem("iv-history", JSON.stringify([entry, ...readLocal("iv-history", [])]));
      sessionStorage.setItem("iv-current-id", entry.id);
      onNavigate("analyzing");
      return;
    }
    setQIdx((q) => q + 1);
    setPhase("prep");
    setTimer(30);
  };

  const progress = (qIdx / questions.length) * 100;

  return (
    <div className="min-h-screen bg-[#f3fbfa] flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-border bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">질문</span>
            <span className="font-bold text-foreground">{qIdx + 1}</span>
            <span className="text-muted-foreground text-sm">
              / {questions.length}
            </span>
          </div>
          <div className="w-40 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          {recording && (
            <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-medium">REC</span>
            </div>
          )}
          <div
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 ${phase === "prep" ? "bg-amber-500/20 border border-amber-500/30" : "bg-primary/20 border border-primary/30"}`}
          >
            <Clock
              className={`w-3.5 h-3.5 ${phase === "prep" ? "text-amber-400" : "text-primary"}`}
            />
            <span
              className={`text-xs font-bold font-mono ${phase === "prep" ? "text-amber-600" : "text-primary"}`}
            >
              {String(Math.floor(timer / 60)).padStart(2, "0")}:
              {String(timer % 60).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {/* Main */}

      <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col gap-4 p-4 sm:p-6">
        {/* AI Interviewer */}
        <div className="flex flex-col gap-3 order-1">
          <Card className="bg-white border-primary/20 p-5 sm:p-6 flex flex-col rounded-none">
            <div className="flex items-center">
              <div className="font-size-5xl">Q.</div>
              {phase === "answering" && <Badge color="orange">답변 중</Badge>}
              {phase === "followup-loading" && (
                <Badge color="gray">꼬리질문 생성 중</Badge>
              )}
              {phase === "followup" && <Badge color="navy">꼬리질문</Badge>}
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {phase === "followup-loading" ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-muted-foreground text-sm">
                    답변을 분석해 꼬리질문을 생성하고 있습니다...
                  </p>
                </div>
              ) : phase === "followup" ? (
                <div>
                  <div className="bg-muted rounded-xl p-4 mb-4">
                    <p className="text-muted-foreground text-xs mb-2">
                      이전 답변 키워드
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["React", "TypeScript", "팀 협업", "성능 최적화"].map(
                        (k) => (
                          <span
                            key={k}
                            className="bg-primary/20 text-primary text-xs rounded-lg px-2 py-1"
                          >
                            {k}
                          </span>
                        ),
                      )}
                    </div>
                  </div>

                  <p className="text-foreground text-xl font-bold leading-relaxed">
                    성능 최적화를 진행하면서 구체적으로 어떤 지표를 측정했고,
                    결과는 얼마나 개선되었나요?(하드코딩)
                  </p>
                </div>
              ) : (
                <p className="text-foreground text-lg sm:text-xl font-bold leading-relaxed text-center">
                  {questions[qIdx]}
                </p>
              )}
            </div>

            {phase === "prep" && (
              <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-amber-600 text-xs">
                  답변을 준비하세요. 준비가 되면 "답변 시작" 버튼을 누르세요.
                </p>
              </div>
            )}
          </Card>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              aria-label={camOff ? "카메라 켜기" : "카메라 끄기"}
              onClick={() => setCamOff(!camOff)}
              className={`p-3 rounded-xl border transition-all ${camOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"}`}
            >
              {camOff ? (
                <CameraOff className="w-5 h-5" />
              ) : (
                
                <Camera className="w-5 h-5" />
              )}
            </button>

            {phase === "prep" && (
              <Button onClick={handleStart} size="lg" className="px-10">
                답변 시작
              </Button>
            )}
            {phase === "answering" && (
              <Button
                onClick={handleDone}
                size="lg"
                className="px-10 bg-emerald-500 hover:bg-emerald-600"
              >
                <Check className="w-5 h-5" /> 답변 완료
              </Button>
            )}
            {phase === "followup" && (
              <Button onClick={handleNext} size="lg" className="px-10">
                {qIdx >= questions.length - 1 ? "면접 종료" : "다음 질문"}{" "}
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="interview-layout order-2">
          <div
            className={`interview-stage ${phase !== "prep" ? "is-answering" : ""}`}
          >
            <div className="interviewer-placeholder">
              <span>AI 면접관</span>
            </div>
            <div className="stage-label">
              <span className="live-dot" />
              {phase === "prep" ? "내 화면" : "AI 면접관"}
            </div>
            <div className="self-camera">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {(camOff || poseStatus.includes("권한")) && (
                <div className="camera-empty">
                  <CameraOff />
                  <p>
                    {camOff ? "카메라 꺼짐" : "카메라 권한을 허용해 주세요"}
                  </p>
                </div>
              )}
              {guide && <div className="pose-grid" />}
            </div>
            <button
              className="guide-toggle"
              onClick={() => setGuide(!guide)}
              aria-pressed={guide}
            >
              자세 가이드 <strong>{guide ? "ON" : "OFF"}</strong>
            </button>
            <div className="stage-status">
              {phase === "prep"
                ? "준비가 되면 답변을 시작하세요"
                : recording
                  ? "면접이 진행 중입니다."
                  : "답변이 완료되었습니다."}
            </div>
          </div>
          <Card className="p-5 feedback-panel">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold">실시간 피드백</h2>
            </div>
            {[
              { title: "자세", items: ["어깨", "등 / 상체", "얼굴 위치"] },
              { title: "시선", items: ["시선 방향", "시선 안정성"] },
            ].map((group) => (
              <div className="mb-4">
                <h3>
                  {group.title}
                </h3>
                <div className="rounded-xl border border-border px-3">
                  {group.items.map((label) => (
                    <div
                      className="items-center py-3 border-b "
                    >

                      <div className="flex-1">
                        <p className="text-sm font-bold">{label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {recording
                            ? "분석 결과를 확인하고 있어요"
                            : "답변 시작 후 측정합니다"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p
              role="status"
              className="text-xs text-muted-foreground mb-3 break-words"
            >
              {poseStatus}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
export default InterviewScreen;

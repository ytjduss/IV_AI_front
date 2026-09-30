import { submitAnswer, generateFollowupQuestion, endInterviewSession, getNextQuestion, type NextQuestion } from "../api/interview";
import { requireInterviewSessionId } from "../lib/interviewSession";
import { Camera, CameraOff, Check, ChevronRight, Clock } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import type { Screen } from "../type/screen";
import type {
  AnswerAnalysis,
  VisionSummary,
  PoseResult,
  GazeResult,
  InterviewAnalysis,
} from "../type/vision";
import { useEffect, useRef, useState } from "react";
import {
  captureVideoFrame,
  visionApi,
  VisionApiError,
} from "../app/lib/vision-api";
import {
  createVisionTracking,
  requireVisionSummary,
  visionFeedback,
} from "../lib/visionTracking";
import VisionSummaryCard from "../components/analysis/VisionSummaryCard";
import {
  analyzeAudio,
  getAnswerSummary,
  getSessionSummary,
  endAudioSession,
} from "../api/audio";

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
  const [answerText, setAnswerText] = useState("");
  const [submittedAnswerId, setSubmittedAnswerId] = useState<number | null>(null);
  // 꼬리질문 생성만 실패하면 이미 저장된 답변을 다시 제출하지 않습니다.
  const submittedAnswerRef = useRef<number | null>(null);
  const [camOff, setCamOff] = useState(initialCameraOff);
  const [guide, setGuide] = useState(true);
  const [timer, setTimer] = useState(30);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [poseStatus, setPoseStatus] = useState("자세 분석 대기");
  const [gazeStatus, setGazeStatus] = useState(" 분석 대기");
  const [poseFeedback, setPoseFeedback] = useState("답변 시작 후 측정합니다.");
  const [gazeFeedback, setGazeFeedback] = useState("답변 시작 후 측정합니다.");
  const videoRef = useRef<HTMLVideoElement>(null);
  const calibratedSession = useRef(
    initialCameraOff ? null : sessionStorage.getItem("visionSessionId"),
  );
  const sessionIdRef = useRef(sessionStorage.getItem("interviewSessionId") ?? "");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const answerActiveRef = useRef(false);
  const answerSummariesRef = useRef<AnswerAnalysis[]>([]);
  const trackingRef = useRef<ReturnType<typeof createVisionTracking> | null>(
    null,
  );
  const camOffRef = useRef(camOff);
  const mountedRef = useRef(true);
  const sessionResultRef = useRef<VisionSummary | null>(null);
  const audioSessionRef = useRef<unknown>(null);
  const audioEndedRef = useRef(false);
  // 종료 성공 이후 화면 이동/로컬 저장 실패로 재시도해도 리포트를 중복 생성하지 않습니다.
  const reportResultRef = useRef<{ success: boolean; report_id: number } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<NextQuestion | null>(null);
  const [questionLoading, setQuestionLoading] = useState(true);
  const [questionError, setQuestionError] = useState("");
  const [questionAttempt, setQuestionAttempt] = useState(0);
  const questionCount = Number(sessionStorage.getItem("iv-question-count")) || 1;

  // UC-34: 최초 진입/재시도 시 서버의 미답변 질문을 조회합니다.
  useEffect(() => {
    const controller = new AbortController();
    setQuestionLoading(true);
    setQuestionError("");
    Promise.resolve().then(() => getNextQuestion(requireInterviewSessionId(), controller.signal))
      .then((question) => { if (!controller.signal.aborted) setCurrentQuestion(question); })
      .catch((error) => { if (!controller.signal.aborted) setQuestionError(error instanceof Error ? error.message : "질문 조회에 실패했습니다."); })
      .finally(() => { if (!controller.signal.aborted) setQuestionLoading(false); });
    return () => controller.abort();
  }, [questionAttempt]);

  useEffect(() => {
    camOffRef.current = camOff;
  }, [camOff]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      answerActiveRef.current = false;
      trackingRef.current?.dispose();
      const recorder = mediaRecorderRef.current;
      if (recorder?.state === "recording") recorder.stop();
      recorder?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const feedback = (
    result: PromiseSettledResult<PoseResult | GazeResult>,
    kind: "pose" | "gaze",
  ) => {
    if (!result) 
    {
        return "분석 결과를 불러오지 못함.";
    }
    //추후 추가할 예정임 feedback
// if (type === "pose") {
//     if (result.reason === "not_calibrated") {
//       return "캘리브레이션이 완료되지 않았습니다.";
//     }

//     if (result.reason === "no_person_detected") {
//       return "사람이 감지되지 않았습니다.";
//     }

//     if (result.posture_extreme) {
//       return "자세가 기준 위치에서 크게 벗어났습니다.";
//     }

//     if (result.posture_h === "left") {
//       return "몸이 왼쪽으로 치우쳐 있습니다.";
//     }

//     if (result.posture_h === "right") {
//       return "몸이 오른쪽으로 치우쳐 있습니다.";
//     }

//     if (result.posture_v === "up") {
//       return "상체 위치가 너무 높습니다.";
//     }

//     if (result.posture_v === "down") {
//       return "상체 위치가 너무 낮습니다.";
//     }

//     return "자세가 안정적입니다.";
//   }

//   if (type === "gaze") {
//     if (result.reason === "no_face_detected") {
//       return "얼굴이 감지되지 않았습니다.";
//     }

//     if (result.gaze_extreme) {
//       return "시선이 크게 벗어났습니다.";
//     }

//     if (result.gaze_h === "left") {
//       return "시선이 왼쪽으로 향하고 있습니다.";
//     }

//     if (result.gaze_h === "right") {
//       return "시선이 오른쪽으로 향하고 있습니다.";
//     }

//     if (result.gaze_v === "up") {
//       return "시선이 위쪽으로 향하고 있습니다.";
//     }

//     if (result.gaze_v === "down") {
//       return "시선이 아래쪽으로 향하고 있습니다.";
//     }

//     return "시선이 정면을 향하고 있습니다.";
//   }

//   return "";
};

  const startVisionTracking = () => {
    if (!calibratedSession.current) return;
    trackingRef.current?.dispose();
    trackingRef.current = createVisionTracking({
      capture: () => {
        if (!videoRef.current) throw new Error("카메라가 준비되지 않았습니다.");
        return captureVideoFrame(videoRef.current);
      },
      pose: (frame, signal) =>
        visionApi.poseCheck(sessionIdRef.current, frame, signal),
      gaze: (frame, signal) =>
        visionApi.gazeCheck(sessionIdRef.current, frame, signal),
      enabled: () => !camOffRef.current,
      onResult: (result) => {
        if (!mountedRef.current) return;
        setPoseFeedback(feedback(result.pose, "pose"));
        setGazeFeedback(feedback(result.gaze, "gaze"));
      },
    });
    trackingRef.current.start();
  };

  const finishAudio = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive")
      throw new Error("녹음 데이터를 찾을 수 없습니다.");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () =>
          resolve(
            new Blob(audioChunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            }),
          );
        recorder.onerror = () => reject(new Error("녹음 종료에 실패했습니다."));
        recorder.stop();
      });
      await analyzeAudio(
        sessionIdRef.current,
        new File([blob], `answer-${qIdx}.webm`, { type: blob.type }),
      );
      return await getAnswerSummary(sessionIdRef.current);
    } finally {
      recorder.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    }
  };

  const finishAnswer = async () => {
    //중복 금지
    if (!answerActiveRef.current || busyRef.current) return;

    //상태 즉시 잠금 및 녹음 중지
    answerActiveRef.current = false;
    busyRef.current = true;
    setBusy(true);
    setRecording(false);
    setPhase("followup-loading");

    //비전
    const vision = async () => {
      await trackingRef.current?.stop();
      if (!mountedRef.current || !calibratedSession.current) return null;
      return requireVisionSummary(
        await visionApi.summarizeAnswer(sessionIdRef.current),
      );
    };

    //비전 오디오 실행
    const [visionResult, audioResult] = await Promise.allSettled([
      vision(),
      finishAudio(),
    ]);

    //컴포넌트 언마운트 체크
    if (!mountedRef.current) return;

    //결과 데이터 조립(점수 api 로 변경?)
    const analysis: AnswerAnalysis = {
      questionIndex: qIdx,
      question: currentQuestion && !currentQuestion.done ? currentQuestion.question : "",
      vision: null,
    };

    //비전 결과 및 에러 처리
    if (visionResult.status === "fulfilled")
      analysis.vision = visionResult.value;

    else
      analysis.visionError =
        visionResult.reason instanceof Error
          ? visionResult.reason.message
          : "답변 자세·시선 요약 실패";

    //오디오 결과 및 에러 처리
    if (audioResult.status === "fulfilled") analysis.audio = audioResult.value;
    else
      analysis.audioError =
        audioResult.reason instanceof Error
          ? audioResult.reason.message
          : "음성 분석 실패";

    
    //분석 결과 저장 및 ui 업데이트
    answerSummariesRef.current.push(analysis);
    setPoseStatus(
      [analysis.visionError, analysis.audioError].filter(Boolean).join(" · ") ||
        "답변 분석 완료",
    );
    setPhase("followup");
    busyRef.current = false;
    setBusy(false);
    
  };

  useEffect(() => {
    if (phase !== "answering") return;
    const interval = setInterval(
      () => setTimer((t) => Math.max(0, t - 1)),
      1000,
    );
    return () => clearInterval(interval);
  }, [phase]);
  useEffect(() => {
    if (phase === "answering" && timer === 0) void finishAnswer();
  }, [phase, timer]);

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
        setPoseStatus(
          calibratedSession.current
            ? "카메라 연결 완료 · 자세 분석 대기"
            : "장비 테스트에서 기준 자세를 먼저 측정해 주세요.",
        );
      })
      .catch(() => {
        if (!disposed) setPoseStatus("카메라 권한을 확인해 주세요");
      });
    return () => {
      disposed = true;
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, [camOff]);

  const handleStart = async () => {
    if (questionLoading || questionError || !currentQuestion || currentQuestion.done) return;
    if (busyRef.current || answerActiveRef.current) return;

    if (!camOff && !calibratedSession.current) {
      setPoseStatus("카메라를 켜거나 장비 테스트에서 기준 자세를 먼저 측정해 주세요.");
      return;
    }
    
    answerActiveRef.current = true;

    busyRef.current = true;
    setBusy(true);
    let stream: MediaStream | null = null;

    try {
      //답변 단위 버퍼 초기화
      if (!camOff) await visionApi.startAnswer(sessionIdRef.current);

      //녹음 시작
      const stream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder =
      new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(
            event.data,
          );
        }
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start();

      //화면 상태
      setRecording(true);
      setPhase("answering");
      setTimer(90);

      //자세·시선 추적 시작
      startVisionTracking();
    } catch (error) {
      answerActiveRef.current = false;

    setPoseStatus(
      error instanceof Error
        ? error.message
        : "답변 시작에 실패했습니다.",
    );
  }
};


  const handleDone = () => {
    void finishAnswer();
  };
  const handleSubmitAnswer = async () => {
    if (busyRef.current || !currentQuestion || currentQuestion.done || phase !== "followup") return;
    if (!submittedAnswerRef.current && !answerText.trim()) {
      setQuestionError("제출할 답변 내용을 입력해 주세요.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setQuestionError("");
    try {
      // UC-35/37: 기본 질문과 꼬리질문 모두 현재 표시된 question_id로 저장합니다.
      if (!submittedAnswerRef.current) {
        const saved = await submitAnswer(requireInterviewSessionId(), {
          question_id: currentQuestion.question_id,
          answer_text: answerText.trim(),
        });
        submittedAnswerRef.current = saved.answer_id;
        if (!mountedRef.current) return;
        setSubmittedAnswerId(saved.answer_id);
      }
      // 기본 질문당 꼬리질문 1개를 생성합니다. 꼬리질문에서 다시 생성하지 않습니다.
      if (currentQuestion.question_type !== "followup") {
        const followup = await generateFollowupQuestion(requireInterviewSessionId(), submittedAnswerRef.current);
        if (!mountedRef.current) return;
        setCurrentQuestion({ ...followup, question_type: "followup", done: false });
        submittedAnswerRef.current = null;
        setSubmittedAnswerId(null);
        setAnswerText("");
        setPhase("prep");
        setTimer(30);
      }
    } catch (error) {
      if (mountedRef.current) setQuestionError(error instanceof Error ? error.message : "답변 제출 또는 꼬리질문 생성에 실패했습니다.");
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const handleNext = async () => {
    if (busyRef.current) return;
    if (!currentQuestion?.done && (currentQuestion?.question_type !== "followup" || !submittedAnswerRef.current)) return;
    busyRef.current = true;
    setBusy(true);
    try {
      setQuestionError("");
      // 답변 제출 상태는 서버가 관리합니다. 같은 질문을 다시 받으면 임의로 넘기지 않습니다.
      const next = currentQuestion?.done || reportResultRef.current ? { done: true as const } : await getNextQuestion(requireInterviewSessionId());
      if (!mountedRef.current) return;
      if (!next.done) {
        if (currentQuestion && !currentQuestion.done && next.question_id === currentQuestion.question_id) {
          setQuestionError("서버가 같은 질문을 반환했습니다. 잠시 후 다시 조회해 주세요.");
          return;
        }
        setCurrentQuestion(next);
        submittedAnswerRef.current = null;
        setSubmittedAnswerId(null);
        setAnswerText("");
        setQIdx((index) => index + 1);
        setPhase("prep");
        setTimer(30);
        return;
      }
      setCurrentQuestion(next);

      await trackingRef.current?.stop();
      // UC-38: 분석 저장소를 비우는 비전·오디오 종료보다 리포트 생성을 먼저 실행합니다.
      // 실패 시 분석 데이터를 보존하고 종료 버튼으로 다시 요청할 수 있습니다.
      if (!reportResultRef.current) {
        reportResultRef.current = await endInterviewSession(requireInterviewSessionId());
      }
      if (!mountedRef.current) return;
      // 상세 조회 URL에는 report_id가 아닌 동일한 서버 session_id를 사용합니다.
      sessionStorage.setItem("iv-report-session-id", sessionIdRef.current);
      sessionStorage.setItem("iv-current-id", sessionIdRef.current);
      // 리포트 생성 성공 후에만 분석 서버를 정리합니다. 정리 실패로 리포트를 재생성하지 않습니다.
      const cleanup = await Promise.allSettled([
        calibratedSession.current ? visionApi.endSession(sessionIdRef.current) : Promise.resolve(),
        endAudioSession(sessionIdRef.current),
      ]);
      if (cleanup.some((result) => result.status === "rejected")) {
        console.warn("리포트 생성은 완료되었으나 일부 분석 세션 정리에 실패했습니다.");
      }
      sessionStorage.removeItem("visionSessionId");
      if (mountedRef.current) onNavigate("dashboard");
    } catch (error) {
      setQuestionError(error instanceof Error ? error.message : "세션 종료에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const progress = (qIdx / questionCount) * 100;

  return (
    <div className="min-h-screen bg-[#f3fbfa] flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-border bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">질문</span>
            <span className="font-bold text-foreground">{qIdx + 1}</span>
            <span className="text-muted-foreground text-sm">
              / {questionCount}
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
                <Badge color="gray">답변 분석 중</Badge>
              )}
              {phase === "followup" && <Badge color="navy">답변 완료</Badge>}
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {phase === "followup-loading" ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <p className="text-muted-foreground text-sm">
                    답변의 음성과 자세·시선을 분석하고 있습니다...
                  </p>
                </div>
              ) : phase === "followup" ? (
                <VisionSummaryCard
                  summary={answerSummariesRef.current.at(-1)?.vision ?? null}
                  title="답변 분석 완료"
                  emptyMessage={
                    answerSummariesRef.current.at(-1)?.visionError ??
                    "카메라 측정 데이터가 없습니다."
                  }
                />
              ) : (
                <p className="text-foreground text-lg sm:text-xl leading-relaxed text-center">
                  {questionLoading ? "질문을 불러오는 중입니다." : currentQuestion?.done ? "모든 질문의 답변이 완료되었습니다." : currentQuestion?.question}
                </p>
              )}
            </div>
          </Card>

          {phase === "followup" && currentQuestion && !currentQuestion.done && (
            <div className="p-4 space-y-3">
              <p className="font-semibold">{currentQuestion.question}</p>
              <label className="block" htmlFor="answer-text">제출할 답변 내용</label>
              <p className="text-sm text-muted-foreground">음성 자동 변환은 아직 연결되지 않았습니다. 방금 말한 답변을 입력하거나 변환된 텍스트를 붙여넣어 주세요.</p>
              <textarea id="answer-text" rows={5} className="w-full border p-3 rounded-xl" value={answerText}
                disabled={busy || submittedAnswerId !== null} onChange={(event) => setAnswerText(event.target.value)} />
              {submittedAnswerId !== null && <p role="status">답변이 저장되었습니다.</p>}
              {(submittedAnswerId === null || currentQuestion.question_type !== "followup") && (
                <Button disabled={busy} onClick={handleSubmitAnswer}>
                  {busy ? "처리 중..." : submittedAnswerId !== null ? "꼬리질문 생성 재시도" : "답변 제출"}
                </Button>
              )}
            </div>
          )}
          {questionError && <div role="alert" className="p-4 text-red-600">{questionError}</div>}
          {phase === "prep" && questionError && <Button onClick={() => setQuestionAttempt((attempt) => attempt + 1)}>질문 다시 조회</Button>}
          {currentQuestion?.done && <Button disabled={busy} onClick={handleNext}>{busy ? "리포트 생성 중..." : "면접 종료 및 리포트 생성"}</Button>}
          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              aria-label={camOff ? "카메라 켜기" : "카메라 끄기"}
              disabled={busy || (initialCameraOff && camOff)}
              onClick={() => {
                camOffRef.current = !camOff;
                setCamOff(!camOff);
              }}
              className={`p-3 rounded-xl border transition-all ${camOff ? "bg-red" : "text-slate-300"}`}
            >
              {camOff ? (
                <CameraOff className="w-5 h-5" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>

            {phase === "prep" && (
              <Button
                onClick={handleStart}
                disabled={busy || questionLoading || !currentQuestion || currentQuestion.done || Boolean(questionError)}
                size="lg"
                className="px-10"
              >
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
            {phase === "followup" && currentQuestion && !currentQuestion.done && currentQuestion.question_type === "followup" && submittedAnswerId !== null && (
              <Button
                onClick={handleNext}
                disabled={busy}
                size="lg"
                className="px-10"
              >
                {"다음 질문 확인"}{" "}
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
              {
              phase === "prep"
                ? "준비가 되면 답변을 시작하세요"
                : recording
                  ? "면접이 진행 중입니다."
                  : "답변이 완료되었습니다."
                  }
            </div>
          </div>
          <Card className="p-5 feedback-panel">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold">실시간 피드백</h2>
            </div>
            {[
              { title: "자세 방향", message: poseFeedback },
              { title: "시선 방향", message: gazeFeedback },
            ].map((item) => (
              <div
                key={item.title}
                className="mb-4 rounded-xl border border-border p-3"
              >
                <h3 className="font-bold text-sm">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {camOff
                    ? "카메라가 꺼져 있어 측정하지 않습니다."
                    : item.message}
                </p>
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

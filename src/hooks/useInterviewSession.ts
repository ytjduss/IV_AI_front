import { useEffect, useRef, useState } from "react";
import type { Screen } from "../type/screen";
import type { AnswerAnalysis, PoseResult, GazeResult } from "../type/vision";
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
import {
  analyzeAudio,
  getAnswerSummary,
  getSessionSummary,
  endAudioSession,
} from "../api/audio";
import { InterviewFinalizer } from "../services/InterviewFinalizer";

export function useInterviewSession({
  onNavigate,
  initialCameraOff = false,
}: {
  onNavigate: (screen: Screen) => void;
  initialCameraOff?: boolean;
}) {
  const [phase, setPhase] = useState<
    "prep" | "answering" | "followup-loading" | "followup"
  >("prep");
  const [qIdx, setQIdx] = useState(0);
  const [camOff, setCamOff] = useState(initialCameraOff);
  const [timer, setTimer] = useState(30);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [poseStatus, setPoseStatus] = useState("자세 분석 대기");
  const [poseFeedback, setPoseFeedback] = useState("답변 시작 후 측정합니다.");
  const [gazeFeedback, setGazeFeedback] = useState("답변 시작 후 측정합니다.");
  const videoRef = useRef<HTMLVideoElement>(null);
  const calibratedSession = useRef(
    initialCameraOff ? null : sessionStorage.getItem("visionSessionId"),
  );
  const sessionIdRef = useRef(
    calibratedSession.current ??
      sessionStorage.getItem("interviewSessionId") ??
      `interview-${crypto.randomUUID()}`,
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const answerActiveRef = useRef(false);
  const answerSummariesRef = useRef<AnswerAnalysis[]>([]);
  const trackingRef = useRef<ReturnType<typeof createVisionTracking> | null>(
    null,
  );
  const camOffRef = useRef(camOff);
  const mountedRef = useRef(true);
  const finalizerRef = useRef<InterviewFinalizer | null>(null);
  const questions = [
    "자기소개를 해주세요. 본인의 핵심 역량을 중심으로 간단히 말씀해 주세요.",
  ];

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
  ): string => {
    if (result.status === "fulfilled")
      return visionFeedback(result.value, kind);
    const error = result.reason;
    if (error instanceof VisionApiError && error.data) {
      const detail = error.data.detail;
      const reason =
        error.data.reason ??
        (detail && typeof detail === "object"
          ? (detail as Record<string, unknown>).reason
          : detail);
      if (
        ["not_calibrated", "no_person_detected", "no_face_detected"].includes(
          String(reason),
        )
      ) {
        return visionFeedback({ reason } as PoseResult | GazeResult, kind);
      }
    }
    return error instanceof Error
      ? error.message
      : "측정 결과를 불러오지 못했습니다.";
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
    if (!answerActiveRef.current || busyRef.current) return;
    answerActiveRef.current = false;
    busyRef.current = true;
    setBusy(true);
    setRecording(false);
    setPhase("followup-loading");
    // Stop scheduling, wait for already-sent checks, then reset the answer buffer exactly once.
    const vision = async () => {
      await trackingRef.current?.stop();
      if (!mountedRef.current || !calibratedSession.current) return null;
      return requireVisionSummary(
        await visionApi.summarizeAnswer(sessionIdRef.current),
      );
    };
    const [visionResult, audioResult] = await Promise.allSettled([
      vision(),
      finishAudio(),
    ]);
    if (!mountedRef.current) return;
    const analysis: AnswerAnalysis = {
      questionIndex: qIdx,
      question: questions[qIdx],
      vision: null,
    };
    if (visionResult.status === "fulfilled")
      analysis.vision = visionResult.value;
    else
      analysis.visionError =
        visionResult.reason instanceof Error
          ? visionResult.reason.message
          : "답변 자세·시선 요약 실패";
    if (audioResult.status === "fulfilled") analysis.audio = audioResult.value;
    else
      analysis.audioError =
        audioResult.reason instanceof Error
          ? audioResult.reason.message
          : "음성 분석 실패";
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
    if (busyRef.current || answerActiveRef.current) return;

    if (!camOff && !calibratedSession.current) {
      setPoseStatus("장비 테스트에서 기준 자세를 먼저 측정해 주세요.");
      return;
    }

    busyRef.current = true;
    setBusy(true);
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const recorder = new MediaRecorder(stream);
      // 답변 시작 전 리셋
      if (calibratedSession.current) {
        const result = await visionApi.startAnswer(sessionIdRef.current);
        if (result?.success === false || result?.reason)
          throw new Error(
            "답변 추적을 시작하지 못했습니다. 다시 시도해 주세요.",
          );
      }
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      answerActiveRef.current = true;
      setRecording(true);
      setPhase("answering");
      setTimer(90);
      setPoseStatus(
        calibratedSession.current
          ? "답변 중 자세와 시선을 측정합니다."
          : "카메라 없이 답변을 녹음합니다.",
      );
      startVisionTracking();
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      answerActiveRef.current = false;
      setRecording(false);
      setPoseStatus(
        error instanceof Error ? error.message : "답변을 시작하지 못했습니다.",
      );
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };
  const handleDone = () => {
    void finishAnswer();
  };
  const finishInterview = async () => {
    if (busyRef.current || phase !== "followup") return;
    busyRef.current = true;
    setBusy(true);
    setPoseStatus("면접 전체 결과를 저장하고 있습니다.");
    try {
      await trackingRef.current?.stop();
      if (!mountedRef.current) return;
      finalizerRef.current ??= new InterviewFinalizer(
        sessionIdRef.current,
        !calibratedSession.current,
        {
          getAudioSummary: getSessionSummary,
          endVision: visionApi.endSession,
          endAudio: endAudioSession,
          storage: sessionStorage,
        },
      );
      await finalizerRef.current.finish(answerSummariesRef.current);
      // This application names its result screen "dashboard", not "result".
      if (mountedRef.current) onNavigate("dashboard");
    } catch (error) {
      console.error("면접 종료 처리 실패:", error);
      if (mountedRef.current)
        setPoseStatus(
          `면접 종료 처리 실패: ${error instanceof Error ? error.message : "서버 연결을 확인해 주세요."} 다시 면접 종료를 눌러 주세요.`,
        );
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  };

  const handleNext = () => {
    if (busyRef.current) return;
    if (qIdx < questions.length - 1) {
      setQIdx((q) => q + 1);
      setPhase("prep");
      setTimer(30);
      return;
    }
    void finishInterview();
  };

  const toggleCamera = () => {
    camOffRef.current = !camOff;
    setCamOff(!camOff);
  };
  return {
    phase,
    qIdx,
    questions,
    camOff,
    timer,
    recording,
    busy,
    poseStatus,
    poseFeedback,
    gazeFeedback,
    videoRef,
    hasCalibratedSession: Boolean(calibratedSession.current),
    latestAnswer: answerSummariesRef.current.at(-1),
    handleStart,
    handleDone,
    handleNext,
    toggleCamera,
  };
}

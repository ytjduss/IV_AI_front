import { requireInterviewSessionId } from "../lib/interviewSession";
import { healthCheck } from "../api/health";
import type { Screen } from "../type/screen";
import { useEffect, useRef, useState } from "react";
import {
  captureVideoFrame,
  visionApi,
  VisionApiError,
} from "../app/lib/vision-api";
import {
  AlertCircle,
  CameraOff,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import CalibrationOverlay from "../components/calibration/CalibrationOverlay";
import { calibrationMessage, collectCalibration } from "../lib/calibration";
import type { BodyOutline, TargetZone } from "../type/calibration";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { startAudioSession } from "../api/audio";

function DeviceTestScreen({
  onNavigate,
  onStartWithoutCamera,
}: {
  onNavigate: (s: Screen) => void;
  onStartWithoutCamera: () => void;
}) {
  const startWithoutCamera = async () => {
    if (testing) return;
    setTesting(true);
    try {
      const sessionId = requireInterviewSessionId();
      await startAudioSession(sessionId);
      sessionStorage.setItem("interviewSessionId", sessionId);
      sessionStorage.removeItem("visionSessionId");
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getVideoTracks().forEach((track) => track.stop());
      onStartWithoutCamera();
    } catch (error) {
      setVisionStatus(
        error instanceof Error
          ? error.message
          : "음성 세션을 시작하지 못했습니다.",
      );
    } finally {
      setTesting(false);
    }
  };
  const [cameraOK, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [noiseOk, setNoiseOk] = useState(false);
  const [netOk, setNetOk] = useState(navigator.onLine);
  const [healthStatus, setHealthStatus] = useState<"loading" | "ok" | "error">("loading");
  const [healthError, setHealthError] = useState("");
  const [healthAttempt, setHealthAttempt] = useState(0);
  const [testing, setTesting] = useState(false);
  const [calibrationReady, setCalibrationReady] = useState(false);
  const [calibrationFinalized, setCalibrationFinalized] = useState(false);
  const [calibrationMetrics, setCalibrationMetrics] = useState<
    Array<{ label: string; value: number }>
  >([]);
  const [micLevel, setMicLevel] = useState(0);
  const [ambientLevel, setAmbientLevel] = useState(0);
  const [visionStatus, setVisionStatus] = useState("카메라 연결 중");
  const [frameCount, setFrameCount] = useState(0);
  const [outline, setOutline] = useState<BodyOutline | null>(null);
  const [targetZone, setTargetZone] = useState<TargetZone | null>(null);
  const [videoRatio, setVideoRatio] = useState(16 / 9);
  const calibrationController = useRef<AbortController | null>(null);
  const [poseFeedback, setPoseFeedback] = useState(
    "카메라 중앙에 얼굴과 양쪽 어깨가 보이도록 앉아 주세요.",
  );
  const [poseFeedbackLevel, setPoseFeedbackLevel] = useState<
    "waiting" | "good" | "adjust"
  >("waiting");
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionIdRef = useRef(sessionStorage.getItem("interviewSessionId") ?? "");

  useEffect(() => {
    return () => calibrationController.current?.abort();
  }, []);

  useEffect(() => {
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    // 인터넷 연결 여부와 실제 백엔드 GET / 응답을 구분합니다.
    const checkNetwork = async () => {
      controller?.abort();
      clearTimeout(timer);
      const current = new AbortController();
      controller = current;
      setNetOk(navigator.onLine);
      setHealthError("");
      if (!navigator.onLine) {
        setHealthStatus("error");
        setHealthError("인터넷 연결을 확인해 주세요.");
        return;
      }
      setHealthStatus("loading");
      // 응답 없는 서버 때문에 확인 중 상태가 무한히 유지되지 않게 제한합니다.
      timer = setTimeout(() => current.abort(), 8000);
      try {
        // Health Check: 장비 테스트 진입/온라인 복귀/재검사 시 GET /를 호출합니다.
        // HTTP 성공과 { status: "ok" }를 모두 확인한 뒤 정상 연결로 표시합니다.
        await healthCheck(current.signal);
        if (!disposed && controller === current) setHealthStatus("ok");
      } catch (error) {
        if (!disposed && controller === current) {
          setHealthStatus("error");
          setHealthError(current.signal.aborted ? "서버 응답 시간이 초과되었습니다." : error instanceof Error ? error.message : "서버 연결에 실패했습니다.");
        }
      } finally {
        if (controller === current) clearTimeout(timer);
      }
    };
    const handleConnection = () => void checkNetwork();
    window.addEventListener("online", handleConnection);
    window.addEventListener("offline", handleConnection);
    void checkNetwork();
    return () => {
      disposed = true;
      controller?.abort();
      clearTimeout(timer);
      window.removeEventListener("online", handleConnection);
      window.removeEventListener("offline", handleConnection);
    };
  }, [healthAttempt]);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    let disposed = false;
    let audioContext: AudioContext | null = null;
    let animationFrame = 0;
    let ambientTimer = 0;
    let ambientCollecting = true;
    const ambientSamples: number[] = [];

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        mediaStream = stream;
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            const hasVideo = Boolean(
              videoRef.current?.videoWidth && videoRef.current?.videoHeight,
            );
            if (hasVideo && videoRef.current) {
              setVideoRatio(
                videoRef.current.videoWidth / videoRef.current.videoHeight,
              );
            }
            setCameraOk(hasVideo && videoTrack?.readyState === "live");
            setVisionStatus(
              hasVideo
                ? "카메라 영상 확인 완료"
                : "카메라 영상을 확인할 수 없습니다",
            );
          };
        }
        setMicOk(
          Boolean(
            audioTrack &&
            audioTrack.readyState === "live" &&
            audioTrack.enabled,
          ),
        );

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
          const level = Math.max(
            0,
            Math.min(100, ((decibels + 60) / 60) * 100),
          );
          setMicLevel(level);
          if (ambientCollecting) ambientSamples.push(level);
          animationFrame = requestAnimationFrame(measureAudio);
        };
        measureAudio();

        ambientTimer = window.setTimeout(() => {
          ambientCollecting = false;
          const average = ambientSamples.length
            ? ambientSamples.reduce((sum, value) => sum + value, 0) /
              ambientSamples.length
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
      window.clearTimeout(ambientTimer);
      cancelAnimationFrame(animationFrame);
      void audioContext?.close();
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const runTest = async () => {
    if (testing || calibrationController.current || !cameraOK) return;
    let sessionId: string;
    try { sessionId = requireInterviewSessionId(); }
    catch (error) { setVisionStatus((error as Error).message); return; }
    const controller = new AbortController();
    calibrationController.current = controller;

    // 재측정 시에도 생성된 서버 세션 ID를 그대로 사용합니다.
    sessionIdRef.current = sessionId;
    sessionStorage.removeItem("visionSessionId");
    setTesting(true);
    setCalibrationReady(false);
    setCalibrationFinalized(false);
    setCalibrationMetrics([]);
    setFrameCount(0);
    setOutline(null);
    setTargetZone(null);
    setPoseFeedbackLevel("waiting");
    setPoseFeedback(
      "어깨 중심을 목표 구역에 맞추고 카메라를 정면으로 바라봐 주세요.",
    );
    setVisionStatus("약 5초 동안 자세를 측정합니다.");
    const timeout = window.setTimeout(
      () =>
        controller.abort(
          new Error(
            "서버 응답이 지연되고 있습니다. 연결을 확인하고 다시 측정해 주세요.",
          ),
        ),
      30000,
    );
    try {
      // 프레임 당 측정임
      const baseline = await collectCalibration({
        signal: controller.signal,
        sendFrame: async () => {
          if (!videoRef.current) throw new Error("카메라를 찾을 수 없습니다.");

          const frame = await captureVideoFrame(videoRef.current);
          controller.signal.throwIfAborted();

          return visionApi.calibrateFrame(sessionId, frame, controller.signal);
        },

        onFrame: (result) => {
          setNetOk(true);

          //서버 frame_count
          setFrameCount(result.frame_count);
          //body outline
          setOutline(result.body_outline ?? null);
          //target_zone (기준)
          setTargetZone(result.target_zone ?? null);

          const accepted = !result.reason && result.success !== false;

          //피드백 레벨 설정.. (나중에)
          setPoseFeedbackLevel(accepted ? "good" : "adjust");
          //피드백 연결 하기
          setPoseFeedback(
            result.reason
              ? calibrationMessage(result.reason)
              : accepted
                ? "카메라를 바라보며 현재 자세를 유지해 주세요."
                : "얼굴과 어깨 위치를 확인하고 카메라를 바라봐 주세요.",
          );
        },
        finalize: () => {
          setVisionStatus("수집한 프레임으로 기준 자세를 정하는 중");
          //finalize 추가 해야됨
          return visionApi.finalizeCalibration(sessionId, controller.signal);
        },
      });
      sessionStorage.setItem("visionSessionId", sessionId);
      setCalibrationMetrics([
        { label: "어깨 기울기", value: baseline.shoulder_tilt },
        { label: "목 전방 비율", value: baseline.neck_forward_ratio },
        { label: "어깨 너비", value: baseline.shoulder_width },
      ]);
      setCalibrationFinalized(true);
      setCalibrationReady(true);
      setPoseFeedbackLevel("good");
      setPoseFeedback(
        "기준 자세가 저장되었습니다. 면접 중에도 이 자세를 유지해 주세요.",
      );
      setVisionStatus("장비 테스트 완료");
    } catch (error) {
      // Navigation/unmount cancellation must not update an obsolete screen.
      if (
        controller.signal.aborted &&
        controller.signal.reason?.name === "AbortError"
      )
        return;
      const data = error instanceof VisionApiError ? error.data : null;
      const detail = data?.detail;
      const reason =
        data?.reason ??
        (detail && typeof detail === "object"
          ? (detail as Record<string, unknown>).reason
          : detail);
      const message =
        typeof reason === "string"
          ? calibrationMessage(reason)
          : error instanceof Error
            ? error.message
            : "자세 측정에 실패했습니다. 다시 측정해 주세요.";
      setVisionStatus(message);
      setPoseFeedback(message);
      setPoseFeedbackLevel("adjust");
    } finally {
      window.clearTimeout(timeout);
      if (calibrationController.current === controller) {
        calibrationController.current = null;
        if (
          !controller.signal.aborted ||
          controller.signal.reason?.name !== "AbortError"
        )
          setTesting(false);
      }
    }
  };

  const startInterview = async () => {
    if (testing || !calibrationReady || !calibrationFinalized) return;
    setTesting(true);
    setVisionStatus("면접 화면 준비 중");
    try {
      await startAudioSession(requireInterviewSessionId());
      sessionStorage.setItem("interviewSessionId", sessionIdRef.current);
      onNavigate("interview");
    } catch (error) {
      setVisionStatus(
        error instanceof Error
          ? error.message
          : "면접 준비에 실패했습니다. 다시 시도.",
      );
    } finally {
      setTesting(false);
    }
  };

  const checks = [
    { label: "카메라", ok: cameraOK },
    { label: "마이크", ok: micOk },
    { label: "주변 소음", ok: noiseOk },
    { label: "인터넷 연결", ok: netOk },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <Card className="p-4 mb-6" aria-busy={healthStatus === "loading"}>
          <p role="status">백엔드 서버: {healthStatus === "loading" ? "확인 중" : healthStatus === "ok" ? "정상 연결" : "연결 확인 필요"}</p>
          {healthError && <p role="alert" className="mt-2 text-red-600">{healthError}</p>}
          <Button className="mt-3" variant="outline" disabled={healthStatus === "loading"} onClick={() => setHealthAttempt((attempt) => attempt + 1)}>서버 연결 재검사</Button>
        </Card>
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-foreground mt-3">
            장비 테스트
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          {/* Camera Preview */}
          <Card className="p-5 rounded-none">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h1 className="font-bold text-foreground">카메라</h1>
              <Button size="sm" onClick={startWithoutCamera} disabled={testing}>
                <CameraOff size={45} />
                웹캠 끄고 면접 진행하기
              </Button>
            </div>
            <div
              className="relative bg-slate-900 rounded-none overflow-hidden flex items-center justify-center"
              style={{ aspectRatio: videoRatio }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-contain"
              />
              <CalibrationOverlay outline={outline} targetZone={targetZone} />
              {!cameraOK && (
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
                    <Users className="w-10 h-10 text-slate-400" />
                  </div>
                  <span className="text-slate-400 text-xs">
                    카메라 권한 허용 후 표시됩니다
                  </span>
                </div>
              )}
              <div className="absolute bottom-3 right-3">
                <Badge color={cameraOK ? "green" : "red"}>
                  {cameraOK ? "카메라 정상" : "확인 중"}
                </Badge>
              </div>
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 rounded-lg px-2 py-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white text-xs">LIVE</span>
              </div>
            </div>
            <p
              role="status"
              className="text-xs text-muted-foreground mt-2 text-center"
            >
              {visionStatus}
            </p>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              유효 프레임 {frameCount}개 · 점선 구역에 노란색 어깨 중심점을 맞춰
              주세요.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              {calibrationMetrics
                .filter(
                  (metric) =>
                    !["유효 프레임", "수집 프레임", "진행률"].includes(
                      metric.label,
                    ),
                )
                .map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-2"
                  >
                    <p
                      className="text-[11px] text-muted-foreground truncate"
                      title={metric.label}
                    >
                      {metric.label}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {metric.value.toFixed(3)}
                    </p>
                  </div>
                ))}
            </div>
            <div
              className={`mt-3 rounded-2xl border p-4 ${poseFeedbackLevel === "good" ? "bg-emerald-50 border-emerald-200" : poseFeedbackLevel === "adjust" ? "bg-amber-50 border-amber-200" : "bg-muted/50 border-border"}`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="font-bold text-foreground">자세 측정</h3>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {poseFeedback}
              </p>
            </div>
          </Card>

          {/* Status Checks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-bold text-foreground mb-3">장비 상태</h3>
              <div className="grid grid-cols-2 gap-3">
                {checks.map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center gap-3 p-3 rounded-none bg-muted/50"
                  >
                    <span className="font-medium text-foreground flex-1">
                      {c.label}
                    </span>
                    {testing ? (
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    ) : c.ok ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs text-emerald-600 font-medium">
                          정상
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-red-600 font-medium">
                          오류
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-bold text-foreground mb-3">
                마이크 음량 테스트
              </h3>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-100"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                실제 마이크 입력입니다. 주변 소음 측정값: {ambientLevel}% · 측정
                시간 동안 조용히 있어주세요.
              </p>
            </Card>
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <Button onClick={runTest} disabled={testing || !cameraOK}>
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {calibrationReady ? "다시 측정" : "5초 측정 시작"}
          </Button>
          <div className="flex gap-3">
            <Button disabled={testing} onClick={() => onNavigate("job-select")}>
              이전
            </Button>

            <Button
              onClick={startInterview}
              disabled={!calibrationReady || testing}
            >
              면접 시작 <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeviceTestScreen;

import type { Screen } from "../type/screen";
import { useEffect, useRef, useState } from "react";
import { captureVideoFrame, visionApi } from "../app/lib/vision-api";
import {
  Activity,
  AlertCircle,
  Badge,
  CameraOff,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

function DeviceTestScreen({
  onNavigate,
  onStartWithoutCamera,
}: {
  onNavigate: (s: Screen) => void;
  onStartWithoutCamera: () => void;
}) {
  const startWithoutCamera = () => {
    if (!testing) return;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getVideoTracks().forEach((track) => track.stop());
    onStartWithoutCamera();
  };
  const [cameraOK, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [noiseOk, setNoiseOk] = useState(false);
  const [netOk, setNetOk] = useState(false);
  const [testing, setTesting] = useState(false);
  const [calibrationReady, setCalibrationReady] = useState(false);
  const [calibrationFinalized, setCalibrationFinalized] = useState(false);
  const [calibrationMetrics, setCalibrationMetrics] = useState<
    Array<{ label: string; value: number }>
  >([]);
  const [micLevel, setMicLevel] = useState(0);
  const [ambientLevel, setAmbientLevel] = useState(0);
  const [visionStatus, setVisionStatus] = useState("카메라 연결 중");
  const [poseErrorRate, setPoseErrorRate] = useState<number | null>(null);
  const [poseFeedback, setPoseFeedback] = useState(
    "카메라 중앙에 얼굴과 양쪽 어깨가 보이도록 앉아 주세요.",
  );
  const [poseFeedbackLevel, setPoseFeedbackLevel] = useState<
    "waiting" | "good" | "adjust"
  >("waiting");
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
      Object.entries(value as Record<string, unknown>).forEach(
        ([key, nested]) => {
          const nextPath = path ? `${path}.${key}` : key;
          if (typeof nested === "number" && Number.isFinite(nested)) {
            const normalizedKey = key.toLowerCase();
            if (
              ![/timestamp/, /session/, /width$/, /height$/].some((pattern) =>
                pattern.test(normalizedKey),
              )
            ) {
              metrics.push({
                label: labels[normalizedKey] ?? nextPath,
                value: nested,
              });
            }
          } else if (
            nested &&
            typeof nested === "object" &&
            !Array.isArray(nested)
          ) {
            visit(nested, nextPath);
          }
        },
      );
    };

    visit(result);
    return metrics.slice(0, 6);
  };

  const formatMetricValue = (label: string, value: number) => {
    const isRatio =
      /confidence|visibility|ratio|score/i.test(label) ||
      /신뢰도|가시성/.test(label);
    if (isRatio && value >= 0 && value <= 1)
      return `${(value * 100).toFixed(1)}%`;
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  };

  const findYValues = (result: unknown) => {
    const values: Record<string, number> = {};
    const visit = (value: unknown, path = "") => {
      if (!value || typeof value !== "object") return;
      Object.entries(value as Record<string, unknown>).forEach(
        ([key, nested]) => {
          const nextPath = path ? `${path}.${key}` : key;
          if (
            typeof nested === "number" &&
            Number.isFinite(nested) &&
            /(^y$|_y$|y_|\.y$)/i.test(key)
          ) {
            values[nextPath] = nested;
          } else if (nested && typeof nested === "object") {
            visit(nested, nextPath);
          }
        },
      );
    };
    visit(result);
    return values;
  };

  const findNumericValues = (result: unknown) => {
    const values: Record<string, number> = {};
    const visit = (value: unknown, path = "") => {
      if (!value || typeof value !== "object") return;
      Object.entries(value as Record<string, unknown>).forEach(
        ([key, nested]) => {
          const nextPath = path ? `${path}.${key}` : key;
          if (typeof nested === "number" && Number.isFinite(nested))
            values[nextPath] = nested;
          else if (nested && typeof nested === "object")
            visit(nested, nextPath);
        },
      );
    };
    visit(result);
    return values;
  };

  const updatePoseFeedback = (result: unknown) => {
    const numericValues = findNumericValues(result);
    const entries = Object.entries(numericValues);
    const findMetric = (patterns: RegExp[]) =>
      entries.find(([key]) =>
        patterns.some((pattern) => pattern.test(key)),
      )?.[1];
    const explicitError = findMetric([
      /posture_movement_percent/i,
      /movement_percent/i,
      /error_rate/i,
      /deviation_percent/i,
      /error_percent/i,
    ]);
    const deltaY = findMetric([
      /delta_y/i,
      /y_diff/i,
      /y_offset/i,
      /vertical.*deviation/i,
    ]);
    const deltaX = findMetric([
      /delta_x/i,
      /x_diff/i,
      /x_offset/i,
      /horizontal.*deviation/i,
    ]);
    const normalizedError =
      explicitError !== undefined
        ? explicitError <= 1
          ? explicitError * 100
          : explicitError
        : Math.max(Math.abs(deltaY ?? 0), Math.abs(deltaX ?? 0)) * 100;
    const errorRate = Math.max(0, Math.min(100, normalizedError));
    setPoseErrorRate(errorRate);

    if (errorRate <= 8) {
      setPoseFeedbackLevel("good");
      setPoseFeedback(
        "현재 자세가 안정적입니다. 시선과 어깨 위치를 그대로 유지하세요.",
      );
    } else if (
      deltaY !== undefined &&
      Math.abs(deltaY) >= Math.abs(deltaX ?? 0)
    ) {
      setPoseFeedbackLevel("adjust");
      setPoseFeedback(
        deltaY > 0
          ? "상체가 기준보다 아래에 있습니다. 허리를 세우고 얼굴과 어깨를 조금 올려 주세요."
          : "상체가 기준보다 위에 있습니다. 어깨의 힘을 빼고 앉은 위치를 조금 낮춰 주세요.",
      );
    } else if (deltaX !== undefined) {
      setPoseFeedbackLevel("adjust");
      setPoseFeedback(
        deltaX > 0
          ? "몸이 기준보다 오른쪽에 있습니다. 상체를 화면 중앙 쪽으로 조금 옮겨 주세요."
          : "몸이 기준보다 왼쪽에 있습니다. 상체를 화면 중앙 쪽으로 조금 옮겨 주세요.",
      );
    } else {
      setPoseFeedbackLevel("adjust");
      setPoseFeedback(
        "기준 자세와 차이가 큽니다. 허리를 세우고 양쪽 어깨가 수평이 되도록 몸의 흔들림을 줄여 주세요.",
      );
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
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearTimeout(ambientTimer);
      cancelAnimationFrame(animationFrame);
      void audioContext?.close();
      mediaStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const runTest = async () => {
    if (testing || !cameraOK) return;
    setTesting(true);
    setCalibrationReady(false);
    setCalibrationFinalized(false);
    setCalibrationMetrics([]);
    setVisionStatus("5초 측정 준비 중");
    try {
      await visionApi.probe();
      setNetOk(true);
      if (!videoRef.current) throw new Error("카메라를 찾을 수 없습니다.");
      let acceptedFrames = 0;
      for (let index = 0; index < 10; index += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        const frame = await captureVideoFrame(videoRef.current);
        const result = await visionApi.calibrateFrame(
          sessionIdRef.current,
          frame,
        );
        // 일부 서버 응답은 HTTP 200이어도 success 필드를 생략한다.
        // request()가 2xx 응답만 반환하므로 명시적인 실패가 아니면 유효 프레임으로 센다.
        if (result?.success !== false) {
          acceptedFrames += 1;
        }
        const metrics = extractCalibrationMetrics(result);
        if (metrics.length > 0) setCalibrationMetrics(metrics);
        setVisionStatus("측정 중입니다. 자세를 유지해 주세요.");
      }
      if (acceptedFrames === 0)
        throw new Error("기준값으로 사용할 수 있는 프레임이 없습니다.");
      setVisionStatus("자세 기준값 확정 및 check 요청 중");
      const finalized = await visionApi.finalizeCalibration(
        sessionIdRef.current,
      );
      if (finalized?.success === false) {
        throw new Error(
          typeof finalized?.reason === "string"
            ? finalized.reason
            : "자세 기준값을 확정하지 못했습니다.",
        );
      }
      setCalibrationFinalized(true);

      console.info("[장비 테스트] 기준값 확정 완료 · 프레임별 자세 check 시작");
      let poseCheckResult: Record<string, unknown> | null = null;
      for (let index = 0; index < 10; index += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        const checkFrame = await captureVideoFrame(videoRef.current);
        try {
          poseCheckResult = await visionApi.checkPose(
            sessionIdRef.current,
            checkFrame,
          );
          updatePoseFeedback(poseCheckResult);
          console.info(
            `[장비 테스트] 확정 후 프레임 ${index + 1}/10 자세 check`,
            {
              yValues: findYValues(poseCheckResult),
              numericValues: findNumericValues(poseCheckResult),
              data: poseCheckResult,
            },
          );
          console.info(
            `[장비 테스트 RAW] 프레임 ${index + 1}/10 /vision/check\n${JSON.stringify(poseCheckResult, null, 2)}`,
          );
        } catch (checkError) {
          console.error(
            `[장비 테스트] 확정 후 프레임 ${index + 1}/10 자세 check 실패`,
            checkError,
          );
        }
      }

      const gazeFrame = await captureVideoFrame(videoRef.current);
      let visionCheckResult: Record<string, unknown> | null = null;
      try {
        visionCheckResult = await visionApi.checkGaze(
          sessionIdRef.current,
          gazeFrame,
        );
        console.info(
          "[장비 테스트] 시선 check (/vision/gaze-check) 결과",
          visionCheckResult,
        );
      } catch (gazeError) {
        console.error(
          "[장비 테스트] 시선 check (/vision/gaze-check) 실패",
          gazeError,
        );
      }
      const checkMetrics = [
        ...extractCalibrationMetrics(poseCheckResult),
        ...extractCalibrationMetrics(visionCheckResult),
      ].slice(0, 6);
      if (checkMetrics.length > 0) setCalibrationMetrics(checkMetrics);
      setCalibrationReady(true);
      setVisionStatus("장비 테스트 완료");
    } catch (error) {
      setVisionStatus(
        error instanceof Error
          ? error.message
          : "Vision API 연결에 실패했습니다.",
      );
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
        const result = await visionApi.finalizeCalibration(
          sessionIdRef.current,
        );
        if (result?.success === false) {
          throw new Error(
            typeof result?.reason === "string"
              ? result.reason
              : "자세 기준값을 확정하지 못했습니다.",
          );
        }
      }
      setVisionStatus("자세 기준값 확정 완료");
      onNavigate("interview");
    } catch (error) {
      setVisionStatus(
        error instanceof Error
          ? error.message
          : "캘리브레이션 확정에 실패했습니다.",
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
        <div className="mb-10 text-center">
          <Badge color="mint">STEP 2</Badge>
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
            <div className="relative aspect-video min-h-[420px] bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
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
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {visionStatus}
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
                      {formatMetricValue(metric.label, metric.value)}
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
            <Button onClick={() => onNavigate("job-select")}>이전</Button>
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

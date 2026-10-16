import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

export function MicrophoneTest({ onMicStatus, onNoiseStatus }: {
  onMicStatus: (ok: boolean) => void;
  onNoiseStatus: (ok: boolean) => void;
}) {
  const [state, setState] = useState<"idle" | "starting" | "ambient" | "active" | "error">("idle");
  const [level, setLevel] = useState(0);
  const [noise, setNoise] = useState<number | null>(null);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const cleanup = useRef<() => void>(() => {});
  const starting = useRef(false);

  useEffect(() => () => { generation.current++; cleanup.current(); }, []);

  const stop = () => {
    generation.current++;
    cleanup.current();
    starting.current = false;
    setState("idle");
    setLevel(0);
    onMicStatus(false);
    onNoiseStatus(false);
  };

  const start = async () => {
    if (starting.current) return;
    starting.current = true;
    cleanup.current();
    const run = ++generation.current;
    let stream: MediaStream | undefined;
    let context: AudioContext | undefined;
    let frame = 0;
    cleanup.current = () => {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
    setError("");
    setLevel(0);
    setNoise(null);
    setState("starting");
    onMicStatus(false);
    onNoiseStatus(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("HTTPS 또는 localhost에서 마이크 테스트를 실행해 주세요.");
      context = new AudioContext();
      await context.resume();
      if (run !== generation.current) return;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (run !== generation.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) throw new Error("마이크 입력 장치를 찾지 못했습니다.");
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      // destination에 연결하지 않아 스피커 피드백을 방지합니다.
      const samples = new Float32Array(analyser.fftSize);
      const startTime = performance.now();
      let sum = 0;
      let count = 0;
      let measured = false;
      setState("ambient");
      const measure = () => {
        if (run !== generation.current) return;
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((total, value) => total + value * value, 0) / samples.length);
        const volume = Math.max(0, Math.min(100, (20 * Math.log10(Math.max(rms, 0.00001)) + 60) / 60 * 100));
        setLevel(Math.round(volume));
        onMicStatus(audioTrack.readyState === "live" && !audioTrack.muted && audioTrack.enabled);
        if (!measured) {
          sum += volume; count++;
          if (performance.now() - startTime >= 3000) {
            measured = true;
            setNoise(Math.round(sum / count));
            onNoiseStatus(sum / count < 35);
            setState("active");
          }
        }
        frame = requestAnimationFrame(measure);
      };
      measure();
    } catch (cause) {
      if (run !== generation.current) return;
      cleanup.current();
      setState("error");
      setError(cause instanceof DOMException && cause.name === "NotAllowedError"
        ? "마이크 권한을 허용한 후 다시 시도해 주세요."
        : cause instanceof Error ? cause.message : "마이크 테스트에 실패했습니다.");
    } finally {
      if (run === generation.current) starting.current = false;
    }
  };

  return <div>
    <h3 className="font-bold text-foreground mb-3">마이크 음량 테스트</h3>
    <div role="meter" aria-label="마이크 입력 음량" aria-valuemin={0} aria-valuemax={100} aria-valuenow={level}
      className="h-3 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-primary transition-all duration-100" style={{ width: `${level}%` }} />
    </div>
    <p role="status" className="text-sm mt-3">
      {state === "starting" ? "마이크 권한을 확인하고 있습니다." : state === "ambient" ? "3초 동안 조용히 있어 주세요. 주변 소음을 측정합니다."
        : state === "active" ? `말씀해 보세요. 입력 음량 ${level}% · 주변 소음 ${noise}%` : "버튼을 눌러 마이크를 확인하세요."}
    </p>
    <p className="text-xs text-muted-foreground mt-2">브라우저에서만 측정하며 음성을 녹음하거나 서버에 전송하지 않습니다. 수치는 상대적인 입력 크기입니다.</p>
    {error && <p role="alert" className="text-red-600 mt-2">{error}</p>}
    <div className="flex gap-2 mt-3">
      <Button onClick={start} disabled={state === "starting"}>{state === "active" || state === "ambient" ? "다시 측정" : "마이크 테스트 시작"}</Button>
      {(state === "active" || state === "ambient" || state === "starting") && <Button variant="outline" onClick={stop}>테스트 종료</Button>}
    </div>
  </div>;
}

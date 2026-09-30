import type {
  AnswerAnalysis,
  InterviewAnalysis,
  VisionSummary,
} from "../type/vision";
import { requireVisionSummary } from "../lib/visionTracking";

export type FinalInterviewAnalysis = {
  audio: unknown;
  vision: VisionSummary | null;
};
type Dependencies = {
  getAudioSummary: (sessionId: string) => Promise<unknown>;
  endVision: (sessionId: string) => Promise<VisionSummary>;
  endAudio: (sessionId: string) => Promise<unknown>;
  storage: Pick<Storage, "setItem" | "removeItem">;
};

/** Owns one session's completion state so retries never repeat successful destructive calls. */
export class InterviewFinalizer {
  private audio: unknown;
  private audioLoaded = false;
  private vision: VisionSummary | null = null;
  private visionEnded = false;
  private audioEnded = false;
  private inFlight: Promise<FinalInterviewAnalysis> | null = null;

  constructor(
    private sessionId: string,
    private cameraSkipped: boolean,
    private dependencies: Dependencies,
  ) {}

  finish(answers: AnswerAnalysis[]): Promise<FinalInterviewAnalysis> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.complete(answers).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async complete(answers: AnswerAnalysis[]) {
    const { getAudioSummary, endVision, endAudio, storage } = this.dependencies;
    // 1. Obtain audio before any session data is deleted.
    if (!this.audioLoaded) {
      const audio = await getAudioSummary(this.sessionId);
      if (!audio || typeof audio !== "object")
        throw new Error("오디오 전체 결과를 받지 못했습니다.");
      this.audio = audio;
      this.audioLoaded = true;
    }
    // 2. Vision returns the result and deletes its buffers in one operation.
    if (!this.cameraSkipped && !this.visionEnded) {
      this.vision = await endVision(this.sessionId);
      this.visionEnded = true;
    }
    if (!this.cameraSkipped) requireVisionSummary(this.vision);
    const finalAnalysis: FinalInterviewAnalysis = {
      audio: this.audio,
      vision: this.vision,
    };
    const analysis: InterviewAnalysis = {
      audioSession: this.audio,
      visionSession: this.vision,
      cameraSkipped: this.cameraSkipped,
      answerSummaries: answers,
    };
    // 3. Save both the requested final format and the existing report screen's format.
    // If storage fails, do not delete audio. Cached results let the user retry saving.
    storage.setItem("finalInterviewAnalysis", JSON.stringify(finalAnalysis));
    storage.setItem("interviewAnalysis", JSON.stringify(analysis));
    storage.setItem("audioSessionSummary", JSON.stringify(this.audio));
    storage.setItem("iv-current-id", this.sessionId);
    // 4. Only clean up audio after the results are stored successfully.
    if (!this.audioEnded) {
      await endAudio(this.sessionId);
      this.audioEnded = true;
    }
    storage.removeItem("visionSessionId");
    storage.removeItem("interviewSessionId");
    // The caller navigates only after this promise resolves.
    return finalAnalysis;
  }
}

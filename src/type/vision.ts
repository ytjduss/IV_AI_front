export type HorizontalDirection = "left" | "right" | "center";
export type VerticalDirection = "up" | "down" | "center";
export type PoseResult = {
  posture_h?: HorizontalDirection;
  posture_v?: VerticalDirection;
  posture_extreme?: boolean;
  reason?: "not_calibrated" | "no_person_detected";
};
export type GazeResult = {
  gaze_h?: HorizontalDirection;
  gaze_v?: VerticalDirection;
  gaze_extreme?: boolean;
  reason?: "no_face_detected";
};
export type VisionSummary = {
  posture_left_count: number;
  posture_right_count: number;
  posture_up_count: number;
  posture_down_count: number;
  posture_extreme_count: number;
  gaze_left_count: number;
  gaze_right_count: number;
  gaze_up_count: number;
  gaze_down_count: number;
  gaze_extreme_count: number;
  pose_frame_count: number;
  gaze_frame_count: number;
};
export type AnswerAnalysis = {
  questionIndex: number;
  question: string;
  vision: VisionSummary | null;
  visionError?: string;
  audio?: unknown;
  audioError?: string;
};
export type InterviewAnalysis = {
  visionSession: VisionSummary | null;
  answerSummaries: AnswerAnalysis[];
  cameraSkipped: boolean;
  audioSession?: unknown;
  audioError?: string;
};

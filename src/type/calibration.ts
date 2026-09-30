export type Point = { x: number; y: number };
export type TargetZone = {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
};
export type BodyOutline = Partial<
  Record<
    | "nose"
    | "left_shoulder"
    | "right_shoulder"
    | "left_elbow"
    | "right_elbow"
    | "left_hip"
    | "right_hip",
    Point
  >
> & { face_bbox?: TargetZone };

export type CalibrationFrameResult = {
  success?: boolean;
  frame_count: number;
  body_outline: BodyOutline | null;
  target_zone: TargetZone;
  reason?: "pose_not_ready" | "not_looking_at_camera";
};

export type CalibrationBaseline = {
  shoulder_tilt: number;
  neck_forward_ratio: number;
  shoulder_width: number;
  shoulder_mid_x: number;
  shoulder_mid_y: number;
};

export type CalibrationFinalizeResult = {
  success?: boolean;
  baseline?: CalibrationBaseline;
  movement?: { x_std: number; y_std: number };
  reason?: "no_valid_frames_collected" | "too_much_movement";
};

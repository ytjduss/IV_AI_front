import type { BodyOutline, Point, TargetZone } from "../../type/calibration";

const segments: [
  keyof Omit<BodyOutline, "face_bbox">,
  keyof Omit<BodyOutline, "face_bbox">,
][] = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["right_shoulder", "right_elbow"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
];
const isPoint = (point?: Point): point is Point =>
  Boolean(point && Number.isFinite(point.x) && Number.isFinite(point.y));
const isZone = (zone?: TargetZone | null): zone is TargetZone =>
  Boolean(
    zone &&
    [zone.x_min, zone.x_max, zone.y_min, zone.y_max].every(Number.isFinite) &&
    zone.x_max > zone.x_min &&
    zone.y_max > zone.y_min,
  );

export default function CalibrationOverlay({
  outline,
  targetZone,
}: {
  outline: BodyOutline | null;
  targetZone: TargetZone | null;
}) {
  const face = outline?.face_bbox;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-label="자세 실루엣과 어깨 중심 목표 구역"
    >
      {isZone(targetZone) && (
        <rect
          x={targetZone.x_min}
          y={targetZone.y_min}
          width={targetZone.x_max - targetZone.x_min}
          height={targetZone.y_max - targetZone.y_min}
          fill="rgba(45,212,191,0.12)"
          stroke="#2dd4bf"
          strokeWidth={2}
          strokeDasharray="8 5"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {segments.map(([a, b]) => {
        const start = outline?.[a];
        const end = outline?.[b];
        return isPoint(start) && isPoint(end) ? (
          <line
            key={`${a}-${b}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke="#67e8f9"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        ) : null;
      })}
      {outline &&
        Object.entries(outline)
          .filter(([key]) => key !== "face_bbox")
          .map(([key, point]) =>
            isPoint(point as Point) ? (
              <circle
                key={key}
                cx={(point as Point).x}
                cy={(point as Point).y}
                r={0.004}
                fill="#fff"
              />
            ) : null,
          )}
      {isPoint(outline?.left_shoulder) && isPoint(outline?.right_shoulder) && (
        <circle
          cx={(outline.left_shoulder.x + outline.right_shoulder.x) / 2}
          cy={(outline.left_shoulder.y + outline.right_shoulder.y) / 2}
          r={0.007}
          fill="#fbbf24"
        />
      )}
      {isZone(face) && (
        <rect
          x={face.x_min}
          y={face.y_min}
          width={face.x_max - face.x_min}
          height={face.y_max - face.y_min}
          fill="none"
          stroke="#67e8f9"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

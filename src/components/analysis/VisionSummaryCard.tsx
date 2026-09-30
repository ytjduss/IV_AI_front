import type { VisionSummary } from "../../type/vision";
import { Card } from "../ui/card";

export default function VisionSummaryCard({
  summary,
  title = "자세·시선 분석",
  emptyMessage = "측정 데이터가 없습니다.",
}: {
  summary: VisionSummary | null;
  title?: string;
  emptyMessage?: string;
}) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-bold text-lg mb-4">{title}</h2>
      {!summary ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-5">
            {(
              [
                ["자세", "posture", summary.pose_frame_count],
                ["시선", "gaze", summary.gaze_frame_count],
              ] as const
            ).map(([label, prefix, total]) => (
              <div key={prefix}>
                <h3 className="font-semibold mb-3">
                  {label} · 처리 프레임 {total}개
                </h3>
                <dl className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["왼쪽", "left"],
                      ["오른쪽", "right"],
                      ["위쪽", "up"],
                      ["아래쪽", "down"],
                      ["심한 이탈", "extreme"],
                    ] as const
                  ).map(([direction, key]) => (
                    <div key={key} className="rounded-xl bg-muted/60 p-3">
                      <dt className="text-sm text-muted-foreground">
                        {direction}
                      </dt>
                      <dd className="font-bold mt-1">
                        {summary[`${prefix}_${key}_count`]} 프레임
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            같은 프레임이 좌우·상하·심한 이탈에 동시에 집계될 수 있습니다. 각
            카운트는 이탈 횟수나 종합 점수가 아닌 해당 방향으로 감지된 프레임
            수입니다.
          </p>
        </>
      )}
    </Card>
  );
}

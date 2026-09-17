export function PercentRing({
  value,
  large = false,
}: {
  value: number | null;
  large?: boolean;
}) {
  return (
    <div
      className={`percent-ring ${large ? "large" : ""}`}
      style={{
        background: `conic-gradient(#00a79e ${value ?? 0}%, #e3f1f0 0)`,
      }}
    >
      <div>
        <strong>{value === null ? "—" : `${value}%`}</strong>
        {large && <span>종합 퍼센테이지</span>}
      </div>
    </div>
  );
}

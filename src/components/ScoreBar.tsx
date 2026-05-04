export function ScoreBar({
  value,
  label,
  size = "md",
}: {
  value: number;
  label?: string;
  size?: "sm" | "md";
}) {
  const v = Math.round(Math.max(0, Math.min(100, value)));
  return (
    <div className="w-full" aria-label={label ? `${label}: ${v} of 100` : `Score: ${v} of 100`}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-ink-600">
          <span>{label}</span>
          <span className="font-mono text-ink-700">{v}</span>
        </div>
      )}
      <div
        className={
          "w-full overflow-hidden rounded-full bg-ink-100 " + (size === "sm" ? "h-1.5" : "h-2")
        }
      >
        <div className="score-fill h-full rounded-full transition-[width]" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

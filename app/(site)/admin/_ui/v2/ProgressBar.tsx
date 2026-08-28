import type { Health } from "./HealthDot";

const FILL: Record<Health, string> = {
  good: "bg-ui2-green",
  warn: "bg-ui2-amber",
  bad: "bg-ui2-red",
  unknown: "bg-ui2-border",
};

/** Thin pace bar. `expected` renders a hairline tick at where the metric
 *  should be by now — a bar short of the tick is visibly behind without
 *  reading a number. */
export function ProgressBar({
  value,
  expected,
  health,
  className = "",
}: {
  /** 0–1. null = no data, renders an empty track. */
  value: number | null;
  /** 0–1. null = no tick drawn. */
  expected?: number | null;
  health: Health;
  className?: string;
}) {
  const pct = value === null ? null : Math.min(Math.max(value, 0), 1);
  const expectedPct = expected == null ? null : Math.min(Math.max(expected, 0), 1);

  return (
    <span className={`relative block h-1.5 min-w-0 overflow-hidden rounded-full bg-ui2-divider ${className}`}>
      {pct !== null && (
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${FILL[health]}`}
          style={{ width: `${pct * 100}%` }}
        />
      )}
      {expectedPct !== null && (
        <span
          aria-hidden
          title="Expected by now"
          className="absolute inset-y-0 w-px bg-ui2-text/40"
          style={{ left: `${expectedPct * 100}%` }}
        />
      )}
    </span>
  );
}

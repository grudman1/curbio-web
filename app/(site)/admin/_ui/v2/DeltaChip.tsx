// "▲ 12% vs Jul" — direction-coded text, no pill, no background. Green/red
// are reserved for exactly this (and HealthDot); nothing else on the
// redesigned screen carries colour. `value === null` renders a grey em-dash
// rather than 0% — no comparable prior period is a different fact from "no
// change", same honesty rule the rest of /admin already enforces.

export function DeltaChip({
  value,
  label,
  goodDirection = "up",
}: {
  /** Ratio, e.g. 0.124 = +12.4%. null = no comparable prior period. */
  value: number | null;
  /** "vs Jul" — trailing context, no leading preposition needed twice. */
  label: string;
  /** Which literal direction is GOOD NEWS for this metric. The arrow always
   *  shows the true sign; only colour depends on this — a metric where more
   *  is worse (e.g. unattributed share) still shows "▲" honestly, just red
   *  instead of green. Defaults to "up" (the common case: more is better). */
  goodDirection?: "up" | "down";
}) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <span className="inline-flex items-center gap-1 font-ui2 text-ui2-caption font-medium text-ui2-text-muted">
        <span aria-hidden>—</span>
        <span>{label}</span>
      </span>
    );
  }

  const up = value > 0;
  const flat = value === 0;
  const favorable = up === (goodDirection === "up");
  const color = flat ? "text-ui2-text-muted" : favorable ? "text-ui2-green" : "text-ui2-red";
  const arrow = flat ? "" : up ? "▲" : "▼";

  return (
    <span className={`inline-flex items-center gap-1 font-ui2 text-ui2-caption font-semibold tabular-nums ${color}`}>
      {arrow && <span aria-hidden>{arrow}</span>}
      <span>{Math.abs(value * 100).toFixed(0)}%</span>
      <span className="font-medium text-ui2-text-muted">{label}</span>
    </span>
  );
}

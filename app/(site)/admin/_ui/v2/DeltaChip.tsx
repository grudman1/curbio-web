// "▲ 12%" as a tinted pill, "vs Jul" as plain muted text after it. Green/red
// are reserved for exactly this (and HealthDot); nothing else on the
// redesigned screen carries colour. `value === null` renders a grey em-dash
// with no pill at all — no comparable prior period is a different fact from
// "no change", same honesty rule the rest of /admin already enforces.

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
      <span className="inline-flex items-center gap-1.5 font-ui2 text-[12px] font-medium text-ui2-gray-400">
        <span aria-hidden>—</span>
        <span>{label}</span>
      </span>
    );
  }

  const up = value > 0;
  const flat = value === 0;
  const favorable = up === (goodDirection === "up");
  const pillBg = flat ? "bg-ui2-well" : favorable ? "bg-ui2-green-10" : "bg-ui2-red-10";
  const pillText = flat ? "text-ui2-gray-400" : favorable ? "text-ui2-green" : "text-ui2-red";
  const arrow = flat ? "" : up ? "▲" : "▼";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 font-ui2 text-[12px] font-semibold tabular-nums ${pillBg} ${pillText}`}
      >
        {arrow && <span aria-hidden>{arrow}</span>}
        <span>{Math.abs(value * 100).toFixed(0)}%</span>
      </span>
      <span className="font-ui2 text-[12px] font-medium text-ui2-gray-400">{label}</span>
    </span>
  );
}

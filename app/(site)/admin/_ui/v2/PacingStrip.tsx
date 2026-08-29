// One row: where the number is, where it should be, how far apart those are.
//
// DELIBERATELY THIN. An earlier draft carried a projected finish and a
// "needs +N/week" column alongside this. Both were cut: a projection from a
// half-month of a snapshot that drifts after its as-of date is a forecast
// dressed as a fact, and the rate-to-close is arithmetic the reader can do
// from two numbers that are already on screen. What survives is the three
// things that are measured — actual, target, expected-by-now — and the gap.
//
// The tick is the honest part of the bar. Without it the amber fill answers
// "how much of the target" and silently invites "…and it's only the 14th, so
// that's fine"; with it the bar answers "how much of the target BY NOW",
// which is the question pace is actually about.

export function PacingStrip({
  label,
  value,
  target,
  expected,
  delta,
}: {
  /** "Qualified · August" — the metric and its window. */
  label: string;
  value: number;
  target: number;
  /** Expected by the as-of date, given how much of the window has data. */
  expected: number;
  /** value − expected. Negative = behind. */
  delta: number;
}) {
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / target) * 100)).toFixed(1)}%`;
  const behind = delta < 0;

  return (
    <section className="flex items-center gap-7 rounded-ui2-card border border-ui2-border bg-ui2-card px-5 py-[18px] shadow-ui2-card">
      <div className="flex-none">
        <div className="font-ui2 text-ui2-eyebrow font-bold uppercase tracking-[0.08em] text-ui2-gray-400">
          {label}
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="font-ui2 text-[length:var(--ui2-text-pace)] leading-none tracking-[-0.02em] font-extrabold tabular-nums text-ui2-text">
            {value.toLocaleString("en-US")}
          </span>
          <span className="font-ui2 text-[15px] tabular-nums text-ui2-text-muted">
            / {target.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="relative h-3 rounded-[var(--ui2-radius-pill)] bg-ui2-divider"
          role="img"
          aria-label={`${value} of ${target}, expected ${expected} by now`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-[var(--ui2-radius-pill)] bg-ui2-amber"
            style={{ width: pct(value) }}
          />
          {/* Expected-by-now. Navy, full-height-plus, so it reads as a
              threshold the fill is measured against rather than as a
              decoration sitting on it. */}
          <div
            className="absolute -bottom-1.5 -top-1.5 w-0.5 bg-ui2-accent"
            style={{ left: pct(expected) }}
          />
        </div>
        <div className="mt-2 font-ui2 text-ui2-caption text-ui2-text-muted">
          expected <strong className="font-semibold tabular-nums text-ui2-text">{expected}</strong>
          {" · "}
          <strong
            className={`font-semibold tabular-nums ${behind ? "text-ui2-red" : "text-ui2-green"}`}
          >
            {Math.abs(delta)} {behind ? "behind" : "ahead"}
          </strong>
        </div>
      </div>
    </section>
  );
}

// Inline trend. No axes, no legend, no labels — a shape, read in a glance.
//
// HONESTY: this renders nothing rather than a flat line when there is no
// series. A flat line is a claim ("traffic was steady"); absence is not. The
// caller shows DASH instead, same as every other unknown number.
//
// The `bucket` prop is not decoration. A 90d timeframe cannot render daily
// points — Vercel's aggregate API caps day granularity at 62 buckets (see
// DECISIONS.md) — so 90d arrives here as 13 weekly points. The label naming
// that is the caller's job; this component just refuses to pretend the
// resolution is finer than it is.

export type SparkPoint = { t: string; v: number };

export function Sparkline({
  points,
  bucket,
  width = 96,
  height = 28,
  className = "",
}: {
  points: readonly SparkPoint[];
  /** What one point represents. Surfaced in the a11y label. */
  bucket: "day" | "week" | "month";
  width?: number;
  height?: number;
  className?: string;
}) {
  // Two points is the minimum that can describe a direction.
  if (points.length < 2) return null;

  const values = points.map((p) => p.v);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = width / (points.length - 1);
  const pad = 3;

  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const coords = points.map((p, i) => [i * stepX, y(p.v)] as const);
  const d = coords.map(([x, yy], i) => `${i ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");

  const first = values[0];
  const last = values[values.length - 1];
  // Tone by direction, but deliberately NOT the good/warn/bad scale — a
  // traffic trend is not a health verdict, and colouring it green/red would
  // assert one. Ink only; the numbers beside it carry the judgement.
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`block overflow-visible ${className}`}
      role="img"
      aria-label={`Trend over ${points.length} ${bucket}s: ${first} to ${last}, ${total} total`}
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke="var(--color-text-muted)"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="1.75" fill="var(--color-text)" />
    </svg>
  );
}

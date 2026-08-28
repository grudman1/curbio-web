// Inline trend — no axes, no legend, single ink colour. Renders nothing
// (never a flat line) when there's no series; a flat line asserts "steady",
// absence asserts nothing.

export type SparkPoint = { t: string; v: number };

export function Sparkline({
  points,
  width = 80,
  height = 28,
  className = "",
}: {
  points: readonly SparkPoint[];
  width?: number;
  height?: number;
  className?: string;
}) {
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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`block overflow-visible ${className}`}
      aria-hidden
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke="var(--ui2-text-muted)"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r="1.75" fill="var(--ui2-text)" />
    </svg>
  );
}

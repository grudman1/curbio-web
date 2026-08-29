export type SparkPoint = { t: string; v: number };

// A metric's history, as bars.
//
// ── Why bars, and why they carry a scale ───────────────────────────────────
// This was an unlabelled line floating in the corner of a KPI card: no axis,
// no scale, no period, no indication of which end was "now". A reader could
// tell it went up and down and nothing else, which is decoration wearing a
// chart's clothes.
//
// Three things fix that, none of them a caption:
//   • BARS, not a line. The series is a count per month — discrete buckets,
//     which is what a bar means. It also matches the month chart further down
//     the page, so the two read as the same data at two scales.
//   • THE LAST BAR IS THE CURRENT PERIOD, and it is inked in the metric's own
//     colour while the history stays grey. That is what makes the big number
//     beside it locatable: the number IS that bar.
//   • THE RANGE IS LABELLED — first and last bucket, under the axis. Two words
//     that turn "some bars" into "Jan through Aug".
//
// Bars are baselined at zero, not at the series minimum. A min-baselined
// sparkline exaggerates small variation into drama, which is the other way
// these lie.

export function Sparkline({
  points,
  /** Ink for the final bar — the current period. */
  tone = "var(--ops-brand)",
  // 76, not wider: the KPI card has ~240px of inner width and the value plus
  // its suffix ("$14K" + "1 won") needs the rest. At 104 the suffix wrapped.
  width = 76,
  height = 32,
  className = "",
}: {
  points: readonly SparkPoint[];
  tone?: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  // One bar is not a trend and two is barely one — render nothing rather than
  // implying a shape that isn't there.
  if (points.length < 3) return null;

  const max = Math.max(...points.map((p) => p.v), 0);
  const gap = 2;
  const barW = (width - gap * (points.length - 1)) / points.length;
  // A zero-valued bucket still gets a hairline, so an empty month reads as
  // "measured and empty" rather than as a gap in the series.
  const MIN_H = 1.5;

  return (
    <span className={`inline-block ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="block"
        role="img"
        aria-label={`${points[0].t} to ${points[points.length - 1].t}`}
      >
        {points.map((p, i) => {
          const h = max > 0 ? Math.max(MIN_H, (p.v / max) * height) : MIN_H;
          const isLast = i === points.length - 1;
          return (
            <rect
              key={p.t}
              x={i * (barW + gap)}
              y={height - h}
              width={barW}
              height={h}
              rx={1.5}
              fill={isLast ? tone : "var(--ops-gray-200)"}
            >
              <title>{`${p.t}: ${p.v.toLocaleString("en-US")}`}</title>
            </rect>
          );
        })}
      </svg>
      <span className="ops-subtle mt-1 flex justify-between text-[10px] leading-none">
        <span>{shortBucket(points[0].t)}</span>
        <span>{shortBucket(points[points.length - 1].t)}</span>
      </span>
    </span>
  );
}

/** "2026-01" → "Jan". Anything that isn't a YYYY-MM passes through. */
function shortBucket(t: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(t);
  if (!m) return t;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

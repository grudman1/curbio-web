// The pace gauge — a half-donut carrying "how far through the target are we,
// and where should we be by now".
//
// ── Hand-rolled SVG, not ApexCharts ────────────────────────────────────────
// TailAdmin draws this with a radialBar. ApexCharts is ~150KB of client-side
// JavaScript and a `dynamic(ssr:false)` boundary; two arcs and a tick is about
// forty lines of SVG that server-render, cost nothing, and cannot shift layout
// while a chart library boots.
//
// ── The tick is the honest part ────────────────────────────────────────────
// Without an expected-by-now marker the arc answers "how much of the target",
// which silently invites "…and it's only the 14th, so that's fine". With it,
// the arc answers "how much of the target BY NOW", which is the question pace
// is actually about. Same reasoning as the bar this replaces.

const R = 80;
const STROKE = 18;
const CX = 100;
const CY = 100;

/** Polar → cartesian on the gauge's arc. `t` is 0…1 across the half-circle,
 *  starting at the left (180°) and sweeping to the right (0°). */
function pointAt(t: number, radius = R) {
  const angle = Math.PI * (1 - Math.min(1, Math.max(0, t)));
  return { x: CX + radius * Math.cos(angle), y: CY - radius * Math.sin(angle) };
}

function arcPath(from: number, to: number) {
  const a = pointAt(from);
  const b = pointAt(to);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function PaceGauge({
  value,
  target,
  expected,
  footer,
}: {
  value: number;
  target: number;
  /** Expected by the as-of date, prorated across the window. */
  expected: number;
  /** Two or three label/value pairs under the arc. */
  footer: { label: string; value: string; tone?: "good" | "bad" | "muted" }[];
}) {
  const pct = target > 0 ? value / target : 0;
  const expectedPct = target > 0 ? expected / target : 0;
  const delta = value - expected;
  const behind = delta < 0;
  const tick = pointAt(expectedPct, R + STROKE / 2 + 2);
  const tickInner = pointAt(expectedPct, R - STROKE / 2 - 2);

  return (
    <div>
      <div className="relative mx-auto" style={{ maxWidth: 260 }}>
        <svg
          viewBox="0 0 200 116"
          className="block w-full"
          role="img"
          aria-label={`${value} of ${target}; expected ${expected} by now`}
        >
          {/* Track */}
          <path
            d={arcPath(0, 1)}
            fill="none"
            stroke="var(--ops-gray-200)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          {/* Achieved */}
          {pct > 0 && (
            <path
              d={arcPath(0, pct)}
              fill="none"
              stroke="var(--ops-accent)"
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          )}
          {/* Expected-by-now. Navy, crossing the full stroke, so it reads as a
              threshold the fill is measured against rather than decoration
              sitting on it. */}
          <line
            x1={tickInner.x}
            y1={tickInner.y}
            x2={tick.x}
            y2={tick.y}
            stroke="var(--ops-brand)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>

        {/* The figure sits inside the arc's hollow. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">
          <div
            className="ops-tnum font-bold"
            style={{ fontSize: 34, lineHeight: 1.1, color: "var(--ops-text)" }}
          >
            {Math.round(pct * 100)}%
          </div>
          <div
            className={`ops-badge mt-1 ${behind ? "ops-badge--error" : "ops-badge--success"}`}
          >
            {behind ? "−" : "+"}
            {Math.abs(delta)} vs expected
          </div>
        </div>
      </div>

      <div
        className="mt-5 grid gap-3 border-t pt-4"
        style={{
          gridTemplateColumns: `repeat(${footer.length}, minmax(0, 1fr))`,
          borderColor: "var(--ops-divider)",
        }}
      >
        {footer.map((f) => (
          <div key={f.label} className="text-center">
            <div className="ops-subtle text-[12px] leading-[18px]">{f.label}</div>
            <div
              className="ops-tnum mt-1 text-[16px] font-semibold"
              style={{
                color:
                  f.tone === "good"
                    ? "var(--ops-success-700)"
                    : f.tone === "bad"
                      ? "var(--ops-error-700)"
                      : "var(--ops-text)",
              }}
            >
              {f.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hand-rolled SVG chart primitives for the Hub. Server-safe: no state, no
// handlers — pure geometry over real numbers. Anything interactive (hover
// breakdowns) lives in its own client component and reuses these shapes.
//
// Chart rules (see the brief): colour carries meaning only, no gradients, no
// 3D, no donuts, no dual axes. Every chart renders legibly with zero data.

import { PACE_TONE } from "./hubUi";
import type { PaceState } from "./pacing";

// ── pacing arc — THE signature element, used once per market card ────────────

/** Semicircular gauge: value vs target arc in the pace tone, with a small
 *  tick at the expected-to-date position. The gap between arc end and tick
 *  IS the pace read, drawn instead of written. */
export function PaceArc({
  value,
  target,
  expected,
  state,
  width = 92,
}: {
  value: number;
  target: number;
  /** Expected-to-date; tick omitted when null. */
  expected: number | null;
  /** Null → no pace read → neutral track only. */
  state: PaceState | null;
  width?: number;
}) {
  const w = width;
  const h = w * 0.58;
  const cx = w / 2;
  const cy = h - 4;
  const r = w / 2 - 8;

  const point = (frac: number, radius: number) => {
    const theta = Math.PI * (1 - Math.min(Math.max(frac, 0), 0.999));
    return [cx + radius * Math.cos(theta), cy - radius * Math.sin(theta)] as const;
  };
  const arc = (from: number, to: number, radius: number) => {
    const [x0, y0] = point(from, radius);
    const [x1, y1] = point(to, radius);
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${radius} ${radius} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  };

  const frac = target > 0 ? Math.min(value / target, 1) : 0;
  const expFrac = expected !== null && target > 0 ? Math.min(expected / target, 1) : null;
  const tone = state ? PACE_TONE[state] : "var(--color-text-subtle)";

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label={`${value} of ${target}${expected !== null ? `, expected ${expected} by now` : ""}`}
    >
      {/* track */}
      <path d={arc(0, 1, r)} fill="none" stroke="var(--color-border)" strokeWidth="7" strokeLinecap="round" />
      {/* value */}
      {frac > 0 && (
        <path d={arc(0, frac, r)} fill="none" stroke={tone} strokeWidth="7" strokeLinecap="round" />
      )}
      {/* expected tick */}
      {expFrac !== null && (
        (() => {
          const [x0, y0] = point(expFrac, r - 7);
          const [x1, y1] = point(expFrac, r + 7);
          return (
            <line
              x1={x0} y1={y0} x2={x1} y2={y1}
              stroke="color-mix(in srgb, var(--color-text) 55%, transparent)"
              strokeWidth="1.5"
            />
          );
        })()
      )}
    </svg>
  );
}

// ── sparkline ────────────────────────────────────────────────────────────────

/** Tiny line of real counts. Flat-zero data draws a flat line at the bottom —
 *  an honest nothing, not an empty box. */
export function Sparkline({
  values,
  width = 120,
  height = 26,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const pad = 2;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const points = values.map((v, i) => `${(pad + i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const [lastX, lastY] = points.split(" ").pop()!.split(",");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="color-mix(in srgb, var(--color-text) 45%, transparent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="2" fill="var(--color-text)" />
    </svg>
  );
}

// ── horizontal target bar (company total) ────────────────────────────────────

/** Value vs target as a slim bar with an expected-to-date tick. */
export function TargetBar({
  value,
  target,
  expected,
  state,
  height = 10,
}: {
  value: number;
  target: number;
  expected: number | null;
  state: PaceState | null;
  height?: number;
}) {
  const frac = target > 0 ? Math.min(value / target, 1) : 0;
  const expFrac = expected !== null && target > 0 ? Math.min(expected / target, 1) : null;
  const tone = state ? PACE_TONE[state] : "var(--color-text-subtle)";
  return (
    <div
      role="img"
      aria-label={`${value} of ${target}${expected !== null ? `, expected ${expected} by now` : ""}`}
      style={{
        position: "relative",
        height,
        borderRadius: height / 2,
        border: "1px solid var(--color-border)",
        overflow: "visible",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          insetBlock: 0,
          left: 0,
          width: `${frac * 100}%`,
          background: tone,
          borderRadius: height / 2,
        }}
      />
      {expFrac !== null && (
        <div
          style={{
            position: "absolute",
            top: -3,
            bottom: -3,
            left: `${expFrac * 100}%`,
            width: 1.5,
            background: "color-mix(in srgb, var(--color-text) 55%, transparent)",
          }}
        />
      )}
    </div>
  );
}

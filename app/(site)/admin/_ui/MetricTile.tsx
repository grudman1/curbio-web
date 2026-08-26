import { DASH, Eyebrow } from "./primitives";
import { Sparkline, type SparkPoint } from "./Sparkline";
import { InfoPopover } from "./InfoPopover";

// ─────────────────────────────────────────────────────────────────────────────
// One number, its label, and optionally how it moved.
//
// THE RULE THIS ENFORCES: `value === null` renders DASH, not 0. The two are
// different facts — "nobody converted" and "we cannot see conversions" — and
// a dashboard that renders them identically is lying by omission. The type
// makes this unavoidable: `value` is `number | null`, so a caller with no data
// cannot accidentally pass a falsy zero and get a plausible-looking tile.
//
// A tile with no value renders no delta and no sparkline either. A trend
// attached to a number we do not have is decoration.
// ─────────────────────────────────────────────────────────────────────────────

export function MetricTile({
  label,
  value,
  format = (n) => n.toLocaleString("en-US"),
  delta,
  points,
  bucket = "day",
  info,
  note,
}: {
  label: string;
  /** null means "no data yet" and renders DASH. Never pass 0 for unknown. */
  value: number | null;
  format?: (n: number) => string;
  /** Change vs the previous period of equal length, as a ratio (0.124 = +12.4%).
   *  null when there is no comparable previous period — which is common and
   *  must not render as 0%. */
  delta?: number | null;
  points?: readonly SparkPoint[];
  bucket?: "day" | "week" | "month";
  /** Longer explanation. Goes behind the ⓘ, never into the tile body. */
  info?: React.ReactNode;
  /** At most one short line — provenance or window. */
  note?: string;
}) {
  const known = value !== null;
  const deltaKnown = known && delta !== null && delta !== undefined && Number.isFinite(delta);

  return (
    <div className="flex min-h-ops-tile flex-col justify-between rounded-lg border border-edge bg-surface-raised p-3.5">
      <div className="flex items-center gap-1.5">
        <Eyebrow>{label}</Eyebrow>
        {info && <InfoPopover label={`About ${label}`}>{info}</InfoPopover>}
        {deltaKnown && (
          <span
            className={`ml-auto flex-none font-sans text-ops-micro font-bold tabular-nums ${
              delta! > 0 ? "text-tone-good" : delta! < 0 ? "text-tone-bad" : "text-content-subtle"
            }`}
          >
            {delta! > 0 ? "↑" : delta! < 0 ? "↓" : ""}
            {Math.abs(delta! * 100).toFixed(1)}%
          </span>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <span
          className={`font-sans text-ops-metric font-semibold tabular-nums ${
            known ? "text-content" : "text-content-subtle"
          }`}
        >
          {known ? format(value) : DASH}
        </span>
        {known && points && points.length > 1 && (
          <Sparkline points={points} bucket={bucket} width={80} height={24} className="mb-0.5" />
        )}
      </div>

      {note && <p className="m-0 mt-1.5 truncate font-sans text-ops-micro text-content-subtle">{note}</p>}
      {!known && !note && (
        <p className="m-0 mt-1.5 font-sans text-ops-micro text-content-subtle">No data yet</p>
      )}
    </div>
  );
}

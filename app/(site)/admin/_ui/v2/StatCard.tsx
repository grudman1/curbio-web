import { DeltaChip } from "./DeltaChip";
import { HealthDot, WiringDot, type Health } from "./HealthDot";
import { Sparkline, type SparkPoint } from "./Sparkline";

// The KPI tile: label → value → inline sparkline → delta. `health` and
// `statusDot` share one top-right slot and are mutually exclusive — a card
// reports its state (health) or admits it has none yet (statusDot), never
// both.
//
// ── The unwired case ────────────────────────────────────────────────────────
// A metric with no data source renders a dashed border, a hollow status dot
// and an em-dash. It carries NO caption naming what it needs. That caption
// ("needs the spend store") was written for a builder, not for the person
// reading the dashboard, and it put a sentence of backlog on a screen whose
// whole job is the current state of the business. The dot's tooltip keeps the
// explanation one hover away for whoever wants it.

export function StatCard({
  label,
  value,
  valueSuffix,
  health,
  statusDot,
  delta,
  sparkline,
}: {
  label: string;
  /** Pre-formatted — the caller decides "56", "21.6%", "$1.3M". */
  value: React.ReactNode;
  /** Smaller, muted, trailing the value — "/ 400". */
  valueSuffix?: React.ReactNode;
  health?: Health;
  /** Hollow dot, top-right, tooltip only — "this isn't wired up yet". */
  statusDot?: { tooltip: string };
  delta?: { value: number | null; label: string; goodDirection?: "up" | "down" };
  sparkline?: readonly SparkPoint[];
}) {
  const unwired = !!statusDot;

  return (
    <div
      className={`flex min-h-[118px] flex-col justify-between rounded-ui2-card bg-ui2-card px-[18px] py-4 ${
        unwired ? "border border-dashed border-ui2-gray-300" : "border border-ui2-border shadow-ui2-card"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="truncate font-ui2 text-[length:var(--ui2-text-micro)] font-semibold tracking-[0.04em] text-ui2-gray-400">
          {label}
        </span>
        <span className="ml-auto flex-none">
          {statusDot ? <WiringDot tooltip={statusDot.tooltip} /> : health ? <HealthDot health={health} /> : null}
        </span>
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span
            className={`font-ui2 text-ui2-metric font-extrabold tabular-nums ${
              unwired ? "text-ui2-gray-300" : "text-ui2-text"
            }`}
          >
            {value}
          </span>
          {valueSuffix && (
            <span className="font-ui2 text-ui2-body tabular-nums text-ui2-text-muted">
              {valueSuffix}
            </span>
          )}
        </div>
        {sparkline && sparkline.length > 1 && <Sparkline points={sparkline} className="mb-0.5" />}
      </div>

      <div className="mt-2.5">
        {delta ? (
          <DeltaChip value={delta.value} label={delta.label} goodDirection={delta.goodDirection} />
        ) : (
          // Reserves the row's height so a card with no delta doesn't sit
          // shorter than its neighbours in the grid.
          <span className="block h-[26px]" aria-hidden />
        )}
      </div>
    </div>
  );
}

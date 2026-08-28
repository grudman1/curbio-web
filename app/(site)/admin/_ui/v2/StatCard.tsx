import { DeltaChip } from "./DeltaChip";
import { HealthDot, WiringDot, type Health } from "./HealthDot";
import { Sparkline, type SparkPoint } from "./Sparkline";

// The KPI tile: label → value → delta. `health` and `statusDot` share one
// top-right slot and are mutually exclusive — a card reports its state
// (health) or admits it has none yet (statusDot), never both.

export function StatCard({
  label,
  value,
  valueSuffix,
  health,
  statusDot,
  delta,
  sparkline,
  note,
}: {
  label: string;
  /** Pre-formatted — the caller decides "56", "80%", whatever the unit is. */
  value: React.ReactNode;
  /** Smaller, muted, trailing the value — "/ 400", "/8". */
  valueSuffix?: React.ReactNode;
  health?: Health;
  /** Grey dot, top-right, tooltip only — "this isn't wired up yet". */
  statusDot?: { tooltip: string };
  delta?: { value: number | null; label: string; goodDirection?: "up" | "down" };
  sparkline?: readonly SparkPoint[];
  note?: string;
}) {
  return (
    <div className="flex min-h-[110px] flex-col justify-between rounded-ui2-card border border-ui2-border bg-ui2-card p-6 shadow-ui2-card">
      <div className="flex items-center gap-1.5">
        <span className="truncate font-ui2 text-[11px] font-medium tracking-[.04em] text-ui2-gray-400">{label}</span>
        {(health || statusDot) && (
          <span className="ml-auto flex-none">
            {statusDot ? <WiringDot tooltip={statusDot.tooltip} /> : <HealthDot health={health as Health} />}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="font-ui2 text-ui2-metric font-extrabold tabular-nums text-ui2-text">{value}</span>
          {valueSuffix && (
            <span className="font-ui2 text-ui2-body tabular-nums text-ui2-text-muted">{valueSuffix}</span>
          )}
        </div>
        {sparkline && sparkline.length > 1 && <Sparkline points={sparkline} className="mb-0.5" />}
      </div>

      {(delta || note) && (
        <div className="mt-2.5">
          {delta ? (
            <DeltaChip value={delta.value} label={delta.label} goodDirection={delta.goodDirection} />
          ) : (
            <p className="m-0 font-ui2 text-[12px] text-ui2-gray-400">{note}</p>
          )}
        </div>
      )}
    </div>
  );
}

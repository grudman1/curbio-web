import type { PaceState } from "@/app/(site)/marketing/(hub)/pacing";
import { DASH, Eyebrow, StatusDot } from "./primitives";
import { PACE_TONE } from "./tone";

// ─────────────────────────────────────────────────────────────────────────────
// Every market's status as a single glanceable column.
//
// This is what Today is FOR: someone with thirty seconds who is not going to
// click anything needs to see all eight markets at once and know which ones
// need them. Sorted worst-first — the market in trouble is at the top, always,
// because that is the one you have thirty seconds for.
//
// Derived from MARKETS via the rows passed in. Nothing here assumes a count.
// ─────────────────────────────────────────────────────────────────────────────

export type PaceRow = {
  key: string;
  label: string;
  qualified: number | null;
  /** Full-timeframe target for this market. */
  target: number;
  /** Expected by now given how much of the timeframe has data. */
  expected: number | null;
  state: PaceState | null;
};

const STATE_LABEL: Record<PaceState, string> = {
  on: "On pace",
  behind: "Behind",
  risk: "Under half",
};

export function PaceRail({ rows, note }: { rows: PaceRow[]; note?: string }) {
  // Worst first. Unknown pace sinks to the bottom — it is not a crisis, it is
  // an absence, and it must not outrank a market that is genuinely at risk.
  const order: Record<PaceState, number> = { risk: 0, behind: 1, on: 2 };
  const sorted = [...rows].sort((a, b) => {
    if (a.state === null && b.state === null) return a.label.localeCompare(b.label);
    if (a.state === null) return 1;
    if (b.state === null) return -1;
    return order[a.state] - order[b.state] || a.label.localeCompare(b.label);
  });

  return (
    <div>
      <ul className="m-0 list-none p-0">
        {sorted.map((r) => {
          const pct =
            r.qualified !== null && r.target > 0 ? Math.min(r.qualified / r.target, 1) : null;
          const expectedPct =
            r.expected !== null && r.target > 0 ? Math.min(r.expected / r.target, 1) : null;
          const tone = r.state ? PACE_TONE[r.state] : "unknown";
          return (
            <li key={r.key} className="flex h-ops-row items-center gap-2.5 border-b border-edge last:border-b-0">
              <StatusDot tone={tone} title={r.state ? STATE_LABEL[r.state] : "no data"} />
              {/* Wide enough for the longest displayName in MARKETS
                  ("Northern Virginia, VA") without truncation — a market you
                  cannot read is a market you cannot act on. */}
              <span className="w-[132px] flex-none truncate font-sans text-ops-table text-content">
                {r.label}
              </span>

              {/* The bar. The hairline is where we SHOULD be by now — so a bar
                  short of the mark is visibly behind without reading a number. */}
              <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-pill bg-navy-08">
                {pct !== null && (
                  <span
                    className={`absolute inset-y-0 left-0 rounded-pill ${
                      tone === "good" ? "bg-tone-good" : tone === "warn" ? "bg-tone-warn" : tone === "bad" ? "bg-tone-bad" : "bg-tone-unknown"
                    }`}
                    style={{ width: `${pct * 100}%` }}
                  />
                )}
                {expectedPct !== null && (
                  <span
                    aria-hidden
                    title="expected by now"
                    className="absolute inset-y-0 w-px bg-content"
                    style={{ left: `${expectedPct * 100}%` }}
                  />
                )}
              </span>

              <span className="w-[68px] flex-none text-right font-sans text-ops-table tabular-nums text-content">
                {r.qualified === null ? DASH : r.qualified}
                <span className="text-content-subtle">/{r.target}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {note && (
        <p className="m-0 mt-2 flex items-center gap-2 font-sans text-ops-micro text-content-subtle">
          <span aria-hidden className="inline-block h-2.5 w-px flex-none bg-content" />
          {note}
        </p>
      )}
    </div>
  );
}

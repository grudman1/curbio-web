import Link from "next/link";
import { MUTED, SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import { DASH } from "./hubUi";

// The horizontal funnel: Engaged → Qualified → Meeting → Proposal → Closed,
// conversion rate printed between each pair. This is where "is it a rep
// problem or a lead-source problem" becomes visible, so every stage clicks
// through to the Report grid (timeframe preserved, metric preselected).
//
// Engaged has no wired source yet and renders an em-dash — never a zero.

export type FunnelStage = {
  label: string;
  /** Null = source not wired (Engaged today). */
  count: number | null;
  /** ?m= metric the Report grid opens on. */
  reportMetric: string;
};

function conversion(from: number | null, to: number | null): string {
  if (from === null || to === null || from === 0) return DASH;
  return `${Math.round((to / from) * 100)}%`;
}

export function FunnelStrip({ stages, query }: { stages: FunnelStage[]; query: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 8px" }}>
      {stages.map((stage, i) => (
        <span key={stage.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link
            href={`/marketing/report?${query ? `${query}&` : ""}m=${stage.reportMetric}`}
            style={{
              display: "block",
              textDecoration: "none",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)",
              padding: "10px 16px",
              minWidth: 104,
              background: "var(--color-surface-raised)",
              transition: "border-color var(--duration-base) ease-out",
            }}
            title={`Open the Report grid on ${stage.label}`}
          >
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-family-serif)",
                fontVariantNumeric: "tabular-nums",
                fontSize: 24,
                fontWeight: 600,
                lineHeight: 1,
                color: stage.count === null ? SUBTLE : "var(--color-text)",
              }}
            >
              {stage.count ?? DASH}
            </span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-family-sans)",
                fontSize: "var(--text-label)",
                color: MUTED,
                marginTop: 5,
                whiteSpace: "nowrap",
              }}
            >
              {stage.label}
            </span>
          </Link>
          {i < stages.length - 1 && (
            <span
              style={{
                fontFamily: "var(--font-family-sans)",
                fontSize: "var(--text-label)",
                color: SUBTLE,
                whiteSpace: "nowrap",
              }}
            >
              → {conversion(stage.count, stages[i + 1].count)}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

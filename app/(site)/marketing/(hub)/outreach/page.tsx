import type { Metadata } from "next";
import { MARKETS } from "@/config/markets";
import { Meta, MUTED, Panel, Stat, SUBTLE } from "@/app/(site)/admin/(dashboard)/ui";
import {
  COST_PER_MEETING_TARGET_USD,
  HUB_SURFACE_BY_SLUG,
  OUTREACH_ARMS,
  OUTREACH_WEEKLY_CALLS_TARGET,
  OUTREACH_WEEKLY_MAILINGS_TARGET,
} from "@/config/marketingHub";
import { DASH, HubPageHeader, NeedsBlock, OutlineBar, td, th } from "../hubUi";

export const metadata: Metadata = {
  title: "Outreach · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.outreach;

export default function OutreachPage() {
  // Unique HSMs, derived from config/markets.ts — never written down again.
  const hsmMarkets = new Map<string, string[]>();
  for (const m of MARKETS) {
    hsmMarkets.set(m.hsm.name, [...(hsmMarkets.get(m.hsm.name) ?? []), m.name]);
  }
  const hsms = [...hsmMarkets.entries()].map(([name, covers]) => ({
    name,
    covers: covers.join(" · "),
  }));

  return (
    <>
      <HubPageHeader surface={surface} />

      {/* ── the A/B: two arms side by side ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-4)",
        }}
      >
        {OUTREACH_ARMS.map((arm) => (
          <Panel
            key={arm.key}
            title={arm.label}
            right={<Meta>vs. ${COST_PER_MEETING_TARGET_USD} per meeting</Meta>}
          >
            <div style={{ display: "flex", gap: 32 }}>
              <Stat label="mailed" value={DASH} tone={SUBTLE} />
              <Stat label="meetings" value={DASH} tone={SUBTLE} />
              <Stat label="cost per meeting" value={DASH} tone={SUBTLE} />
            </div>
          </Panel>
        ))}
      </div>
      <p
        style={{
          fontFamily: "var(--font-family-sans)",
          fontSize: "var(--text-small)",
          color: MUTED,
          margin: "0 0 var(--space-4)",
          maxWidth: 720,
          lineHeight: 1.6,
        }}
      >
        The conversion event is a <strong>meeting</strong>, not a quote — the A/B decides
        which arm books face time, and nothing downstream of the meeting is credited to it.
      </p>

      {/* ── per-HSM cadence ── */}
      <Panel
        title="Weekly cadence by HSM"
        right={
          <Meta>
            target: {OUTREACH_WEEKLY_MAILINGS_TARGET} mailings · {OUTREACH_WEEKLY_CALLS_TARGET} calls per week
          </Meta>
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>HSM</th>
                <th style={th}>Mailings this week</th>
                <th style={th}>Calls this week</th>
                <th style={{ ...th, textAlign: "right" }}>Meetings booked</th>
              </tr>
            </thead>
            <tbody>
              {hsms.map((h) => (
                <tr key={h.name}>
                  <td style={{ ...td, minWidth: 180 }}>
                    <div style={{ fontWeight: 600 }}>{h.name}</div>
                    <div style={{ fontSize: "var(--text-label)", color: SUBTLE, marginTop: 1 }}>
                      {h.covers}
                    </div>
                  </td>
                  <td style={td}>
                    <OutlineBar label={`${DASH} of ${OUTREACH_WEEKLY_MAILINGS_TARGET}`} />
                  </td>
                  <td style={td}>
                    <OutlineBar label={`${DASH} of ${OUTREACH_WEEKLY_CALLS_TARGET}`} />
                  </td>
                  <td style={{ ...td, textAlign: "right", color: SUBTLE }}>{DASH}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}

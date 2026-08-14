import type { Metadata } from "next";
import { MARKETS } from "@/config/markets";
import { Meta, Panel, SUBTLE } from "../../ui";
import {
  CHANNEL_FUNNEL_ORDER,
  CHANNEL_LABELS,
  HUB_SURFACE_BY_SLUG,
  SYNC_SURFACES,
} from "@/config/marketingHub";
import { SNAPSHOT_AS_OF } from "@/config/appLeadsSnapshot";
import { ConsequenceNote, DASH, HubPageHeader, NeedsBlock, StatusChip, td, tdDash, th } from "../hubUi";
import { UtmBuilder } from "./UtmBuilder";

export const metadata: Metadata = {
  title: "Marketing · Settings · Control Room — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.settings;

const field: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-small)",
  color: "var(--color-text)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-lg)",
  padding: "8px 10px",
  background: "var(--color-surface-raised)",
  width: "100%",
};

const fieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-family-sans)",
  fontSize: "var(--text-micro)",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: SUBTLE,
  display: "block",
  marginBottom: 6,
};

export default function SettingsPage() {
  return (
    <>
      <HubPageHeader surface={surface} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-4)",
        }}
      >
        {/* ── spend entry — disabled, and honest about why ── */}
        <Panel title="Spend entry" right={<Meta>month × market × channel</Meta>}>
          <fieldset disabled style={{ border: 0, margin: 0, padding: 0, opacity: 0.55 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label>
                <span style={fieldLabel}>Month</span>
                <input type="month" style={field} />
              </label>
              <label>
                <span style={fieldLabel}>Market</span>
                <select style={field} defaultValue="">
                  <option value="" />
                  {MARKETS.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span style={fieldLabel}>Channel</span>
                <select style={field} defaultValue="">
                  <option value="" />
                  {CHANNEL_FUNNEL_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {CHANNEL_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span style={fieldLabel}>Amount (USD)</span>
                <input type="number" min={0} step="0.01" placeholder="0.00" style={field} />
              </label>
            </div>
          </fieldset>
          <ConsequenceNote>
            Disabled until the spend store exists — an entry made now would have nowhere
            to go. Without spend, CAC and every cost-per number on the Report, Outreach,
            and Events pages stay em-dashes.
          </ConsequenceNote>
        </Panel>

        {/* ── UTM builder — live, needs no data source ── */}
        <UtmBuilder />
      </div>

      {/* ── sync / webhook health ── */}
      <Panel title="Sync & webhook health" right={<Meta>the Hub&apos;s four inputs</Meta>}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Surface</th>
                <th style={th}>Carries</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: "right" }}>Last event</th>
              </tr>
            </thead>
            <tbody>
              {SYNC_SURFACES.map((s) => (
                <tr key={s.key}>
                  <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>{s.label}</td>
                  <td style={{ ...td, color: "var(--color-text-muted)" }}>
                    {s.carries}
                    {s.note && (
                      <div style={{ fontSize: "var(--text-label)", color: "var(--color-text-subtle)", marginTop: 3 }}>
                        {s.note}
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    <StatusChip status={s.status} />
                  </td>
                  <td style={{ ...tdDash, textAlign: "right" }}>
                    {s.key === "app_sync" ? `snapshot ${SNAPSHOT_AS_OF}` : DASH}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ConsequenceNote>
          A silent Instantly webhook has no symptom beyond this table — positive replies
          simply stop graduating contacts out of cold.
        </ConsequenceNote>
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}

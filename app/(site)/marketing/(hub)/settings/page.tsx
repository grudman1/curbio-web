import type { Metadata } from "next";
import { Meta, Panel } from "@/app/(site)/admin/(dashboard)/ui";
import { HUB_SURFACE_BY_SLUG, SYNC_SURFACES } from "@/config/marketingHub";
import { SNAPSHOT_AS_OF } from "@/config/appLeadsSnapshot";
import { ownerSession } from "@/lib/adminGuards";
import { readOpsSpend, type SpendEntry } from "@/lib/opsSpend";
import { ConsequenceNote, DASH, HubPageHeader, NeedsBlock, StatusChip, td, tdDash, th } from "../hubUi";
import { SpendEntryPanel } from "./SpendEntry";
import { UtmBuilder } from "./UtmBuilder";

export const metadata: Metadata = {
  title: "Settings · Marketing — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.settings;



export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [spendResult, session] = await Promise.all([readOpsSpend(), ownerSession()]);
  const isOwner = !!session;
  const allSpend: SpendEntry[] = spendResult.configured ? spendResult.records : [];
  const spend = allSpend
    .filter((e) => !e.archived)
    .sort((a, b) => b.month.localeCompare(a.month) || b.createdAt.localeCompare(a.createdAt));
  const spendArchived = allSpend.filter((e) => e.archived);

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
        {/* ── spend entry — live; the store it waited on now exists ── */}
        <Panel title="Spend entry" right={<Meta>month × market × channel</Meta>}>
          <SpendEntryPanel
            entries={spend}
            archived={spendArchived}
            isOwner={isOwner && spendResult.configured}
            configured={spendResult.configured}
          />
          <ConsequenceNote>
            Spend is typed in from invoices, so it is logged, not measured — and every
            cost-per number derived from it inherits that. Without it, CAC and the
            cost-per numbers on the Report, Outreach and Events pages stay em-dashes.
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

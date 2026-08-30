import type { Metadata } from "next";
import { Table, Thead, Th, Tr, Td } from "@/app/(site)/admin/_ui/v2/DataTable";
import { OpsCard } from "@/app/(site)/admin/_ui/v2/OpsCard";
import { HUB_SURFACE_BY_SLUG, SYNC_SURFACES } from "@/config/marketingHub";
import { SNAPSHOT_AS_OF } from "@/config/appLeadsSnapshot";
import { ownerSession } from "@/lib/adminGuards";
import { readOpsSpend, type SpendEntry } from "@/lib/opsSpend";
import { SurfaceHeader, SurfaceHealth } from "@/app/(site)/admin/_ui/v2/SurfaceHeader";
import { StatusBadge } from "@/app/(site)/admin/_ui/v2/HealthDot";

/** Em-dash for a value that does not exist. */
const DASH = "\u2014";
import { SpendEntryPanel } from "./SpendEntry";
import { UtmBuilder } from "./UtmBuilder";

export const metadata: Metadata = {
  title: "Settings · Ops — Curbio",
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
      <SurfaceHeader surface={surface} />

      <div className="mb-ops-gap grid grid-cols-1 gap-ops-gap xl:grid-cols-2">
        {/* ── spend — the store CAC and every cost-per number waits on ── */}
        <OpsCard
          title="Spend"
          titleTooltip="Month × market × channel, typed in from invoices — logged, not measured. Feeds CAC and every cost-per number."
        >
          <SpendEntryPanel
            entries={spend}
            archived={spendArchived}
            isOwner={isOwner && spendResult.configured}
            configured={spendResult.configured}
          />
        </OpsCard>

        {/* ── UTM builder — live, needs no data source ── */}
        <UtmBuilder />
      </div>

      {/* ── sync / webhook health ── */}
      <OpsCard
        title="Sync & webhook health"
        titleTooltip="The Hub's four inputs. A silent Instantly webhook has no symptom beyond this table — positive replies stop graduating contacts out of cold."
      >
        <Table>
          <thead>
            <tr>
              <Th>Surface</Th>
              <Th>Carries</Th>
              <Th>Status</Th>
              <Th align="right">Last event</Th>
            </tr>
          </thead>
          <tbody>
            {SYNC_SURFACES.map((s) => (
              <Tr key={s.key}>
                <Td className="whitespace-nowrap font-semibold">{s.label}</Td>
                <Td className="text-content-muted">
                  {s.carries}
                  {s.note && (
                    <div className="mt-0.5 ops-subtle truncate" title={s.note}>{s.note}</div>
                  )}
                </Td>
                <Td>
                  <StatusBadge status={s.status} tone={s.status === "live" ? "success" : s.status === "partial" ? "warning" : "neutral"} />
                </Td>
                <Td align="right" muted>
                  {s.key === "app_sync" ? `snapshot ${SNAPSHOT_AS_OF}` : DASH}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </OpsCard>

      <SurfaceHealth surface={surface} />
    </>
  );
}

import type { Metadata } from "next";
import { Table, Td, Th, Tr } from "@/app/(site)/admin/_ui/DataTable";
import { InfoPopover } from "@/app/(site)/admin/_ui/InfoPopover";
import { Meta, Panel } from "@/app/(site)/admin/_ui/primitives";
import { HUB_SURFACE_BY_SLUG, SYNC_SURFACES } from "@/config/marketingHub";
import { SNAPSHOT_AS_OF } from "@/config/appLeadsSnapshot";
import { ownerSession } from "@/lib/adminGuards";
import { readOpsSpend, type SpendEntry } from "@/lib/opsSpend";
import { DASH, HubPageHeader, NeedsBlock, StatusChip } from "../hubUi";
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

      <div className="mb-ops-gap grid grid-cols-1 gap-ops-gap xl:grid-cols-2">
        {/* ── spend — the store CAC and every cost-per number waits on ── */}
        <Panel
          flush
          title="Spend"
          right={
            <span className="inline-flex items-center gap-1.5">
              <Meta>month × market × channel</Meta>
              <InfoPopover label="Where spend numbers come from" align="right">
                <p className="m-0">
                  Spend is typed in from invoices, so it is logged, not measured — and every
                  cost-per number derived from it inherits that. Without it, CAC and the cost-per
                  numbers on the Funnel, Outreach and Events screens stay em-dashes.
                </p>
              </InfoPopover>
            </span>
          }
        >
          <SpendEntryPanel
            entries={spend}
            archived={spendArchived}
            isOwner={isOwner && spendResult.configured}
            configured={spendResult.configured}
          />
        </Panel>

        {/* ── UTM builder — live, needs no data source ── */}
        <UtmBuilder />
      </div>

      {/* ── sync / webhook health ── */}
      <Panel
        flush
        title="Sync & webhook health"
        right={
          <span className="inline-flex items-center gap-1.5">
            <Meta>the Hub&apos;s four inputs</Meta>
            <InfoPopover label="Why this table matters" align="right">
              <p className="m-0">
                A silent Instantly webhook has no symptom beyond this table — positive replies
                simply stop graduating contacts out of cold.
              </p>
            </InfoPopover>
          </span>
        }
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
                    <div className="mt-0.5 font-sans text-ops-label text-content-subtle">{s.note}</div>
                  )}
                </Td>
                <Td>
                  <StatusChip status={s.status} />
                </Td>
                <Td align="right" muted>
                  {s.key === "app_sync" ? `snapshot ${SNAPSHOT_AS_OF}` : DASH}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}

import type { Metadata } from "next";
import { Meta, Panel } from "@/app/(site)/admin/(dashboard)/ui";
import { ownerSession } from "@/lib/adminGuards";
import { readOpsPartners, type Partner } from "@/lib/opsPartners";
import { HUB_SURFACE_BY_SLUG, PARTNER_SEED } from "@/config/marketingHub";
import { HubPageHeader, NeedsBlock } from "../hubUi";
import { CallPlanTable, type PlanRow } from "./CallPlanTable";

export const metadata: Metadata = {
  title: "Partners · Marketing — Curbio",
  robots: { index: false, follow: false },
};

// The store is read per-request (the plan is an operational surface, not a
// cached report), and the owner check is display-level here — every
// mutation re-checks in its action.
export const dynamic = "force-dynamic";

const surface = HUB_SURFACE_BY_SLUG.partners;

/** Sorted by next step date — dated records first (soonest at the top, the
 *  Meta line's promise), then undated records, then unsaved seed rows. */
function sortRows(records: Partner[], seeds: PlanRow[]): PlanRow[] {
  const dated = records.filter((p) => p.nextStepDate).sort((a, b) => a.nextStepDate.localeCompare(b.nextStepDate));
  const undated = records.filter((p) => !p.nextStepDate).sort((a, b) => a.name.localeCompare(b.name));
  return [...dated.map((p) => ({ kind: "record" as const, partner: p })), ...undated.map((p) => ({ kind: "record" as const, partner: p })), ...seeds];
}

export default async function PartnersPage() {
  const [result, session] = await Promise.all([readOpsPartners(), ownerSession()]);
  const isOwner = !!session;

  const partners: Partner[] = result.configured ? result.records : [];
  const active = partners.filter((p) => !p.archived);
  const archived = partners.filter((p) => p.archived);

  // Seed rows the store hasn't absorbed yet — matched by name, the seed's
  // only identity. The first save turns a seed row into a record.
  const known = new Set(partners.map((p) => p.name.toLowerCase()));
  const seeds: PlanRow[] = PARTNER_SEED.filter((s) => !known.has(s.name.toLowerCase())).map((s) => ({
    kind: "seed",
    name: s.name,
    stage: s.stage,
  }));

  return (
    <>
      <HubPageHeader surface={surface} />

      <Panel title="Call plan" right={<Meta>sorted by next step date</Meta>}>
        {!result.configured && (
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: "var(--color-text-subtle)", margin: "0 0 12px" }}>
            Ops store not configured — showing the seed plan, read-only.
          </p>
        )}
        {result.configured && result.error && (
          <p style={{ fontFamily: "var(--font-family-sans)", fontSize: "var(--text-small)", color: "var(--color-state-error)", margin: "0 0 12px" }} role="alert">
            Store read failed: {result.error}
          </p>
        )}
        <CallPlanTable rows={sortRows(active, seeds)} archived={archived} isOwner={isOwner && result.configured} />
      </Panel>

      <NeedsBlock surface={surface} />
    </>
  );
}

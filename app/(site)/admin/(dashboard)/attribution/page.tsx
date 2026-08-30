import type { Metadata } from "next";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { computeUndocumentedCampaigns } from "@/lib/campaignOrphans";
import { SCAN } from "@/app/(site)/admin/(dashboard)/ui";
import {
  monthsFor,
  parseTimeframe,
  timeframeLabel,
} from "@/app/(site)/admin/_ui/timeframe";
import { SurfaceHeader, SurfaceHealth } from "@/app/(site)/admin/_ui/v2/SurfaceHeader";
import { CampaignTagsCard } from "@/app/(site)/admin/_ui/v2/CampaignTagsCard";
import { AttributionHealthPanel } from "./AttributionHealth";

// ─────────────────────────────────────────────────────────────────────────────
// Attribution health — the page behind the honest panel. Same number, plus the
// raw referral sources the app recorded for the unattributed leads: the working
// to-do list for shrinking the share.
//
// This screen used to live in marketing/(hub)/ and be re-exported into /admin.
// The dashboard now owns it and /marketing re-exports the other way, so the
// screens /admin is responsible for sit inside /admin.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Attribution · Ops — Curbio",
  robots: { index: false, follow: false },
};

const surface = HUB_SURFACE_BY_SLUG.attribution;

export default async function AttributionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tf = parseTimeframe(sp.t, SNAPSHOT_MONTHS);
  const months = monthsFor(tf, SNAPSHOT_MONTHS);
  const tfLabel = timeframeLabel(tf, SNAPSHOT_MONTHS);
  // Provenance filter: measured (real UTM signal) / inferred (spec-§8
  // backfill) / all. Anything unrecognised falls to "all".
  const f = sp.f === "measured" || sp.f === "inferred" ? sp.f : "all";
  const tParam = typeof sp.t === "string" ? sp.t : undefined;
  const { orphans, autoDocumented, testTags } = await computeUndocumentedCampaigns(SCAN);

  return (
    <>
      <SurfaceHeader surface={surface} />
      <CampaignTagsCard
        orphans={orphans}
        autoDocumented={autoDocumented}
        testTags={testTags}
        leadWindow={SCAN}
      />
      <AttributionHealthPanel
        months={months}
        tfLabel={tfLabel}
        detailed
        filter={f}
        tParam={tParam}
      />
      <SurfaceHealth surface={surface} />
    </>
  );
}

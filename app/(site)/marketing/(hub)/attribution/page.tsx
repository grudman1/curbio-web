import type { Metadata } from "next";
import { HUB_SURFACE_BY_SLUG } from "@/config/marketingHub";
import { SNAPSHOT_MONTHS } from "@/config/appLeadsSnapshot";
import { computeUndocumentedCampaigns } from "@/lib/campaignOrphans";
import { SCAN } from "@/app/(site)/admin/(dashboard)/ui";
import { monthsFor, parseTimeframe, timeframeLabel } from "../timeframe";
import { AttributionHealthPanel } from "../AttributionHealth";
import { HubPageHeader, NeedsBlock, UndocumentedCampaignsBanner } from "../hubUi";

// ─────────────────────────────────────────────────────────────────────────────
// Attribution health — the page behind the honest panel. Same number, plus
// the raw referral sources the app recorded for the unattributed leads: the
// working to-do list for shrinking the share.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Attribution health · Marketing — Curbio",
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
  const { orphans } = await computeUndocumentedCampaigns(SCAN);

  return (
    <>
      <HubPageHeader surface={surface} />
      <UndocumentedCampaignsBanner orphans={orphans} leadWindow={SCAN} />
      <AttributionHealthPanel months={months} tfLabel={tfLabel} detailed filter={f} tParam={tParam} />
      <NeedsBlock surface={surface} />
    </>
  );
}
